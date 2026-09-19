/**
 * Autenticação por token de dispositivo.
 *
 * Escopo honesto: serve para piloto e uso interno. O token é opaco, aleatório e
 * guardado com hash — mas não há senha, MFA nem recuperação de conta. O login
 * com Google (Better Auth, em ./auth.ts) é a alternativa desta versão.
 */

import { createHmac, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "./database";
import * as schema from "./database/schema";
import { isoUtc } from "./relato/tempo";
import { VERTICAL_PADRAO } from "./relato/verticais";

export const VALIDADE_DIAS = 180;
const VERSAO_TOKEN_SESSAO = "v2";

/**
 * Chave dedicada para HMAC de tokens de sessão.
 *
 * Exige TOKEN_SECRET explícito — não aceita fallback para BETTER_AUTH_SECRET.
 * Chaves distintas por função é prática básica: a mesma chave protegendo sessões
 * e dados de CRM (ou segredo do Better Auth) multiplica o impacto de um vazamento.
 *
 * Lança na startup se a variável estiver ausente: é melhor o servidor não subir
 * do que subir com HMAC trivialmente reproduzível (chave vazia).
 *
 * Reaproveitada por codigo.ts e equipe.ts: mesma chave de sessão, mesma regra
 * de "sem fallback" — não duplicar essa lógica com uma cópia desatualizada.
 */
export function segredo(): string {
  const s = process.env.TOKEN_SECRET ?? "";
  if (!s.trim()) {
    throw new Error(
      "TOKEN_SECRET não configurado. " +
        "Defina um segredo aleatório de pelo menos 32 caracteres no .env.",
    );
  }
  return s;
}

function hash(token: string): string {
  return createHmac("sha256", segredo()).update(`${VERSAO_TOKEN_SESSAO}:${token}`).digest("hex");
}

export function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function criarSessao(userId: string): Promise<string> {
  const token = novoToken();
  const agora = new Date();
  const expira = new Date(agora.getTime() + VALIDADE_DIAS * 86400_000);
  await db.insert(schema.sessions).values({
    token: hash(token),
    userId,
    createdAt: isoUtc(agora),
    expiresAt: isoUtc(expira),
  });
  return token;
}

export async function apagarSessoes(userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export interface Usuario {
  user_id: string;
  email: string;
  nome: string;
  produto: string;
  vertical: string;
  criado_em: string;
}

export function paraUsuario(row: typeof schema.users.$inferSelect): Usuario {
  return {
    user_id: row.userId,
    email: row.email,
    nome: row.nome,
    produto: row.produto,
    vertical: row.vertical,
    criado_em: row.criadoEm,
  };
}

/** Token do header -> usuário, ou null. Sessão vencida é apagada na hora (era TTL no Mongo). */
export async function usuarioPorToken(token: string): Promise<typeof schema.users.$inferSelect | null> {
  const t = (token || "").trim();
  if (!t) return null;

  const agora = isoUtc();
  // limpeza oportunista: substitui o índice TTL do Mongo
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, agora));

  const [sessao] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, hash(t)));
  if (!sessao) return null;
  if (sessao.expiresAt < agora) return null;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.userId, sessao.userId));
  return user ?? null;
}

/** Extrai o token do header Authorization: Bearer. */
export function tokenDoHeader(headers: Headers): string {
  const h = headers.get("authorization") ?? "";
  if (!h.toLowerCase().startsWith("bearer ")) return "";
  return h.slice(7).trim();
}

/** Usuário do app a partir de um e-mail (usado pelo login com Google). */
export async function acharOuCriarPorEmail(email: string, nome: string): Promise<typeof schema.users.$inferSelect> {
  const e = email.trim().toLowerCase();

  // INSERT OR IGNORE + SELECT evita a race condition de dois logins simultâneos
  // com o mesmo e-mail criarem dois registros distintos na tabela `users`.
  // O onConflictDoNothing descarta silenciosamente o segundo INSERT, e o SELECT
  // a seguir sempre retorna o registro canônico (o que entrou primeiro).
  const novo = {
    userId: `usr_${randomBytes(6).toString("hex")}`,
    email: e,
    nome: nome.trim(),
    produto: "",
    vertical: VERTICAL_PADRAO,
    criadoEm: isoUtc(),
  };

  await db.insert(schema.users).values(novo).onConflictDoNothing();

  const [usuario] = await db.select().from(schema.users).where(eq(schema.users.email, e));
  if (!usuario) throw new Error(`Não foi possível criar ou localizar a conta para ${e}.`);

  // Atualiza o nome se o registro existente ainda não tiver um.
  if (nome.trim() && !usuario.nome) {
    await db
      .update(schema.users)
      .set({ nome: nome.trim() })
      .where(eq(schema.users.userId, usuario.userId));
    return { ...usuario, nome: nome.trim() };
  }

  return usuario;
}
