import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as schema from "../../database/schema";
import {
  concluirCriacaoRelato,
  falharCriacaoRelato,
  reservarCriacaoRelato,
} from "../idempotencia";

const arquivos: string[] = [];
const clientes: Client[] = [];

async function banco() {
  const arquivo = join(tmpdir(), `doniq-relato-${randomUUID()}.db`);
  arquivos.push(arquivo);
  const client = createClient({ url: `file:${arquivo}` });
  clientes.push(client);
  await client.executeMultiple(`
    CREATE TABLE criacoes_relato (
      criacao_id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      relato_id TEXT NOT NULL,
      status TEXT DEFAULT 'processando' NOT NULL,
      claim_token TEXT NOT NULL,
      claim_expira_em TEXT NOT NULL,
      erro TEXT DEFAULT '' NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE UNIQUE INDEX criacoes_relato_user_client_idx
      ON criacoes_relato (user_id, client_id);
    CREATE UNIQUE INDEX criacoes_relato_relato_idx ON criacoes_relato (relato_id);
  `);
  return drizzle(client, { schema });
}

async function bancoCompleto() {
  const arquivo = join(tmpdir(), `doniq-relato-completo-${randomUUID()}.db`);
  arquivos.push(arquivo);
  const client = createClient({ url: `file:${arquivo}` });
  clientes.push(client);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dir, "../../../../drizzle") });
  return db;
}

afterEach(async () => {
  for (const client of clientes.splice(0)) client.close();
  await Promise.all(arquivos.splice(0).map((arquivo) => rm(arquivo, { force: true })));
});

describe("reserva de criação de relato", () => {
  test("só uma chamada adquire a chave do cliente", async () => {
    const db = await banco();
    const entrada = {
      userId: "user_1",
      clientId: "mobile_1",
      agora: "2026-08-31T12:00:00.000Z",
    };

    const resultados = await Promise.all([reservarCriacaoRelato(entrada, db), reservarCriacaoRelato(entrada, db)]);

    expect(resultados.filter((resultado) => resultado.estado === "adquirida")).toHaveLength(1);
    expect(resultados.filter((resultado) => resultado.estado === "em_andamento")).toHaveLength(1);
    expect(await db.select().from(schema.criacoesRelato)).toHaveLength(1);
  });

  test("uma falha libera a chave para nova tentativa", async () => {
    const db = await banco();
    const entrada = {
      userId: "user_1",
      clientId: "mobile_2",
      agora: "2026-08-31T12:00:00.000Z",
    };
    const primeira = await reservarCriacaoRelato(entrada, db);
    if (primeira.estado !== "adquirida") throw new Error("Reserva inicial não adquirida.");

    await falharCriacaoRelato(
      {
        ...entrada,
        claimToken: primeira.claimToken,
        agora: "2026-08-31T12:00:01.000Z",
        erro: "falha temporária",
      },
      db,
    );
    const segunda = await reservarCriacaoRelato({ ...entrada, agora: "2026-08-31T12:00:02.000Z" }, db);

    expect(segunda.estado).toBe("adquirida");
    expect(segunda.estado === "adquirida" && segunda.relatoId).toBe(primeira.relatoId);
  });

  test("confirma claim, relato e agenda no mesmo commit", async () => {
    const db = await bancoCompleto();
    const reserva = await reservarCriacaoRelato(
      {
        userId: "user_1",
        clientId: "mobile_3",
        agora: "2026-08-31T12:00:00.000Z",
      },
      db,
    );
    if (reserva.estado !== "adquirida") throw new Error("Reserva inicial não adquirida.");

    await db.insert(schema.compromissos).values({
      compromissoId: "cmp_1",
      userId: "user_1",
      empresa: "Empresa A",
      contato: "",
      telefone: "",
      objetivo: "",
      endereco: "",
      dataIso: "2026-08-31",
      hora: "",
      minutos: 60,
      status: "aberto",
      relatoId: "",
      criadoEm: "2026-08-31T10:00:00.000Z",
      atualizadoEm: "2026-08-31T10:00:00.000Z",
    });

    await concluirCriacaoRelato(
      {
        relato: {
          relatoId: reserva.relatoId,
          userId: "user_1",
          clientId: "mobile_3",
          transcricao: "Visitei a Empresa A.",
          empresa: "empresa a",
          contato: "",
          cargo: "",
          telefone: "",
          resumo: "",
          objecao: "",
          proximaAcao: "",
          dataIso: "",
          hora: "",
          temperatura: "morna",
          faltouPerguntar: [],
          followup: "",
          precisaConfirmar: false,
          campoAConfirmar: "",
          audioIninteligivel: false,
          tags: [],
          concorrentes: [],
          numeros: [],
          evidencia: {},
          confianca: {},
          revisado: false,
          camposARevisar: [],
          tipoVisita: "prospeccao",
          roteiro: [],
          promptVersao: "",
          modelo: "",
          tokensInput: 0,
          tokensOutput: 0,
          duracaoMs: 0,
          cacheKey: "",
          createdAt: "2026-08-31T12:00:01.000Z",
        },
        claim: { clientId: "mobile_3", claimToken: reserva.claimToken },
        agora: "2026-08-31T12:00:01.000Z",
      },
      db,
    );

    expect(await db.select().from(schema.relatos)).toHaveLength(1);
    expect((await db.select().from(schema.criacoesRelato))[0]?.status).toBe("concluido");
    const compromisso = (await db.select().from(schema.compromissos))[0];
    expect(compromisso?.status).toBe("feito");
    expect(compromisso?.relatoId).toBe(reserva.relatoId);
  });
});
