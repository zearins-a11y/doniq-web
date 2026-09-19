import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as schema from "../../database/schema";
import { aceitarConviteAtomico } from "../aceitar-convite";

const arquivos: string[] = [];
const clientes: Client[] = [];

async function banco() {
  const arquivo = join(tmpdir(), `doniq-convite-${randomUUID()}.db`);
  arquivos.push(arquivo);
  const client = createClient({ url: `file:${arquivo}` });
  clientes.push(client);
  await client.executeMultiple(`
    CREATE TABLE convites (
      convite_id TEXT PRIMARY KEY NOT NULL,
      equipe_id TEXT NOT NULL,
      email TEXT NOT NULL,
      papel TEXT DEFAULT 'vendedor' NOT NULL,
      token_hash TEXT NOT NULL,
      status TEXT DEFAULT 'pendente' NOT NULL,
      criado_por TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      aceito_em TEXT DEFAULT '' NOT NULL,
      email_enviado TEXT DEFAULT 'nao' NOT NULL
    );
    CREATE UNIQUE INDEX convites_token_idx ON convites (token_hash);
    CREATE TABLE membros (
      membro_id TEXT PRIMARY KEY NOT NULL,
      equipe_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      papel TEXT DEFAULT 'vendedor' NOT NULL,
      entrou_em TEXT NOT NULL
    );
    CREATE UNIQUE INDEX membros_user_idx ON membros (user_id);
  `);
  return drizzle(client, { schema });
}

afterEach(async () => {
  for (const client of clientes.splice(0)) client.close();
  await Promise.all(arquivos.splice(0).map((arquivo) => rm(arquivo, { force: true })));
});

describe("aceitarConviteAtomico", () => {
  test("só uma requisição consome o mesmo convite", async () => {
    const db = await banco();
    await db.insert(schema.convites).values({
      conviteId: "cvt_1",
      equipeId: "eqp_1",
      email: "vendedor@empresa.com",
      papel: "vendedor",
      tokenHash: "hash",
      status: "pendente",
      criadoPor: "gestor",
      criadoEm: "2026-08-01T00:00:00.000Z",
      expiraEm: "2026-09-10T00:00:00.000Z",
      aceitoEm: "",
      emailEnviado: "nao",
    });

    const entrada = {
      tokenHash: "hash",
      userId: "user_1",
      email: "Vendedor@Empresa.com",
      agora: "2026-08-31T12:00:00.000Z",
    };
    const resultados = await Promise.all([
      aceitarConviteAtomico({ ...entrada, membroId: "mbr_1" }, db),
      aceitarConviteAtomico({ ...entrada, membroId: "mbr_2" }, db),
    ]);

    expect(resultados.filter((resultado) => resultado.ok)).toHaveLength(1);
    expect(await db.select().from(schema.membros)).toHaveLength(1);
    expect((await db.select().from(schema.convites))[0]?.status).toBe("aceito");
  });

  test("não aceita convite destinado a outro e-mail", async () => {
    const db = await banco();
    await db.insert(schema.convites).values({
      conviteId: "cvt_2",
      equipeId: "eqp_1",
      email: "outra@empresa.com",
      papel: "vendedor",
      tokenHash: "hash-2",
      status: "pendente",
      criadoPor: "gestor",
      criadoEm: "2026-08-01T00:00:00.000Z",
      expiraEm: "2026-09-10T00:00:00.000Z",
      aceitoEm: "",
      emailEnviado: "nao",
    });

    const resultado = await aceitarConviteAtomico(
      {
        tokenHash: "hash-2",
        userId: "user_2",
        email: "vendedor@empresa.com",
        agora: "2026-08-31T12:00:00.000Z",
        membroId: "mbr_3",
      },
      db,
    );

    expect(resultado).toEqual({ ok: false, motivo: "email_divergente" });
    expect(await db.select().from(schema.membros)).toHaveLength(0);
    expect((await db.select().from(schema.convites))[0]?.status).toBe("pendente");
  });
});
