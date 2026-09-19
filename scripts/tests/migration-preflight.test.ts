import { describe, expect, test } from "bun:test";
import {
  evaluateMigrationPreflight,
  extractSchemaOperations,
  type MigrationDefinition,
  type SchemaInventory,
} from "../lib/migration-preflight";

const migrations: MigrationDefinition[] = [
  {
    tag: "0000_base",
    when: 100,
    hash: "hash-base",
    sql: `
      CREATE TABLE relatos (relato_id text PRIMARY KEY);
      CREATE INDEX relatos_id_idx ON relatos (relato_id);
    `,
  },
  {
    tag: "0001_tokens",
    when: 200,
    hash: "hash-tokens",
    sql: `
      ALTER TABLE relatos ADD COLUMN tokens_input integer DEFAULT 0 NOT NULL;
      ALTER TABLE relatos ADD COLUMN tokens_output integer DEFAULT 0 NOT NULL;
    `,
  },
  {
    tag: "0002_reparo",
    when: 300,
    hash: "hash-reparo",
    sql: `
      ALTER TABLE relatos ADD tokens_output integer DEFAULT 0 NOT NULL;
      CREATE TABLE criacoes_relato (criacao_id text PRIMARY KEY);
    `,
  },
];

function inventory(input?: {
  tables?: string[];
  indexes?: string[];
  columns?: Record<string, string[]>;
}): SchemaInventory {
  return {
    tables: new Set(input?.tables ?? []),
    indexes: new Set(input?.indexes ?? []),
    columns: new Map(
      Object.entries(input?.columns ?? {}).map(([table, columns]) => [table, new Set(columns)]),
    ),
  };
}

describe("preflight de migrações", () => {
  test("extrai tabelas, índices e colunas com e sem COLUMN", () => {
    const parsed = extractSchemaOperations(migrations[2]!);

    expect(parsed.unsupportedStatements).toEqual([]);
    expect(parsed.operations).toEqual([
      { kind: "column", table: "relatos", name: "tokens_output", migration: "0002_reparo" },
      { kind: "table", name: "criacoes_relato", migration: "0002_reparo" },
      {
        kind: "column",
        table: "criacoes_relato",
        name: "criacao_id",
        migration: "0002_reparo",
      },
    ]);
  });

  test("bloqueia banco vazio quando migrações pendentes recriam a mesma coluna", () => {
    const result = evaluateMigrationPreflight({
      migrations,
      records: [],
      inventory: inventory(),
    });

    expect(result.status).toBe("blocked");
    expect(result.conflicts).toContain(
      "coluna relatos.tokens_output (0001_tokens, 0002_reparo)",
    );
    expect(result.pendingMigrations).toEqual(["0000_base", "0001_tokens", "0002_reparo"]);
  });

  test("aprova o estado parcial conhecido quando a migração seguinte completa o schema", () => {
    const result = evaluateMigrationPreflight({
      migrations,
      records: [
        { hash: "hash-base", createdAt: 100 },
        { hash: "hash-tokens", createdAt: 200 },
      ],
      inventory: inventory({
        tables: ["relatos"],
        indexes: ["relatos_id_idx"],
        columns: { relatos: ["relato_id", "tokens_input"] },
      }),
    });

    expect(result.status).toBe("ready");
    expect(result.conflicts).toEqual([]);
    expect(result.missingObjects).toEqual([]);
    expect(result.pendingMigrations).toEqual(["0002_reparo"]);
  });

  test("bloqueia schema aplicado por db:push que colidiria com migrações pendentes", () => {
    const result = evaluateMigrationPreflight({
      migrations,
      records: [{ hash: "hash-base", createdAt: 100 }],
      inventory: inventory({
        tables: ["relatos", "criacoes_relato"],
        indexes: ["relatos_id_idx"],
        columns: { relatos: ["relato_id", "tokens_input", "tokens_output"] },
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.conflicts).toContain("coluna relatos.tokens_input (0001_tokens)");
    expect(result.conflicts).toContain("coluna relatos.tokens_output (0001_tokens)");
    expect(result.conflicts).toContain("tabela criacoes_relato (0002_reparo)");
  });

  test("bloqueia timestamp histórico alterado mesmo quando o hash é conhecido", () => {
    const result = evaluateMigrationPreflight({
      migrations,
      records: [{ hash: "hash-tokens", createdAt: 150 }],
      inventory: inventory(),
    });

    expect(result.status).toBe("blocked");
    expect(result.historyProblems[0]).toContain("0001_tokens");
    expect(result.historyProblems[0]).toContain("timestamp 150");
  });

  test("bloqueia drift quando o histórico está atual mas falta objeto físico", () => {
    const result = evaluateMigrationPreflight({
      migrations,
      records: [
        { hash: "hash-base", createdAt: 100 },
        { hash: "hash-tokens", createdAt: 200 },
        { hash: "hash-reparo", createdAt: 300 },
      ],
      inventory: inventory({
        tables: ["relatos", "criacoes_relato"],
        indexes: [],
        columns: {
          relatos: ["relato_id", "tokens_input", "tokens_output"],
          criacoes_relato: ["criacao_id"],
        },
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingObjects).toEqual(["índice relatos_id_idx"]);
  });
});
