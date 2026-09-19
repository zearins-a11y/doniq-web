/** Rotas de relatos. */

import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { log } from "../middleware/logger";
import { estadoDaConta } from "./cobranca";
import { avaliarRoteiro, montarRoteiro, tipoValido } from "../relato/checklist";
import {
  concluirCriacaoRelato,
  falharCriacaoRelato,
  reservarCriacaoRelato,
} from "../relato/idempotencia";
import { apagarRelatoComHistoricoCrm } from "../relato/exclusao";
import { ErroLLM, estruturar } from "../relato/llm";
import { agoraBr, amanhaBr, hojeBr, isoUtc } from "../relato/tempo";
import {
  camposParaRevisar,
  normalizarData,
  normalizarHora,
  normalizarTelefone,
} from "../relato/validators";
import { analisarObjecao } from "../relato/objecoes";

export const LIMITE_HISTORICO = 200;

type RelatoRow = typeof schema.relatos.$inferSelect;

/** Forma do JSON idêntica à do backend original (snake_case, listas e dicts prontos). */
export function paraApi(r: RelatoRow, vertical?: string) {
  const vert = typeof vertical === "string" ? vertical : "geral";
  return {
    relato_id: r.relatoId,
    user_id: r.userId,
    transcricao: r.transcricao,
    empresa: r.empresa,
    contato: r.contato,
    cargo: r.cargo,
    telefone: r.telefone,
    resumo: r.resumo,
    resumo_narrativo: r.resumoNarrativo,
    email_cliente: r.emailCliente,
    proximas_perguntas: r.proximasPerguntas ?? [],
    objecao: r.objecao,
    analise_objecao: r.objecao?.trim() ? analisarObjecao(r.objecao, vert) : null,
    proxima_acao: r.proximaAcao,
    data_iso: r.dataIso,
    hora: r.hora,
    temperatura: r.temperatura,
    faltou_perguntar: r.faltouPerguntar ?? [],
    followup: r.followup,
    precisa_confirmar: r.precisaConfirmar,
    campo_a_confirmar: r.campoAConfirmar,
    audio_ininteligivel: r.audioIninteligivel,
    tags: r.tags ?? [],
    concorrentes: r.concorrentes ?? [],
    numeros: r.numeros ?? [],
    evidencia: r.evidencia ?? {},
    confianca: r.confianca ?? {},
    revisado: r.revisado,
    campos_a_revisar: r.camposARevisar ?? [],
    tipo_visita: r.tipoVisita,
    roteiro: r.roteiro ?? [],
    prompt_versao: r.promptVersao,
    modelo: r.modelo,
    tokens_input: r.tokensInput,
    tokens_output: r.tokensOutput,
    duracao_ms: r.duracaoMs,
    cache_key: r.cacheKey,
    created_at: r.createdAt,
  };
}

/** Empresas, contatos e concorrentes já vistos — vira glossário da transcrição e do LLM. */
export async function nomesConhecidos(userId: string, limite = 30): Promise<string[]> {
  const linhas = await db
    .select({
      empresa: schema.relatos.empresa,
      contato: schema.relatos.contato,
      concorrentes: schema.relatos.concorrentes,
    })
    .from(schema.relatos)
    .where(eq(schema.relatos.userId, userId))
    .orderBy(desc(schema.relatos.createdAt))
    .limit(60);

  const nomes: string[] = [];
  for (const d of linhas) {
    for (const v of [d.empresa, d.contato, ...(d.concorrentes ?? [])]) {
      if (v && !nomes.includes(v)) nomes.push(v);
    }
    if (nomes.length >= limite) break;
  }
  return nomes.slice(0, limite);
}

async function obterDoBanco(relatoId: string, userId: string): Promise<RelatoRow> {
  const [doc] = await db
    .select()
    .from(schema.relatos)
    .where(and(eq(schema.relatos.relatoId, relatoId), eq(schema.relatos.userId, userId)));
  if (!doc) throw new ORPCError("NOT_FOUND", { message: "Relato não encontrado." });
  return doc;
}

