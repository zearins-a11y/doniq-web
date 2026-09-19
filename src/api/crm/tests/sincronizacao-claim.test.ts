import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import * as schema from "../../database/schema";
import { reservarSincronizacao } from "../sincronizar";

const arquivos: string[] = [];
const clientes: Client[] = [];

async function banco() {
  const arquivo = join(tmpdir(), `doniq-crm-${randomUUID()}.db`);
  arquivos.push(arquivo);
  const client = createClient({ url: `file:${arquivo}` });
  clientes.push(client);
  await client.executeMultiple(`
    CREATE TABLE relatos (
      relato_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE sincronizacoes (
      sincronizacao_id TEXT PRIMARY KEY NOT NULL,
      relato_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      provedor TEXT NOT NULL,
      status TEXT DEFAULT 'pendente' NOT NULL,
      tentativas INTEGER DEFAULT 0 NOT NULL,
      claim_token TEXT DEFAULT '' NOT NULL,
      claim_expira_em TEXT DEFAULT '' NOT NULL,
      id_externo TEXT DEFAULT '{}' NOT NULL,
      erro TEXT DEFAULT '' NOT NULL,
      payload_enviado TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE UNIQUE INDEX sincronizacoes_relato_provedor_idx
      ON sincronizacoes (relato_id, provedor);
  `);
  return { client, db: drizzle(client, { schema }) };
}

afterEach(async () => {
  for (const client of clientes.splice(0)) client.close();
  await Promise.all(arquivos.splice(0).map((arquivo) => rm(arquivo, { force: true })));
});

describe("reserva de sincronização CRM", () => {
  test("só uma chamada adquire o envio externo", async () => {
    const { client, db } = await banco();
    const entrada = {
      relatoId: "rel_1",
      userId: "user_1",
      provedor: "hubspot" as const,
      agora: "2026-08-31T12:00:00.000Z",
    };
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: [entrada.relatoId, entrada.userId],
    });

    const resultados = await Promise.all([reservarSincronizacao(entrada, db), reservarSincronizacao(entrada, db)]);

    expect(resultados.filter((resultado) => resultado.estado === "adquirida")).toHaveLength(1);
    expect(resultados.filter((resultado) => resultado.estado === "ocupada")).toHaveLength(1);
    expect(await db.select().from(schema.sincronizacoes)).toHaveLength(1);
  });

  test("retoma claim abandonado e incrementa a tentativa", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_2", "user_1"],
    });
    const primeira = await reservarSincronizacao(
      {
        relatoId: "rel_2",
        userId: "user_1",
        provedor: "hubspot",
        agora: "2026-08-31T12:00:00.000Z",
      },
      db,
    );
    expect(primeira.estado).toBe("adquirida");
    await db
      .update(schema.sincronizacoes)
      .set({ claimExpiraEm: "2026-08-31T11:59:59.000Z" })
      .where(eq(schema.sincronizacoes.relatoId, "rel_2"));

    const retomada = await reservarSincronizacao(
      {
        relatoId: "rel_2",
        userId: "user_1",
        provedor: "hubspot",
        agora: "2026-08-31T12:01:00.000Z",
      },
      db,
    );

    expect(retomada.estado).toBe("adquirida");
    expect(retomada.linha.tentativas).toBe(2);
  });

  test("não cria claim para relato já excluído", async () => {
    const { db } = await banco();

    const resultado = await reservarSincronizacao(
      {
        relatoId: "rel_ausente",
        userId: "user_1",
        provedor: "hubspot",
        agora: "2026-08-31T12:00:00.000Z",
      },
      db,
    );

    expect(resultado).toEqual({ estado: "ausente" });
    expect(await db.select().from(schema.sincronizacoes)).toHaveLength(0);
  });

  test("reverte a reserva inteira quando a inserção falha", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_3", "user_1"],
    });
    await client.executeMultiple(`
      CREATE TRIGGER falhar_reserva
      AFTER INSERT ON sincronizacoes
      BEGIN
        SELECT RAISE(ABORT, 'falha simulada');
      END;
    `);

    await expect(
      reservarSincronizacao(
        {
          relatoId: "rel_3",
          userId: "user_1",
          provedor: "hubspot",
          agora: "2026-08-31T12:00:00.000Z",
        },
        db,
      ),
    ).rejects.toThrow();
    expect(await db.select().from(schema.sincronizacoes)).toHaveLength(0);
  });
});
