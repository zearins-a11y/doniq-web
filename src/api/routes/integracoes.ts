/** Rotas das integrações de CRM: configurar, testar e enviar relatos. */

import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ADAPTADORES, ErroCrm, NOMES_PROVEDOR, PROVEDORES } from "../crm";
import { cifrar, decifrar, mascarar } from "../crm/cripto";
import { paraApiSincronizacao, sincronizarRelato } from "../crm/sincronizar";
import type { Provedor } from "../crm/tipos";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { isoUtc } from "../relato/tempo";

type IntegracaoRow = typeof schema.integracoes.$inferSelect;

const provedorSchema = z.enum(PROVEDORES);

/** Nunca devolve o token — só a máscara. */
function paraApi(i: IntegracaoRow) {
  let mascara = "••••";
  try {
    const cred = JSON.parse(decifrar(i.credenciais)) as { token?: string };
    mascara = mascarar(cred.token ?? "");
  } catch {
    mascara = "credencial ilegível";
  }
  return {
    provedor: i.provedor,
    nome: NOMES_PROVEDOR[i.provedor as Provedor] ?? i.provedor,
    token_mascarado: mascara,
    mapa_campos: i.mapaCampos ?? {},
    funil_id: i.funilId,
    etapa_id: i.etapaId,
    ativa: i.ativa,
    ultimo_teste_em: i.ultimoTesteEm,
    ultimo_teste_ok: i.ultimoTesteOk,
    ultimo_teste_erro: i.ultimoTesteErro,
    atualizado_em: i.atualizadoEm,
  };
}

async function obter(userId: string, provedor: Provedor): Promise<IntegracaoRow> {
  const [linha] = await db
    .select()
    .from(schema.integracoes)
    .where(and(eq(schema.integracoes.userId, userId), eq(schema.integracoes.provedor, provedor)));
  if (!linha) throw new ORPCError("NOT_FOUND", { message: "Integração não configurada." });
  return linha;
}

async function credenciaisDe(linha: IntegracaoRow) {
  try {
    return JSON.parse(decifrar(linha.credenciais)) as { token: string; contaId?: string };
  } catch {
    throw new ORPCError("BAD_REQUEST", { message: "Credencial ilegível. Salve o token de novo." });
  }
}

