import { createClient, type Client } from "@libsql/client";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  evaluateMigrationPreflight,
  extractSchemaOperations,
  type MigrationDefinition,
  type MigrationRecord,
  type SchemaInventory,
} from "./lib/migration-preflight";

type Journal = {
  entries: Array<{ tag: string; when: number }>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Timestamp de migração inválido: ${String(value)}`);
  return number;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Identificador SQLite inválido no arquivo de migração: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function loadMigrations(): Promise<MigrationDefinition[]> {
  const migrationsFolder = join(import.meta.dir, "../drizzle");
  const journal = (await Bun.file(join(migrationsFolder, "meta/_journal.json")).json()) as Journal;

  return Promise.all(
    journal.entries.map(async (entry) => {
      const sql = await Bun.file(join(migrationsFolder, `${entry.tag}.sql`)).text();
      return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    }),
  );
}

async function inspectDatabase(client: Client, migrations: MigrationDefinition[]) {
  const master = await client.execute(
    "SELECT type, name FROM sqlite_master WHERE type IN ('table', 'index')",
  );
  const tables = new Set<string>();
  const indexes = new Set<string>();

  for (const row of master.rows) {
    const type = asString(row.type);
    const name = asString(row.name);
    if (type === "table") tables.add(name);
    if (type === "index") indexes.add(name);
  }

  const operations = migrations.flatMap(
    (migration) => extractSchemaOperations(migration).operations,
  );
  const inspectedTables = new Set(
    operations.flatMap((operation) => (operation.kind === "column" ? [operation.table] : [])),
  );
  const columns = new Map<string, Set<string>>();

  for (const table of inspectedTables) {
    if (!tables.has(table)) continue;
    const result = await client.execute(`PRAGMA table_info(${quoteIdentifier(table)})`);
    columns.set(table, new Set(result.rows.map((row) => asString(row.name))));
  }

  const records: MigrationRecord[] = [];
  if (tables.has("__drizzle_migrations")) {
    const result = await client.execute(
      'SELECT hash, created_at FROM "__drizzle_migrations" ORDER BY created_at ASC',
    );
    for (const row of result.rows) {
      records.push({ hash: asString(row.hash), createdAt: asNumber(row.created_at) });
    }
  }

  const inventory: SchemaInventory = { tables, indexes, columns };
  return { records, inventory };
}

function printList(title: string, values: string[]) {
  if (values.length === 0) return;
  console.error(`${title}:`);
  const visibleValues = values.slice(0, 12);
  for (const value of visibleValues) console.error(`  - ${value}`);
  if (values.length > visibleValues.length) {
    console.error(`  - ... e mais ${values.length - visibleValues.length}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida no .env da raiz.");

  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });

  try {
    const migrations = await loadMigrations();
    const database = await inspectDatabase(client, migrations);
    const result = evaluateMigrationPreflight({ migrations, ...database });

    if (result.status === "current") {
      console.log("Preflight aprovado: schema e histórico já estão na última migração.");
      return;
    }

    if (result.status === "ready") {
      console.log(
        `Preflight aprovado: ${result.pendingMigrations.length} migração(ões) pendente(s), sem conflito físico.`,
      );
      console.log(`Pendentes: ${result.pendingMigrations.join(", ")}`);
      return;
    }

    console.error("Preflight bloqueado: o schema físico e o histórico de migrações divergem.");
    printList("Problemas no histórico", result.historyProblems);
    printList("Objetos que uma migração pendente tentaria recriar", result.conflicts);
    printList("Objetos esperados que estão ausentes", result.missingObjects);
    printList(
      "Comandos de schema ainda não suportados pelo preflight",
      result.unsupportedStatements,
    );
    console.error("Nenhuma alteração foi feita no banco.");
    console.error("Crie um backup e reconcilie o schema com __drizzle_migrations antes de migrar.");
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Preflight falhou: ${message}`);
  process.exitCode = 1;
});
