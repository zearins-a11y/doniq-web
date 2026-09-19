/**
 * Orquestra o envio de um relato para o CRM do vendedor.
 *
 * Regras de produto:
 *  - só sincroniza relato com `revisado = true`;
 *  - um negócio, uma anotação e uma tarefa por relato;
 *  - a linha única por (relato, provedor) também funciona como claim durável.
 */

import { randomBytes } from "node:crypto";
import { and, eq, lte, ne, or, sql } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { isoUtc } from "../relato/tempo";
import { paraCanonico } from "./canonico";
import { decifrar } from "./cripto";
import { adaptador } from "./index";
import { ErroCrm, type IdsExternos, type Provedor } from "./tipos";

type RelatoRow = typeof schema.relatos.$inferSelect;
type IntegracaoRow = typeof schema.integracoes.$inferSelect;
type SincronizacaoRow = typeof schema.sincronizacoes.$inferSelect;

const DURACAO_CLAIM_MS = 5 * 60 * 1000;
const MAX_TENTATIVAS_TRANSACAO = 6;

export type ResultadoSincronizacao = {
  status: "enviado" | "erro" | "processando";
  provedor: Provedor;
  ids: IdsExternos;
  erro: string;
  tentativas: number;
};

type ReservaSincronizacao =
  | { estado: "adquirida"; linha: SincronizacaoRow; claimToken: string }
  | { estado: "ocupada"; linha: SincronizacaoRow }
  | { estado: "ausente" };

export function paraApiSincronizacao(s: SincronizacaoRow) {
  return {
    provedor: s.provedor,
    status: s.status,
    tentativas: s.tentativas,
    id_externo: s.idExterno ?? {},
    erro: s.erro,
    atualizado_em: s.atualizadoEm,
  };
}

function expirarClaim(agora: string) {
  return new Date(new Date(agora).getTime() + DURACAO_CLAIM_MS).toISOString();
}

function bancoOcupado(erro: unknown): boolean {
  let atual: unknown = erro;
  for (let nivel = 0; atual && nivel < 4; nivel++) {
    const mensagem = atual instanceof Error ? `${atual.name} ${atual.message}` : String(atual);
    if (mensagem.includes("SQLITE_BUSY") || mensagem.includes("database is locked")) return true;
    atual = typeof atual === "object" && "cause" in atual ? atual.cause : null;
  }
  return false;
}

export async function reservarSincronizacao(
  entrada: { relatoId: string; userId: string; provedor: Provedor; agora: string },
  banco: typeof db = db,
): Promise<ReservaSincronizacao> {
  const claimToken = `clm_${randomBytes(8).toString("hex")}`;
  const claimExpiraEm = expirarClaim(entrada.agora);
  const sincronizacaoId = `snc_${randomBytes(6).toString("hex")}`;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TRANSACAO; tentativa++) {
    try {
      const [inserida] = await banco
        .insert(schema.sincronizacoes)
        .select(
          banco
            .select({
              sincronizacaoId: sql<string>`${sincronizacaoId}`.as("sincronizacao_id"),
              relatoId: schema.relatos.relatoId,
              userId: schema.relatos.userId,
              provedor: sql<string>`${entrada.provedor}`.as("provedor"),
              status: sql<string>`${"processando"}`.as("status"),
              tentativas: sql<number>`1`.as("tentativas"),
              claimToken: sql<string>`${claimToken}`.as("claim_token"),
              claimExpiraEm: sql<string>`${claimExpiraEm}`.as("claim_expira_em"),
              idExterno: sql<Record<string, string>>`${JSON.stringify({})}`.as("id_externo"),
              erro: sql<string>`${""}`.as("erro"),
              payloadEnviado: sql<unknown>`NULL`.as("payload_enviado"),
              criadoEm: sql<string>`${entrada.agora}`.as("criado_em"),
              atualizadoEm: sql<string>`${entrada.agora}`.as("atualizado_em"),
            })
            .from(schema.relatos)
            .where(
              and(
                eq(schema.relatos.relatoId, entrada.relatoId),
                eq(schema.relatos.userId, entrada.userId),
              ),
            ),
        )
        .onConflictDoNothing()
        .returning();
      if (inserida) return { estado: "adquirida", linha: inserida, claimToken };

      const [existente] = await banco
        .select()
        .from(schema.sincronizacoes)
        .where(
          and(
            eq(schema.sincronizacoes.relatoId, entrada.relatoId),
            eq(schema.sincronizacoes.userId, entrada.userId),
            eq(schema.sincronizacoes.provedor, entrada.provedor),
          ),
        );
      if (!existente) {
        const [relato] = await banco
          .select({ relatoId: schema.relatos.relatoId })
          .from(schema.relatos)
          .where(
            and(
              eq(schema.relatos.relatoId, entrada.relatoId),
              eq(schema.relatos.userId, entrada.userId),
            ),
          )
          .limit(1);
        if (!relato) return { estado: "ausente" };
        continue;
      }
      if (existente.status === "processando" && existente.claimExpiraEm > entrada.agora) {
        return { estado: "ocupada", linha: existente };
      }

      const [retomada] = await banco
        .update(schema.sincronizacoes)
        .set({
          status: "processando",
          tentativas: sql`${schema.sincronizacoes.tentativas} + 1`,
          claimToken,
          claimExpiraEm,
          erro: "",
          atualizadoEm: entrada.agora,
        })
        .where(
          and(
            eq(schema.sincronizacoes.sincronizacaoId, existente.sincronizacaoId),
            eq(schema.sincronizacoes.userId, entrada.userId),
            or(
              ne(schema.sincronizacoes.status, "processando"),
              lte(schema.sincronizacoes.claimExpiraEm, entrada.agora),
            ),
          ),
        )
        .returning();
      return retomada
        ? { estado: "adquirida", linha: retomada, claimToken }
        : { estado: "ocupada", linha: existente };
    } catch (erro) {
      if (!bancoOcupado(erro) || tentativa === MAX_TENTATIVAS_TRANSACAO) throw erro;
      await new Promise((resolver) => setTimeout(resolver, 10 * 2 ** (tentativa - 1)));
    }
  }
  throw new Error("A reserva da sincronização não pôde ser concluída.");
}

