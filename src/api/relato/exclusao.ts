import { and, eq, gt } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { isoUtc } from "./tempo";

type Banco = typeof db;
const MAX_TENTATIVAS_TRANSACAO = 6;

export type ResultadoExclusao = "apagado" | "nao_encontrado" | "sincronizacao_em_andamento";

function bancoOcupado(erro: unknown): boolean {
  let atual: unknown = erro;
  for (let nivel = 0; atual && nivel < 4; nivel++) {
    const mensagem = atual instanceof Error ? `${atual.name} ${atual.message}` : String(atual);
    if (mensagem.includes("SQLITE_BUSY") || mensagem.includes("database is locked")) return true;
    atual = typeof atual === "object" && "cause" in atual ? atual.cause : null;
  }
  return false;
}

/**
 * Remove o relato e o histórico CRM que replica seus dados pessoais.
 * A transação impede que uma falha deixe somente uma das cópias apagada.
 */
export async function apagarRelatoComHistoricoCrm(
  entrada: { relatoId: string; userId: string },
  banco: Banco = db,
  agora = isoUtc(),
): Promise<ResultadoExclusao> {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TRANSACAO; tentativa++) {
    try {
      return await banco.transaction(async (tx) => {
        const [relato] = await tx
          .select({ relatoId: schema.relatos.relatoId })
          .from(schema.relatos)
          .where(and(eq(schema.relatos.relatoId, entrada.relatoId), eq(schema.relatos.userId, entrada.userId)))
          .limit(1);

        if (!relato) return "nao_encontrado";

        const [emAndamento] = await tx
          .select({ sincronizacaoId: schema.sincronizacoes.sincronizacaoId })
          .from(schema.sincronizacoes)
          .where(
            and(
              eq(schema.sincronizacoes.relatoId, entrada.relatoId),
              eq(schema.sincronizacoes.userId, entrada.userId),
              eq(schema.sincronizacoes.status, "processando"),
              gt(schema.sincronizacoes.claimExpiraEm, agora),
            ),
          )
          .limit(1);
        if (emAndamento) return "sincronizacao_em_andamento";

        await tx
          .delete(schema.sincronizacoes)
          .where(
            and(
              eq(schema.sincronizacoes.relatoId, entrada.relatoId),
              eq(schema.sincronizacoes.userId, entrada.userId),
            ),
          );

        await tx
          .delete(schema.criacoesRelato)
          .where(
            and(
              eq(schema.criacoesRelato.relatoId, entrada.relatoId),
              eq(schema.criacoesRelato.userId, entrada.userId),
            ),
          );

        await tx
          .update(schema.compromissos)
          .set({ relatoId: "" })
          .where(
            and(
              eq(schema.compromissos.relatoId, entrada.relatoId),
              eq(schema.compromissos.userId, entrada.userId),
            ),
          );

        await tx
          .delete(schema.relatos)
          .where(and(eq(schema.relatos.relatoId, entrada.relatoId), eq(schema.relatos.userId, entrada.userId)));

        return "apagado";
      });
    } catch (erro) {
      if (!bancoOcupado(erro) || tentativa === MAX_TENTATIVAS_TRANSACAO) throw erro;
      await new Promise((resolver) => setTimeout(resolver, 10 * 2 ** (tentativa - 1)));
    }
  }
  throw new Error("A exclusão do relato não pôde ser concluída.");
}