export const integracoes = {
  /** Catálogo dos conectores disponíveis — alimenta a tela de configuração. */
  provedores: autenticado.handler(async () =>
    PROVEDORES.map((p) => ({
      provedor: p,
      nome: ADAPTADORES[p].nome,
      rotulo_token: ADAPTADORES[p].rotuloToken,
      ajuda: ADAPTADORES[p].ajuda,
    })),
  ),

  listar: autenticado.handler(async ({ context }) => {
    const linhas = await db
      .select()
      .from(schema.integracoes)
      .where(eq(schema.integracoes.userId, context.usuario.userId));
    return linhas.map(paraApi);
  }),

  /** Salva (ou atualiza) a integração. Testa a credencial antes de guardar. */
  salvar: autenticado
    .input(
      z.object({
        provedor: provedorSchema,
        token: z.string().min(8).max(500).nullish(),
        conta_id: z.string().max(64).nullish(),
        funil_id: z.string().max(64).nullish(),
        etapa_id: z.string().max(64).nullish(),
        mapa_campos: z.record(z.string(), z.string()).nullish(),
        ativa: z.boolean().nullish(),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const provedor = input.provedor;
      const agora = isoUtc();

      const [existente] = await db
        .select()
        .from(schema.integracoes)
        .where(and(eq(schema.integracoes.userId, userId), eq(schema.integracoes.provedor, provedor)));

      const token = input.token?.trim();
      if (!token && !existente) {
        throw new ORPCError("BAD_REQUEST", { message: "Informe o token do CRM." });
      }

      const credenciais = token
        ? { token, ...(input.conta_id ? { contaId: input.conta_id } : {}) }
        : await credenciaisDe(existente!);
      if (input.conta_id !== undefined && input.conta_id !== null) {
        credenciais.contaId = input.conta_id || undefined;
      }

      // credencial errada não entra no banco
      let testeOk = true;
      let testeErro = "";
      try {
        await ADAPTADORES[provedor].testar(credenciais);
      } catch (e) {
        testeOk = false;
        testeErro = e instanceof ErroCrm ? e.message : "Não deu pra falar com o CRM agora.";
        if (token || !existente) throw new ORPCError("BAD_REQUEST", { message: testeErro });
      }

      const valores = {
        credenciais: cifrar(JSON.stringify(credenciais)),
        mapaCampos: input.mapa_campos ?? existente?.mapaCampos ?? {},
        funilId: input.funil_id ?? existente?.funilId ?? "",
        etapaId: input.etapa_id ?? existente?.etapaId ?? "",
        ativa: input.ativa ?? existente?.ativa ?? true,
        ultimoTesteEm: agora,
        ultimoTesteOk: testeOk,
        ultimoTesteErro: testeErro,
        atualizadoEm: agora,
      };

      if (existente) {
        await db
          .update(schema.integracoes)
          .set(valores)
          .where(eq(schema.integracoes.integracaoId, existente.integracaoId));
      } else {
        await db.insert(schema.integracoes).values({
          integracaoId: `itg_${randomBytes(6).toString("hex")}`,
          userId,
          provedor,
          criadoEm: agora,
          ...valores,
        });
      }
      return paraApi(await obter(userId, provedor));
    }),

  testar: autenticado
    .input(z.object({ provedor: provedorSchema }))
    .handler(async ({ input, context }) => {
      const linha = await obter(context.usuario.userId, input.provedor);
      const credenciais = await credenciaisDe(linha);
      const agora = isoUtc();
      try {
        await ADAPTADORES[input.provedor].testar(credenciais);
        await db
          .update(schema.integracoes)
          .set({ ultimoTesteEm: agora, ultimoTesteOk: true, ultimoTesteErro: "", atualizadoEm: agora })
          .where(eq(schema.integracoes.integracaoId, linha.integracaoId));
        return { ok: true, erro: "" };
      } catch (e) {
        const erro = e instanceof ErroCrm ? e.message : "Não deu pra falar com o CRM agora.";
        await db
          .update(schema.integracoes)
          .set({ ultimoTesteEm: agora, ultimoTesteOk: false, ultimoTesteErro: erro, atualizadoEm: agora })
          .where(eq(schema.integracoes.integracaoId, linha.integracaoId));
        return { ok: false, erro };
      }
    }),

  remover: autenticado
    .input(z.object({ provedor: provedorSchema }))
    .handler(async ({ input, context }) => {
      await obter(context.usuario.userId, input.provedor);
      await db
        .delete(schema.integracoes)
        .where(
          and(
            eq(schema.integracoes.userId, context.usuario.userId),
            eq(schema.integracoes.provedor, input.provedor),
          ),
        );
      return { ok: true };
    }),

  /** Envia um relato revisado. Sem provedor, vai para todas as integrações ativas. */
  sincronizar: autenticado
    .input(z.object({ relato_id: z.string(), provedor: provedorSchema.nullish() }))
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const [relato] = await db
        .select()
        .from(schema.relatos)
        .where(and(eq(schema.relatos.relatoId, input.relato_id), eq(schema.relatos.userId, userId)));
      if (!relato) throw new ORPCError("NOT_FOUND", { message: "Relato não encontrado." });
      if (!relato.revisado) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Confira a ficha e marque como revisada antes de mandar pro CRM.",
        });
      }

      const filtro = input.provedor
        ? and(
            eq(schema.integracoes.userId, userId),
            eq(schema.integracoes.provedor, input.provedor),
            eq(schema.integracoes.ativa, true),
          )
        : and(eq(schema.integracoes.userId, userId), eq(schema.integracoes.ativa, true));
      const alvos = await db.select().from(schema.integracoes).where(filtro);
      if (!alvos.length) {
        throw new ORPCError("BAD_REQUEST", { message: "Nenhum CRM conectado. Configure em Integrações." });
      }

      const resultados = [];
      for (const integracao of alvos) {
        resultados.push(await sincronizarRelato(relato, integracao));
      }
      return { resultados };
    }),

  /** Status de sincronização de um relato — a ficha usa isso. */
  statusRelato: autenticado
    .input(z.object({ relato_id: z.string() }))
    .handler(async ({ input, context }) => {
      const linhas = await db
        .select()
        .from(schema.sincronizacoes)
        .where(
          and(
            eq(schema.sincronizacoes.relatoId, input.relato_id),
            eq(schema.sincronizacoes.userId, context.usuario.userId),
          ),
        );
      return linhas.map(paraApiSincronizacao);
    }),

  /** Últimos envios da conta — usado na tela de integrações. */
  historico: autenticado.handler(async ({ context }) => {
    const linhas = await db
      .select()
      .from(schema.sincronizacoes)
      .where(eq(schema.sincronizacoes.userId, context.usuario.userId))
      .orderBy(desc(schema.sincronizacoes.atualizadoEm))
      .limit(50);
    return linhas.map((s) => ({ ...paraApiSincronizacao(s), relato_id: s.relatoId }));
  }),
};
