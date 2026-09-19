import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";

type Banco = typeof db;
type Convite = typeof schema.convites.$inferSelect;

export type ResultadoAceiteConvite =
  | { ok: true; convite: Convite }
  | {
      ok: false;
      motivo: "nao_encontrado" | "email_divergente" | "expirado" | "usado" | "ja_membro";
    };

function emailNormalizado(email: string) {
  return email.trim().toLowerCase();
}

function erroDeUnicidade(erro: unknown) {
  const mensagem = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro);
  return mensagem.includes("SQLITE_CONSTRAINT") || mensagem.includes("UNIQUE constraint failed");
}

function erroDeContencao(erro: unknown) {
  const mensagem = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro);
  return mensagem.includes("SQLITE_BUSY") || mensagem.includes("database is locked");
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function aceitarConviteAtomico(
  entrada: {
    tokenHash: string;
    userId: string;
    email: string;
    agora: string;
    membroId: string;
  },
  banco: Banco = db,
): Promise<ResultadoAceiteConvite> {
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    try {
      const [convite] = await banco
        .select()
        .from(schema.convites)
        .where(eq(schema.convites.tokenHash, entrada.tokenHash));
      if (!convite) return { ok: false, motivo: "nao_encontrado" };
      if (emailNormalizado(convite.email) !== emailNormalizado(entrada.email)) {
        return { ok: false, motivo: "email_divergente" };
      }
      if (convite.status !== "pendente") return { ok: false, motivo: "usado" };
      if (convite.expiraEm < entrada.agora) return { ok: false, motivo: "expirado" };

      const [membro] = await banco
        .select({ membroId: schema.membros.membroId })
        .from(schema.membros)
        .where(eq(schema.membros.userId, entrada.userId));
      if (membro) return { ok: false, motivo: "ja_membro" };

      const filtro = and(
        eq(schema.convites.conviteId, convite.conviteId),
        eq(schema.convites.status, "pendente"),
        eq(schema.convites.email, convite.email),
        gte(schema.convites.expiraEm, entrada.agora),
      );
      const inserirMembro = banco
        .insert(schema.membros)
        .select(
          banco
            .select({
              membroId: sql<string>`${entrada.membroId}`.as("membro_id"),
              equipeId: schema.convites.equipeId,
              userId: sql<string>`${entrada.userId}`.as("user_id"),
              papel: schema.convites.papel,
              entrouEm: sql<string>`${entrada.agora}`.as("entrou_em"),
            })
            .from(schema.convites)
            .where(filtro),
        )
        .returning();
      const consumirConvite = banco
        .update(schema.convites)
        .set({ status: "aceito", aceitoEm: entrada.agora })
        .where(filtro)
        .returning();
      const [membrosInseridos, convitesConsumidos] = await banco.batch([inserirMembro, consumirConvite]);
      const consumido = convitesConsumidos[0];
      if (!membrosInseridos.length || !consumido) return { ok: false, motivo: "usado" };
      return { ok: true, convite: consumido };
    } catch (erro) {
      if (erroDeContencao(erro) && tentativa < 3) {
        await esperar(10 * 2 ** tentativa);
        continue;
      }
      if (!erroDeUnicidade(erro)) throw erro;

      const [membro] = await banco
        .select({ membroId: schema.membros.membroId })
        .from(schema.membros)
        .where(eq(schema.membros.userId, entrada.userId));
      return { ok: false, motivo: membro ? "ja_membro" : "usado" };
    }
  }
  throw new Error("Não foi possível concluir o aceite do convite.");
}
