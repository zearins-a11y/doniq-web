/**
 * Login por código de 6 dígitos (a opção B do teste de segurança de 12/08).
 *
 * Por que existe: o login passwordless devolve um token só com o e-mail, sem
 * provar que o e-mail é da pessoa. O código fecha isso — quem entra precisa ter
 * lido a caixa de entrada do endereço.
 *
 * Desenho:
 *   - O código é guardado com hash (HMAC, mesmo segredo da sessão), nunca em
 *     claro. Quem lê o banco não vê o número.
 *   - Vale 10 minutos e morre no primeiro uso. Código reutilizado não entra.
 *   - O e-mail só sai se o provedor estiver ligado (RESEND_API_KEY). Se estiver
 *     desligado, `pedir` devolve `email_enviado: false` e a tela mostra o
 *     caminho alternativo — nunca finge que mandou.
 *
 * Reaproveita a tabela `verification` que o Better Auth já cria, então não há
 * schema novo nem migração. O `identifier` usa um namespace próprio com o
 * e-mail; o `value` guarda "hashDoCodigo:tentativas".
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { segredo } from "../auth-dispositivo";
import { db } from "../database";
import * as schema from "../database/schema";
import { enviarEmail, provedorConfigurado } from "./email";
import { limitarCodigoPorEmail } from "./limite-codigo";

const VALIDADE_MINUTOS = 10;
const MAX_TENTATIVAS = 5;
type Banco = typeof db;

function identificadorCodigo(email: string): string {
  return `doniq-login-code:${email}`;
}

function hashCodigo(codigo: string): string {
  return createHmac("sha256", segredo()).update(`codigo:${codigo}`).digest("hex");
}

function hashesIguais(guardado: string, calculado: string): boolean {
  const a = Buffer.from(guardado, "hex");
  const b = Buffer.from(calculado, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function id(): string {
  return `ver_${randomInt(0, 0xffffffff).toString(16).padStart(8, "0")}${Date.now().toString(36)}`;
}

/** Gera, guarda e tenta enviar o código. Nunca lança por causa do e-mail. */
export async function gerarEEnviar(email: string, nome: string): Promise<{ email_enviado: boolean; motivo: string }> {
  const e = email.trim().toLowerCase();
  const identificador = identificadorCodigo(e);

  if (!provedorConfigurado()) {
    return { email_enviado: false, motivo: "Nenhum provedor de e-mail configurado neste ambiente." };
  }

  const limite = await limitarCodigoPorEmail(e);
  if (limite.limitado) {
    return {
      email_enviado: false,
      motivo: "Muitos códigos solicitados para este e-mail. Aguarde uma hora e tente novamente.",
    };
  }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expira = new Date(Date.now() + VALIDADE_MINUTOS * 60_000);
  const verificacaoId = id();

  // Um código por e-mail por vez, sem tocar nas verificações internas do Better Auth.
  await db.transaction(async (tx) => {
    await tx.delete(schema.verification).where(eq(schema.verification.identifier, identificador));
    await tx.insert(schema.verification).values({
      id: verificacaoId,
      identifier: identificador,
      value: `${hashCodigo(codigo)}:0`,
      expiresAt: expira,
    });
  });

  const saudacao = nome.trim() ? `Olá, ${nome.trim()}.` : "Olá.";
  const r = await enviarEmail({
    para: e,
    assunto: "Seu código de acesso ao doniq",
    chaveIdempotencia: `codigo-login/${verificacaoId}`,
    texto: [
      saudacao,
      "",
      `Seu código para entrar no doniq é:`,
      "",
      `    ${codigo}`,
      "",
      `Ele vale por ${VALIDADE_MINUTOS} minutos. Se você não pediu, ignore este e-mail.`,
      "",
      "— doniq · Falou, tá feito.",
    ].join("\n"),
  });
  return { email_enviado: r.enviado, motivo: r.motivo };
}

/**
 * Confere o código. Devolve true só se bater, não tiver expirado e não tiver
 * estourado as tentativas. No acerto, apaga para não ser reusado.
 */
export async function conferir(
  email: string,
  codigo: string,
  banco: Banco = db,
  agora = Date.now(),
): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const identificador = identificadorCodigo(e);
  const c = (codigo || "").replace(/\D/g, "");
  if (c.length !== 6) return false;

  for (let disputa = 0; disputa <= MAX_TENTATIVAS; disputa++) {
    const [linha] = await banco
      .select()
      .from(schema.verification)
      .where(eq(schema.verification.identifier, identificador))
      .limit(1);
    if (!linha) return false;

    const identidadeAtual = and(
      eq(schema.verification.id, linha.id),
      eq(schema.verification.identifier, identificador),
      eq(schema.verification.value, linha.value),
    );

    if (linha.expiresAt.getTime() < agora) {
      await banco.delete(schema.verification).where(identidadeAtual);
      return false;
    }

    const [hashGuardado, tentStr] = (linha.value || "").split(":");
    const tentativas = Number(tentStr ?? "0") || 0;
    if (tentativas >= MAX_TENTATIVAS) return false;

    if (hashesIguais(hashGuardado ?? "", hashCodigo(c))) {
      const removida = await banco
        .delete(schema.verification)
        .where(identidadeAtual)
        .returning({ id: schema.verification.id });
      if (removida.length === 1) return true;
      continue;
    }

    // Compare-and-swap: sob concorrência, cada erro incrementa uma única vez.
    const atualizada = await banco
      .update(schema.verification)
      .set({ value: `${hashGuardado}:${tentativas + 1}` })
      .where(identidadeAtual)
      .returning({ id: schema.verification.id });
    if (atualizada.length === 1) return false;
  }

  return false;
}
