import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reservarSincronizacao } from "../../crm/sincronizar";
import * as schema from "../../database/schema";
import { apagarRelatoComHistoricoCrm } from "../exclusao";

const arquivos: string[] = [];
const clientes: Client[] = [];

async function banco() {
  const arquivo = join(tmpdir(), `doniq-exclusao-${randomUUID()}.db`);
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
      status TEXT NOT NULL,
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
    CREATE TABLE criacoes_relato (
      criacao_id TEXT PRIMARY KEY NOT NULL,
      relato_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
    CREATE TABLE compromissos (
      compromisso_id TEXT PRIMARY KEY NOT NULL,
      relato_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );
  `);
  return { arquivo, client, db: drizzle(client, { schema }) };
}

afterEach(async () => {
  for (const client of clientes.splice(0)) client.close();
  await Promise.all(arquivos.splice(0).map((arquivo) => rm(arquivo, { force: true })));
});

describe("exclusão de relato", () => {
  test("apaga o relato e o histórico CRM com dados pessoais", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_1", "user_1"],
    });
    await client.execute({
      sql: "INSERT INTO sincronizacoes (sincronizacao_id, relato_id, user_id, provedor, status, payload_enviado, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        "sync_1",
        "rel_1",
        "user_1",
        "hubspot",
        "enviado",
        '{"contato":"Pessoa"}',
        "2026-09-11T12:00:00.000Z",
        "2026-09-11T12:00:00.000Z",
      ],
    });
    await client.execute({
      sql: "INSERT INTO criacoes_relato (criacao_id, relato_id, user_id) VALUES (?, ?, ?)",
      args: ["criacao_1", "rel_1", "user_1"],
    });
    await client.execute({
      sql: "INSERT INTO compromissos (compromisso_id, relato_id, user_id) VALUES (?, ?, ?)",
      args: ["comp_1", "rel_1", "user_1"],
    });

    expect(await apagarRelatoComHistoricoCrm({ relatoId: "rel_1", userId: "user_1" }, db)).toBe("apagado");
    expect((await client.execute("SELECT * FROM relatos")).rows).toHaveLength(0);
    expect((await client.execute("SELECT * FROM sincronizacoes")).rows).toHaveLength(0);
    expect((await client.execute("SELECT * FROM criacoes_relato")).rows).toHaveLength(0);
    expect((await client.execute("SELECT relato_id FROM compromissos")).rows[0]?.relato_id).toBe("");
  });

  test("não apaga dados de outro usuário", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_2", "user_2"],
    });
    await client.execute({
      sql: "INSERT INTO sincronizacoes (sincronizacao_id, relato_id, user_id, provedor, status, payload_enviado, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        "sync_2",
        "rel_2",
        "user_2",
        "hubspot",
        "enviado",
        '{"contato":"Pessoa"}',
        "2026-09-11T12:00:00.000Z",
        "2026-09-11T12:00:00.000Z",
      ],
    });

    expect(await apagarRelatoComHistoricoCrm({ relatoId: "rel_2", userId: "user_1" }, db)).toBe("nao_encontrado");
    expect((await client.execute("SELECT * FROM relatos")).rows).toHaveLength(1);
    expect((await client.execute("SELECT * FROM sincronizacoes")).rows).toHaveLength(1);
  });

  test("bloqueia exclusão enquanto o CRM está processando o envio", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_3", "user_1"],
    });
    await client.execute({
      sql: "INSERT INTO sincronizacoes (sincronizacao_id, relato_id, user_id, provedor, status, claim_expira_em, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        "sync_3",
        "rel_3",
        "user_1",
        "hubspot",
        "processando",
        "2026-09-11T13:05:00.000Z",
        "2026-09-11T13:00:00.000Z",
        "2026-09-11T13:00:00.000Z",
      ],
    });

    expect(
      await apagarRelatoComHistoricoCrm(
        { relatoId: "rel_3", userId: "user_1" },
        db,
        "2026-09-11T13:00:00.000Z",
      ),
    ).toBe("sincronizacao_em_andamento");
    expect((await client.execute("SELECT * FROM relatos")).rows).toHaveLength(1);
    expect((await client.execute("SELECT * FROM sincronizacoes")).rows).toHaveLength(1);
  });

  test("apaga claim processando que já expirou", async () => {
    const { client, db } = await banco();
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_4", "user_1"],
    });
    await client.execute({
      sql: "INSERT INTO sincronizacoes (sincronizacao_id, relato_id, user_id, provedor, status, claim_expira_em, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        "sync_4",
        "rel_4",
        "user_1",
        "hubspot",
        "processando",
        "2026-09-11T12:59:59.000Z",
        "2026-09-11T12:00:00.000Z",
        "2026-09-11T12:00:00.000Z",
      ],
    });

    expect(
      await apagarRelatoComHistoricoCrm(
        { relatoId: "rel_4", userId: "user_1" },
        db,
        "2026-09-11T13:00:00.000Z",
      ),
    ).toBe("apagado");
    expect((await client.execute("SELECT * FROM relatos")).rows).toHaveLength(0);
    expect((await client.execute("SELECT * FROM sincronizacoes")).rows).toHaveLength(0);
  });

  test("exclusão e reserva concorrentes nunca deixam claim órfão", async () => {
    const { arquivo, client, db } = await banco();
    const outroClient = createClient({ url: `file:${arquivo}` });
    clientes.push(outroClient);
    const outroDb = drizzle(outroClient, { schema });
    await client.execute({
      sql: "INSERT INTO relatos (relato_id, user_id) VALUES (?, ?)",
      args: ["rel_5", "user_1"],
    });
    const agora = "2026-09-11T13:00:00.000Z";

    const [reservaResultado, exclusaoResultado] = await Promise.allSettled([
      reservarSincronizacao(
        {
          relatoId: "rel_5",
          userId: "user_1",
          provedor: "hubspot",
          agora,
        },
        db,
      ),
      apagarRelatoComHistoricoCrm({ relatoId: "rel_5", userId: "user_1" }, outroDb, agora),
    ]);
    if (reservaResultado.status === "rejected") throw reservaResultado.reason;
    if (exclusaoResultado.status === "rejected") throw exclusaoResultado.reason;

    const reserva = reservaResultado.value;
    const exclusao = exclusaoResultado.value;
    const relatos = (await client.execute("SELECT * FROM relatos")).rows;
    const sincronizacoes = (await client.execute("SELECT * FROM sincronizacoes")).rows;
    if (exclusao === "apagado") {
      expect(reserva.estado).toBe("ausente");
      expect(relatos).toHaveLength(0);
      expect(sincronizacoes).toHaveLength(0);
    } else {
      expect(exclusao).toBe("sincronizacao_em_andamento");
      expect(reserva.estado).toBe("adquirida");
      expect(relatos).toHaveLength(1);
      expect(sincronizacoes).toHaveLength(1);
    }
  });
});
