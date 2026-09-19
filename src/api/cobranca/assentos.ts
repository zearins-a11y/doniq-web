/**
 * Sincronizar assentos com a fatura.
 *
 * Chamado quando a equipe muda de tamanho: convite **aceito**, pessoa removida,
 * pessoa que saiu. Nunca no envio do convite — cobrar por convite pendente faz o
 * gestor parar de convidar, e convidar é o que faz o produto valer.
 *
 * Três decisões que valem comentário:
 *
 *  1. **Nunca lança.** Se a Autumn recusar, a pessoa entra na equipe do mesmo
 *     jeito. Um assento não cobrado por alguns minutos custa centavos; um convite
 *     aceito que "não colou" por causa da fatura custa a confiança do gestor.
 *  2. **Só mexe em quem já assina.** Conta em teste não tem assinatura para
 *     ajustar, e criar uma aqui seria cobrar sem ninguém ter clicado em pagar.
 *  3. **Proporcional na hora** (vem de `atualizarAssentos`): quem entrou dia 28
 *     paga três dias, não o mês.
 */

import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { type PlanoCobravel, assentosEmUso, planoConhecido } from "./assinatura";
import { assinaturaDoCliente, atualizarAssentos } from "./provedor";

export interface ResultadoSincronia {
  /** A quantidade de assentos que a equipe tem agora. */
  assentos: number;
  /** Se a fatura foi de fato ajustada. Falso é normal em conta de teste. */
  ajustada: boolean;
  /** Por que não ajustou, em uma palavra: "sem_equipe", "sem_assinatura", "falhou". */
  motivo: string;
}

export async function sincronizarAssentos(equipeId: string): Promise<ResultadoSincronia> {
  try {
    const [equipe] = await db
      .select()
      .from(schema.equipes)
      .where(eq(schema.equipes.equipeId, equipeId));
    if (!equipe) return { assentos: 0, ajustada: false, motivo: "sem_equipe" };

    const linhas = await db
      .select({ userId: schema.membros.userId })
      .from(schema.membros)
      .where(eq(schema.membros.equipeId, equipeId));
    const assentos = assentosEmUso(linhas.length);

    const remota = await assinaturaDoCliente(equipe.donoUserId);
    const plano: PlanoCobravel | "" = remota?.ativa ? planoConhecido(remota.plano) : "";
    if (!plano) return { assentos, ajustada: false, motivo: "sem_assinatura" };
    if (remota && remota.assentos === assentos) {
      return { assentos, ajustada: false, motivo: "sem_mudanca" };
    }

    const ok = await atualizarAssentos(equipe.donoUserId, plano, assentos);
    return { assentos, ajustada: ok, motivo: ok ? "" : "falhou" };
  } catch {
    return { assentos: 0, ajustada: false, motivo: "falhou" };
  }
}
