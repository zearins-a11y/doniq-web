/** Login por código de e-mail e perfil. */

import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { base } from "../core/app";
import { apagarSessoes, criarSessao, paraUsuario } from "../auth-dispositivo";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { TIPO_PADRAO, listarTiposVisita, montarRoteiro, perguntasDoRoteiro } from "../relato/checklist";
import { conferir, gerarEEnviar } from "../services/codigo";
import { isoUtc } from "../relato/tempo";
import { VERTICAL_PADRAO, listarVerticais, verticalValida } from "../relato/verticais";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const contas = {
  /** GET /contas/eu */
  eu: autenticado.handler(({ context }) => paraUsuario(context.usuario)),

  /** PUT /contas/eu */
  salvarPerfil: autenticado
    .input(
      z.object({
        nome: z.string().max(120).optional(),
        produto: z.string().max(200).optional(),
        vertical: z.string().max(40).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const mudancas: Partial<{ nome: string; produto: string; vertical: string }> = {};
      if (input.nome !== undefined) mudancas.nome = input.nome.trim();
      if (input.produto !== undefined) mudancas.produto = input.produto.trim();
      // ramo desconhecido cai no padrão em vez de gravar lixo
      if (input.vertical !== undefined) mudancas.vertical = verticalValida(input.vertical);

      if (Object.keys(mudancas).length) {
        await db.update(schema.users).set(mudancas).where(eq(schema.users.userId, context.usuario.userId));
      }
      const [atualizado] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.userId, context.usuario.userId));
      return paraUsuario(atualizado ?? { ...context.usuario, ...mudancas });
    }),

  /**
   * GET /contas/verticais — catálogo do seletor e os roteiros de visita.
   * Devolve o roteiro de TODOS os tipos do ramo do vendedor de uma vez: são
   * poucos KB e a tela de captura passa a funcionar sem rede, no corredor do
   * hospital ou na estrada.
   */
  verticais: autenticado
    .input(z.object({ vertical: z.string().max(40).optional() }).default({}))
    .handler(({ input, context }) => {
      const ramo = verticalValida(input?.vertical || context.usuario.vertical);
      const roteiros: Record<string, string[]> = {};
      const catalogo: Record<string, { id: string; pergunta: string; campo?: string; sinais: string[] }[]> = {};
      for (const t of listarTiposVisita()) {
        roteiros[t.id] = perguntasDoRoteiro(ramo, t.id);
        catalogo[t.id] = montarRoteiro(ramo, t.id).map((i) => ({
          id: i.id,
          pergunta: i.pergunta,
          campo: i.campo,
          sinais: i.sinais,
        }));
      }

      const todosRoteiros: Record<string, Record<string, string[]>> = {};
      for (const v of listarVerticais()) {
        todosRoteiros[v.id] = {};
        for (const t of listarTiposVisita()) {
          todosRoteiros[v.id][t.id] = perguntasDoRoteiro(v.id, t.id);
        }
      }

      return {
        lista: listarVerticais(),
        atual: ramo,
        tipos: listarTiposVisita(),
        tipo_padrao: TIPO_PADRAO,
        roteiros,
        catalogo,
        todos_roteiros: todosRoteiros,
      };
    }),

  /** POST /contas/sair */
  sair: autenticado.handler(async ({ context }) => {
    await apagarSessoes(context.usuario.userId);
    return { ok: true };
  }),

  /**
   * POST /contas/pedirCodigo — gera o código de 6 dígitos e tenta mandar por
   * e-mail. Se o provedor estiver desligado, devolve `email_enviado: false` e a
   * tela oferece a entrada direta. (Opção B do teste de segurança de 12/08.)
   */
  pedirCodigo: base
    .input(z.object({ email: z.string().min(3).max(200), nome: z.string().max(120).default("") }))
    .handler(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new ORPCError("BAD_REQUEST", { message: "E-mail inválido." });
      const r = await gerarEEnviar(email, input.nome ?? "");
      return { email_enviado: r.email_enviado, motivo: r.motivo, minutos_validade: 10 };
    }),

  /**
   * POST /contas/entrarComCodigo — confere o código e, se bater, entra. O
   * código morre no uso, então não dá para reaproveitar.
   */
  entrarComCodigo: base
    .input(
      z.object({
        email: z.string().min(3).max(200),
        codigo: z.string().min(6).max(12),
        nome: z.string().max(120).default(""),
      }),
    )
    .handler(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new ORPCError("BAD_REQUEST", { message: "E-mail inválido." });
      const ok = await conferir(email, input.codigo);
      if (!ok) {
        throw new ORPCError("UNAUTHORIZED", { message: "Código inválido ou vencido. Peça outro." });
      }

      let [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      const nome = (input.nome ?? "").replace(/[<>`"&]/g, "").trim().slice(0, 120);
      if (!user) {
        user = {
          userId: `usr_${randomBytes(6).toString("hex")}`,
          email,
          nome,
          produto: "",
          vertical: VERTICAL_PADRAO,
          criadoEm: isoUtc(),
        };
        await db.insert(schema.users).values(user);
      } else if (nome && !user.nome) {
        await db.update(schema.users).set({ nome }).where(eq(schema.users.userId, user.userId));
        user = { ...user, nome };
      }

      const token = await criarSessao(user.userId);
      return { token, usuario: paraUsuario(user) };
    }),
};