export const relatos = {
  /** POST /relatos */
  criar: autenticado
    .input(
      z.object({
        transcricao: z.string().min(1).max(20000),
        client_id: z.string().max(64).nullish(),
        // tipo desconhecido não é erro de usuário: cai no padrão, nunca derruba o envio
        tipo_visita: z.string().max(40).nullish(),
      }),
    )
    .handler(async ({ input, context }) => {
      const transcricao = input.transcricao.trim();
      if (!transcricao) throw new ORPCError("BAD_REQUEST", { message: "A transcrição chegou vazia." });
      const usuario = context.usuario;

      // idempotência: reenvio do mesmo relato não duplica
      if (input.client_id) {
        const [existente] = await db
          .select()
          .from(schema.relatos)
          .where(and(eq(schema.relatos.userId, usuario.userId), eq(schema.relatos.clientId, input.client_id)));
        if (existente) return paraApi(existente);
      }

      const inicio = isoUtc();
      const reserva = input.client_id
        ? await reservarCriacaoRelato({
            userId: usuario.userId,
            clientId: input.client_id,
            agora: inicio,
          })
        : null;
      if (reserva?.estado === "concluida") {
        return paraApi(await obterDoBanco(reserva.relatoId, usuario.userId));
      }
      if (reserva?.estado === "em_andamento") {
        throw new ORPCError("CONFLICT", {
          message: "Este relato já está sendo processado. Tente novamente em instantes.",
        });
      }

      try {
        /**
         * Trava de cobrança — só aqui, e só depois da idempotência.
         *
         * Depois da idempotência de propósito: reenvio de um relato que já entrou
         * devolve o que já existe, mesmo com a assinatura vencida.
         */
        const cobranca = await estadoDaConta(usuario);
        if (!cobranca.pode_criar_ficha) {
          throw new ORPCError("PAYMENT_REQUIRED", { status: 402, message: cobranca.aviso });
        }

        const tipo = tipoValido(input.tipo_visita);
        const nomes = await nomesConhecidos(usuario.userId);
        const dados = await estruturar(
          transcricao,
          usuario.nome,
          usuario.produto,
          agoraBr(),
          nomes,
          usuario.vertical,
          tipo,
          usuario.userId,
        );

        const doc = {
          relatoId:
            reserva?.estado === "adquirida"
              ? reserva.relatoId
              : `rel_${randomBytes(6).toString("hex")}`,
          userId: usuario.userId,
          clientId: input.client_id ?? null,
          transcricao,
          empresa: dados.empresa,
          contato: dados.contato,
          cargo: dados.cargo,
          telefone: dados.telefone,
          resumo: dados.resumo,
          resumoNarrativo: dados.resumo_narrativo,
          emailCliente: dados.email_cliente,
          proximasPerguntas: dados.proximas_perguntas,
          objecao: dados.objecao,
          proximaAcao: dados.proxima_acao,
          dataIso: dados.data_iso,
          hora: dados.hora,
          temperatura: dados.temperatura,
          faltouPerguntar: dados.faltou_perguntar,
          followup: dados.followup,
          precisaConfirmar: dados.precisa_confirmar,
          campoAConfirmar: dados.campo_a_confirmar,
          audioIninteligivel: dados.audio_ininteligivel,
          tags: dados.tags,
          concorrentes: dados.concorrentes,
          numeros: dados.numeros,
          evidencia: dados.evidencia,
          confianca: dados.confianca,
          revisado: dados.revisado,
          camposARevisar: camposParaRevisar(dados),
          tipoVisita: tipo,
          // avalia contra a ficha JÁ normalizada pelo portão: campo reprovado por
          // falta de evidência não pode contar como item coberto
          roteiro: avaliarRoteiro(montarRoteiro(usuario.vertical, tipo), { transcricao, ficha: dados }),
          promptVersao: dados.prompt_versao ?? "",
          modelo: dados.modelo ?? "",
          tokensInput: dados.tokens_input ?? 0,
          tokensOutput: dados.tokens_output ?? 0,
          duracaoMs: dados.duracao_ms ?? 0,
          cacheKey: dados.cache_key ?? "",
          createdAt: isoUtc(),
        } satisfies RelatoRow;

        await concluirCriacaoRelato({
          relato: doc,
          claim:
            reserva?.estado === "adquirida" && input.client_id
              ? { clientId: input.client_id, claimToken: reserva.claimToken }
              : undefined,
          agora: isoUtc(),
        });

        log({ userId: usuario.userId, acao: "criar", relato_id: doc.relatoId, status: 201 });
        log({
          userId: usuario.userId,
          acao: "llm:metrics",
          relato_id: doc.relatoId,
          modelo: dados.modelo,
          tentativa: dados.metrics.tentativa,
          tokens_input: dados.tokens_input,
          tokens_output: dados.tokens_output,
          duracao_ms: dados.metrics.totalDuracaoMs,
          status: 200,
        });

        return paraApi(doc);
      } catch (e) {
        if (reserva?.estado === "adquirida" && input.client_id) {
          await falharCriacaoRelato({
            userId: usuario.userId,
            clientId: input.client_id,
            claimToken: reserva.claimToken,
            agora: isoUtc(),
            erro: e instanceof Error ? e.message : "Falha ao criar relato.",
          });
        }
        if (e instanceof ErroLLM) {
          throw new ORPCError("BAD_GATEWAY", {
            message: "Não deu pra montar a ficha agora. Sua transcrição está salva — tente de novo.",
          });
        }
        throw e;
      }
    }),

  /** GET /relatos */
  listar: autenticado.handler(async ({ context }) => {
    const linhas = await db
      .select()
      .from(schema.relatos)
      .where(eq(schema.relatos.userId, context.usuario.userId))
      .orderBy(desc(schema.relatos.createdAt))
      .limit(LIMITE_HISTORICO);
    return linhas.map((l) => paraApi(l));
  }),

  /**
   * GET /relatos/agenda
   * Hoje, amanhã e o que ficou sem data — a terceira lista costuma ser a mais valiosa.
   */
  agenda: autenticado.handler(async ({ context }) => {
    const userId = context.usuario.userId;
    const hoje = hojeBr();
    const amanha = amanhaBr();

    const buscar = async (dataIso: string, semData = false, limite = 50) => {
      const filtro = semData
        ? and(
            eq(schema.relatos.userId, userId),
            eq(schema.relatos.dataIso, ""),
            eq(schema.relatos.audioIninteligivel, false),
          )
        : and(eq(schema.relatos.userId, userId), eq(schema.relatos.dataIso, dataIso));
      const linhas = await db
        .select()
        .from(schema.relatos)
        .where(filtro)
        .orderBy(schema.relatos.hora)
        .limit(limite);
      return linhas.map((l) => paraApi(l));
    };

    return {
      hoje: await buscar(hoje),
      amanha: await buscar(amanha),
      sem_data: await buscar("", true),
    };
  }),

  /** GET /relatos/{id} */
  obter: autenticado
    .input(z.object({ relato_id: z.string() }))
    .handler(async ({ input, context }) =>
      paraApi(await obterDoBanco(input.relato_id, context.usuario.userId)),
    ),

  /** PATCH /relatos/{id} */
  editar: autenticado
    .input(
      z.object({
        relato_id: z.string(),
        mudancas: z.object({
          empresa: z.string().nullish(),
          contato: z.string().nullish(),
          cargo: z.string().nullish(),
          telefone: z.string().nullish(),
          resumo: z.string().nullish(),
          resumo_narrativo: z.string().nullish(),
          email_cliente: z.string().nullish(),
          proximas_perguntas: z.array(z.string()).nullish(),
          objecao: z.string().nullish(),
          proxima_acao: z.string().nullish(),
          data_iso: z.string().nullish(),
          hora: z.string().nullish(),
          temperatura: z.string().nullish(),
          faltou_perguntar: z.array(z.string()).nullish(),
          followup: z.string().nullish(),
          concorrentes: z.array(z.string()).nullish(),
          numeros: z.array(z.string()).nullish(),
          revisado: z.boolean().nullish(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const entradas = Object.entries(input.mudancas).filter(([, v]) => v !== undefined && v !== null);
      if (!entradas.length) return paraApi(await obterDoBanco(input.relato_id, userId));

      const mudancas: Record<string, unknown> = Object.fromEntries(entradas);

      // o que o vendedor corrige na mão vale mais que o que o modelo extraiu
      if ("data_iso" in mudancas) {
        mudancas.data_iso = normalizarData(mudancas.data_iso, hojeBr());
        mudancas.precisa_confirmar = !mudancas.data_iso;
      }
      if ("hora" in mudancas) mudancas.hora = normalizarHora(mudancas.hora);
      if ("telefone" in mudancas) mudancas.telefone = normalizarTelefone(mudancas.telefone);
      if ("temperatura" in mudancas && !["quente", "morna", "fria"].includes(String(mudancas.temperatura))) {
        delete mudancas.temperatura;
      }

      const doc = await obterDoBanco(input.relato_id, userId);
      const atual = paraApi(doc) as unknown as Record<string, unknown>;

      const confianca = { ...doc.confianca };
      const evidencia = { ...doc.evidencia };
      for (const campo of Object.keys(mudancas)) {
        if (campo in confianca) {
          confianca[campo] = mudancas[campo] ? "alta" : "vazio";
          evidencia[campo] = mudancas[campo] ? "corrigido pelo vendedor" : "";
        }
      }
      mudancas.confianca = confianca;
      mudancas.evidencia = evidencia;
      mudancas.campos_a_revisar = camposParaRevisar({ ...atual, confianca } as {
        confianca: Record<string, string>;
      });

      const paraColuna: Record<string, string> = {
        empresa: "empresa",
        contato: "contato",
        cargo: "cargo",
        telefone: "telefone",
        resumo: "resumo",
        resumo_narrativo: "resumoNarrativo",
        email_cliente: "emailCliente",
        proximas_perguntas: "proximasPerguntas",
        objecao: "objecao",
        proxima_acao: "proximaAcao",
        data_iso: "dataIso",
        hora: "hora",
        temperatura: "temperatura",
        faltou_perguntar: "faltouPerguntar",
        followup: "followup",
        concorrentes: "concorrentes",
        numeros: "numeros",
        revisado: "revisado",
        precisa_confirmar: "precisaConfirmar",
        confianca: "confianca",
        evidencia: "evidencia",
        campos_a_revisar: "camposARevisar",
      };
      const set: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(mudancas)) {
        const col = paraColuna[k];
        if (col) set[col] = v;
      }

      await db
        .update(schema.relatos)
        .set(set)
        .where(and(eq(schema.relatos.relatoId, input.relato_id), eq(schema.relatos.userId, userId)));

      log({ userId, acao: "editar", relato_id: input.relato_id, status: 200 });

      return paraApi(await obterDoBanco(input.relato_id, userId));
    }),

  /** DELETE /relatos/{id} */
  apagar: autenticado
    .input(z.object({ relato_id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const resultado = await apagarRelatoComHistoricoCrm({ relatoId: input.relato_id, userId });
      if (resultado === "nao_encontrado") {
        throw new ORPCError("NOT_FOUND", { message: "Relato não encontrado." });
      }
      if (resultado === "sincronizacao_em_andamento") {
        throw new ORPCError("CONFLICT", {
          message: "Este relato está sendo enviado ao CRM. Aguarde o envio terminar e tente excluir novamente.",
        });
      }
      log({ userId, acao: "apagar", relato_id: input.relato_id, status: 200 });
      return { ok: true };
    }),
};