async function finalizarSincronizacao(entrada: {
  sincronizacaoId: string;
  claimToken: string;
  status: "enviado" | "erro";
  ids: IdsExternos;
  erro: string;
  payload: unknown;
}) {
  const [atualizada] = await db
    .update(schema.sincronizacoes)
    .set({
      status: entrada.status,
      claimToken: "",
      claimExpiraEm: "",
      idExterno: entrada.ids,
      erro: entrada.erro,
      payloadEnviado: entrada.payload,
      atualizadoEm: isoUtc(),
    })
    .where(
      and(
        eq(schema.sincronizacoes.sincronizacaoId, entrada.sincronizacaoId),
        eq(schema.sincronizacoes.claimToken, entrada.claimToken),
        eq(schema.sincronizacoes.status, "processando"),
      ),
    )
    .returning({ sincronizacaoId: schema.sincronizacoes.sincronizacaoId });
  return Boolean(atualizada);
}

export async function sincronizacoesDoRelato(relatoId: string) {
  const linhas = await db.select().from(schema.sincronizacoes).where(eq(schema.sincronizacoes.relatoId, relatoId));
  return linhas.map(paraApiSincronizacao);
}

/** Envia um relato revisado para uma integração ativa. Nunca lança por erro de CRM. */
export async function sincronizarRelato(relato: RelatoRow, integracao: IntegracaoRow): Promise<ResultadoSincronizacao> {
  const provedor = integracao.provedor as Provedor;
  const reserva = await reservarSincronizacao({
    relatoId: relato.relatoId,
    userId: relato.userId,
    provedor,
    agora: isoUtc(),
  });
  if (reserva.estado === "ausente") {
    return {
      status: "erro",
      provedor,
      ids: {},
      erro: "O relato foi excluído antes do envio.",
      tentativas: 0,
    };
  }
  const idsExistentes: IdsExternos = reserva.linha.idExterno ?? {};
  const tentativas = reserva.linha.tentativas;

  if (reserva.estado === "ocupada") {
    return {
      status: "processando",
      provedor,
      ids: idsExistentes,
      erro: "Este relato já está sendo enviado para o CRM.",
      tentativas,
    };
  }

  if (!relato.revisado) {
    const erro = "O relato precisa estar revisado antes de ir para o CRM.";
    await finalizarSincronizacao({
      sincronizacaoId: reserva.linha.sincronizacaoId,
      claimToken: reserva.claimToken,
      status: "erro",
      ids: idsExistentes,
      erro,
      payload: null,
    });
    return { status: "erro", provedor, ids: idsExistentes, erro, tentativas };
  }

  const canonico = paraCanonico({
    relatoId: relato.relatoId,
    clientId: relato.clientId,
    empresa: relato.empresa,
    contato: relato.contato,
    cargo: relato.cargo,
    telefone: relato.telefone,
    resumo: relato.resumo,
    transcricao: relato.transcricao,
    objecao: relato.objecao,
    proximaAcao: relato.proximaAcao,
    followup: relato.followup,
    dataIso: relato.dataIso,
    hora: relato.hora,
    temperatura: relato.temperatura,
    tags: relato.tags ?? [],
    concorrentes: relato.concorrentes ?? [],
    numeros: relato.numeros ?? [],
    createdAt: relato.createdAt,
  });

  try {
    const credenciais = JSON.parse(decifrar(integracao.credenciais)) as {
      token: string;
      contaId?: string;
    };
    const resultado = await adaptador(provedor).enviar(canonico, {
      credenciais,
      funilId: integracao.funilId,
      etapaId: integracao.etapaId,
      idsExistentes,
      mapaCampos: integracao.mapaCampos ?? {},
    });
    const finalizada = await finalizarSincronizacao({
      sincronizacaoId: reserva.linha.sincronizacaoId,
      claimToken: reserva.claimToken,
      status: "enviado",
      ids: resultado.ids,
      erro: "",
      payload: resultado.payload,
    });
    if (!finalizada) {
      return {
        status: "processando",
        provedor,
        ids: resultado.ids,
        erro: "Outro envio assumiu esta sincronização.",
        tentativas,
      };
    }
    return { status: "enviado", provedor, ids: resultado.ids, erro: "", tentativas };
  } catch (e) {
    const erro =
      e instanceof ErroCrm
        ? e.message
        : e instanceof Error && e.message.includes("Credencial")
          ? "Credencial do CRM ilegível. Salve o token de novo."
          : "Não deu pra enviar ao CRM agora. Tente de novo em alguns minutos.";
    await finalizarSincronizacao({
      sincronizacaoId: reserva.linha.sincronizacaoId,
      claimToken: reserva.claimToken,
      status: "erro",
      ids: idsExistentes,
      erro,
      payload: null,
    });
    return { status: "erro", provedor, ids: idsExistentes, erro, tentativas };
  }
}
