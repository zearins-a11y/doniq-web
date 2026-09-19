import { randomBytes } from "node:crypto";
import { and, eq, lte, or } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";

type Banco = typeof db;
type Relato = typeof schema.relatos.$inferSelect;

const DURACAO_CLAIM_MS = 5 * 60 * 1000;

export type ReservaCriacaoRelato =
  | { estado: "adquirida"; relatoId: string; claimToken: string }
  | { estado: "concluida"; relatoId: string }
  | { estado: "em_andamento" };

export class ClaimCriacaoPerdido extends Error {}

function id(prefixo: string) {
  return `${prefixo}_${randomBytes(8).toString("hex")}`;
}

function expirarClaim(agora: string) {
  return new Date(new Date(agora).getTime() + DURACAO_CLAIM_MS).toISOString();
}

export async function reservarCriacaoRelato(
  entrada: { userId: string; clientId: string; agora: string },
  banco: Banco = db,
): Promise<ReservaCriacaoRelato> {
  const relatoId = id("rel");
  const claimToken = id("clm");
  const claimExpiraEm = expirarClaim(entrada.agora);
  const [inserida] = await banco
    .insert(schema.criacoesRelato)
    .values({
      criacaoId: id("crt"),
      userId: entrada.userId,
      clientId: entrada.clientId,
      relatoId,
      status: "processando",
      claimToken,
      claimExpiraEm,
      erro: "",
      criadoEm: entrada.agora,
      atualizadoEm: entrada.agora,
    })
    .onConflictDoNothing()
    .returning();
  if (inserida) return { estado: "adquirida", relatoId, claimToken };

  const [existente] = await banco
    .select()
    .from(schema.criacoesRelato)
    .where(and(eq(schema.criacoesRelato.userId, entrada.userId), eq(schema.criacoesRelato.clientId, entrada.clientId)));
  if (!existente) return { estado: "em_andamento" };
  if (existente.status === "concluido") {
    return { estado: "concluida", relatoId: existente.relatoId };
  }
  if (existente.status === "processando" && existente.claimExpiraEm > entrada.agora) {
    return { estado: "em_andamento" };
  }

  const [retomada] = await banco
    .update(schema.criacoesRelato)
    .set({
      status: "processando",
      claimToken,
      claimExpiraEm,
      erro: "",
      atualizadoEm: entrada.agora,
    })
    .where(
      and(
        eq(schema.criacoesRelato.criacaoId, existente.criacaoId),
        or(eq(schema.criacoesRelato.status, "erro"), lte(schema.criacoesRelato.claimExpiraEm, entrada.agora)),
      ),
    )
    .returning();
  return retomada ? { estado: "adquirida", relatoId: retomada.relatoId, claimToken } : { estado: "em_andamento" };
}

export async function falharCriacaoRelato(
  entrada: { userId: string; clientId: string; claimToken: string; agora: string; erro: string },
  banco: Banco = db,
) {
  await banco
    .update(schema.criacoesRelato)
    .set({
      status: "erro",
      erro: entrada.erro.slice(0, 500),
      claimToken: "",
      claimExpiraEm: "",
      atualizadoEm: entrada.agora,
    })
    .where(
      and(
        eq(schema.criacoesRelato.userId, entrada.userId),
        eq(schema.criacoesRelato.clientId, entrada.clientId),
        eq(schema.criacoesRelato.claimToken, entrada.claimToken),
        eq(schema.criacoesRelato.status, "processando"),
      ),
    );
}

export async function concluirCriacaoRelato(
  entrada: {
    relato: Relato;
    claim?: { clientId: string; claimToken: string };
    agora: string;
  },
  banco: Banco = db,
) {
  await banco.transaction(async (tx) => {
    if (entrada.claim) {
      const [concluida] = await tx
        .update(schema.criacoesRelato)
        .set({
          status: "concluido",
          claimToken: "",
          claimExpiraEm: "",
          erro: "",
          atualizadoEm: entrada.agora,
        })
        .where(
          and(
            eq(schema.criacoesRelato.userId, entrada.relato.userId),
            eq(schema.criacoesRelato.clientId, entrada.claim.clientId),
            eq(schema.criacoesRelato.relatoId, entrada.relato.relatoId),
            eq(schema.criacoesRelato.claimToken, entrada.claim.claimToken),
            eq(schema.criacoesRelato.status, "processando"),
          ),
        )
        .returning({ criacaoId: schema.criacoesRelato.criacaoId });
      if (!concluida) throw new ClaimCriacaoPerdido("A reserva deste relato expirou.");
    }

    await tx.insert(schema.relatos).values(entrada.relato);

    const empresa = entrada.relato.empresa.trim();
    if (!empresa) return;
    const abertos = await tx
      .select()
      .from(schema.compromissos)
      .where(and(eq(schema.compromissos.userId, entrada.relato.userId), eq(schema.compromissos.status, "aberto")));
    const alvo = empresa.toLowerCase();
    const compromisso = abertos.find((item) => item.empresa.trim().toLowerCase() === alvo);
    if (!compromisso) return;

    await tx
      .update(schema.compromissos)
      .set({
        status: "feito",
        relatoId: entrada.relato.relatoId,
        atualizadoEm: entrada.agora,
      })
      .where(
        and(eq(schema.compromissos.compromissoId, compromisso.compromissoId), eq(schema.compromissos.status, "aberto")),
      );
  });
}
