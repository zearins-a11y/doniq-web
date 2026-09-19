import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../database/schema";
import { conferir } from "../codigo";

const arquivos: string[] = [];
const clientes: Client[] = [];
const segredoAnterior = process.env.TOKEN_SECRET;
const SEGREDO_TESTE = randomBytes(32).toString("hex");
const IDENTIFICADOR = "doniq-login-code:pessoa@empresa.com";

async function banco() {
  const arquivo = join(tmpdir(), `doniq-codigo-${randomUUID()}.db`);
  arquivos.push(arquivo);
  const client = createClient({ url: `file:${arquivo}` });
  clientes.push(client);
  await client.executeMultiple(`
    CREATE TABLE verification (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX verification_identifier_idx ON verification (identifier);
  `);
  return drizzle(client, { schema });
}

function valor(codigo: string, tentativas = 0): string {
  const hash = createHmac("sha256", SEGREDO_TESTE).update(`codigo:${codigo}`).digest("hex");
  return `${hash}:${tentativas}`;
}

afterEach(async () => {
  for (const client of clientes.splice(0)) client.close();
  await Promise.all(arquivos.splice(0).map((arquivo) => rm(arquivo, { force: true })));
  if (segredoAnterior === undefined) delete process.env.TOKEN_SECRET;
  else process.env.TOKEN_SECRET = segredoAnterior;
});

describe("conferir código de login", () => {
  test("não consome nem altera uma verificação pertencente ao Better Auth", async () => {
    process.env.TOKEN_SECRET = SEGREDO_TESTE;
    const db = await banco();
    const agora = Date.now();
    await db.insert(schema.verification).values({
      id: "better_auth_1",
      identifier: "pessoa@empresa.com",
      value: "estado-interno-do-better-auth",
      expiresAt: new Date(agora + 60_000),
      createdAt: new Date(agora),
      updatedAt: new Date(agora),
    });

    expect(await conferir("pessoa@empresa.com", "123456", db, agora)).toBe(false);
    const [linha] = await db.select().from(schema.verification);
    expect(linha?.value).toBe("estado-interno-do-better-auth");
  });

  test("um código correto só pode ser consumido uma vez sob concorrência", async () => {
    process.env.TOKEN_SECRET = SEGREDO_TESTE;
    const db = await banco();
    const agora = Date.now();
    await db.insert(schema.verification).values({
      id: "ver_1",
      identifier: IDENTIFICADOR,
      value: valor("123456"),
      expiresAt: new Date(agora + 60_000),
      createdAt: new Date(agora),
      updatedAt: new Date(agora),
    });

    const resultados = await Promise.all(
      Array.from({ length: 10 }, () => conferir("pessoa@empresa.com", "123456", db, agora)),
    );

    expect(resultados.filter(Boolean)).toHaveLength(1);
    expect(await db.select().from(schema.verification)).toHaveLength(0);
  });

  test("rajada paralela não ultrapassa cinco tentativas inválidas", async () => {
    process.env.TOKEN_SECRET = SEGREDO_TESTE;
    const db = await banco();
    const agora = Date.now();
    await db.insert(schema.verification).values({
      id: "ver_2",
      identifier: IDENTIFICADOR,
      value: valor("123456"),
      expiresAt: new Date(agora + 60_000),
      createdAt: new Date(agora),
      updatedAt: new Date(agora),
    });

    const resultados = await Promise.all(
      Array.from({ length: 20 }, (_, indice) =>
        conferir("pessoa@empresa.com", String(200000 + indice), db, agora),
      ),
    );

    expect(resultados.every((resultado) => !resultado)).toBe(true);
    const [linha] = await db.select().from(schema.verification);
    expect(linha?.value.endsWith(":5")).toBe(true);
    expect(await conferir("pessoa@empresa.com", "123456", db, agora)).toBe(false);
  });
});
