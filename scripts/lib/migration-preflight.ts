export type MigrationDefinition = {
  tag: string;
  when: number;
  hash: string;
  sql: string;
};

export type MigrationRecord = {
  hash: string;
  createdAt: number;
};

export type SchemaInventory = {
  tables: Set<string>;
  indexes: Set<string>;
  columns: Map<string, Set<string>>;
};

type SchemaOperation =
  | { kind: "table"; name: string; migration: string }
  | { kind: "index"; name: string; migration: string }
  | { kind: "column"; table: string; name: string; migration: string };

export type PreflightResult = {
  ok: boolean;
  status: "current" | "ready" | "blocked";
  lastAppliedAt: number | null;
  pendingMigrations: string[];
  conflicts: string[];
  missingObjects: string[];
  historyProblems: string[];
  unsupportedStatements: string[];
};

function schemaOperationKey(operation: SchemaOperation): string {
  if (operation.kind === "column") return `coluna ${operation.table}.${operation.name}`;
  return `${operation.kind === "table" ? "tabela" : "índice"} ${operation.name}`;
}

function schemaHasOperation(inventory: SchemaInventory, operation: SchemaOperation): boolean {
  if (operation.kind === "table") return inventory.tables.has(operation.name);
  if (operation.kind === "index") return inventory.indexes.has(operation.name);
  return inventory.columns.get(operation.table)?.has(operation.name) ?? false;
}

export function extractSchemaOperations(migration: MigrationDefinition): {
  operations: SchemaOperation[];
  unsupportedStatements: string[];
} {
  const operations: SchemaOperation[] = [];
  const unsupportedStatements: string[] = [];

  for (const fragment of migration.sql.split(";")) {
    const statement = fragment.replaceAll(/--.*$/gm, "").trim();
    if (!statement) continue;

    const createTable = statement.match(
      /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?/i,
    );
    if (createTable?.[1]) {
      const table = createTable[1];
      operations.push({ kind: "table", name: table, migration: migration.tag });

      const body = statement.slice(statement.indexOf("(") + 1, statement.lastIndexOf(")"));
      const constraints = new Set(["CHECK", "CONSTRAINT", "FOREIGN", "PRIMARY", "UNIQUE"]);
      for (const column of body.matchAll(
        /(?:^|,)\s*(?:[`"]([A-Za-z_][A-Za-z0-9_]*)[`"]|([A-Za-z_][A-Za-z0-9_]*))\s+/g,
      )) {
        const name = column[1] ?? column[2];
        if (name && !constraints.has(name.toUpperCase())) {
          operations.push({ kind: "column", table, name, migration: migration.tag });
        }
      }
      continue;
    }

    const createIndex = statement.match(
      /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?/i,
    );
    if (createIndex?.[1]) {
      operations.push({ kind: "index", name: createIndex[1], migration: migration.tag });
      continue;
    }

    const addColumn = statement.match(
      /^ALTER\s+TABLE\s+[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?\s+ADD(?:\s+COLUMN)?\s+[`"]?([A-Za-z_][A-Za-z0-9_]*)[`"]?/i,
    );
    if (addColumn?.[1] && addColumn[2]) {
      operations.push({
        kind: "column",
        table: addColumn[1],
        name: addColumn[2],
        migration: migration.tag,
      });
      continue;
    }

    if (/^(?:ALTER|CREATE|DROP)\s/i.test(statement)) {
      unsupportedStatements.push(
        `${migration.tag}: ${statement.replaceAll(/\s+/g, " ").slice(0, 160)}`,
      );
    }
  }

  return { operations, unsupportedStatements };
}

export function evaluateMigrationPreflight(input: {
  migrations: MigrationDefinition[];
  records: MigrationRecord[];
  inventory: SchemaInventory;
}): PreflightResult {
  const migrations = [...input.migrations].sort((a, b) => a.when - b.when);
  const records = [...input.records].sort((a, b) => a.createdAt - b.createdAt);
  const lastAppliedAt = records.at(-1)?.createdAt ?? null;
  const historyProblems: string[] = [];

  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index]!.when <= migrations[index - 1]!.when) {
      historyProblems.push("O journal local não está em ordem cronológica estrita.");
      break;
    }
  }

  for (const record of records) {
    const exactMigration = migrations.find(
      (migration) => migration.when === record.createdAt && migration.hash === record.hash,
    );
    if (exactMigration) continue;

    const sameHash = migrations.find((migration) => migration.hash === record.hash);
    if (sameHash) {
      historyProblems.push(
        `A migração ${sameHash.tag} está registrada com timestamp ${record.createdAt}, mas o código usa ${sameHash.when}.`,
      );
    } else {
      historyProblems.push(
        `O banco contém uma migração desconhecida com timestamp ${record.createdAt}.`,
      );
    }
  }

  const latestLocalAt = migrations.at(-1)?.when ?? null;
  if (lastAppliedAt !== null && latestLocalAt !== null && lastAppliedAt > latestLocalAt) {
    historyProblems.push(
      `O banco está à frente deste código: ${lastAppliedAt} é posterior à última migração local ${latestLocalAt}.`,
    );
  }

  const parsed = migrations.map((migration) => ({
    migration,
    ...extractSchemaOperations(migration),
  }));
  const unsupportedStatements = parsed.flatMap((item) => item.unsupportedStatements);
  const pending = parsed.filter(
    (item) => lastAppliedAt === null || item.migration.when > lastAppliedAt,
  );
  const pendingOperationMigrations = new Map<string, string[]>();
  for (const item of pending) {
    for (const operation of item.operations) {
      const key = schemaOperationKey(operation);
      const migrationTags = pendingOperationMigrations.get(key) ?? [];
      migrationTags.push(item.migration.tag);
      pendingOperationMigrations.set(key, migrationTags);
    }
  }
  const pendingKeys = new Set(
    pending.flatMap((item) => item.operations.map((operation) => schemaOperationKey(operation))),
  );

  const conflicts = [
    ...new Set(
      [
        ...pending.flatMap((item) =>
          item.operations
            .filter((operation) => schemaHasOperation(input.inventory, operation))
            .map((operation) => `${schemaOperationKey(operation)} (${operation.migration})`),
        ),
        ...[...pendingOperationMigrations]
          .filter(([, migrationTags]) => migrationTags.length > 1)
          .map(([key, migrationTags]) => `${key} (${migrationTags.join(", ")})`),
      ],
    ),
  ];

  const allOperations = new Map<string, SchemaOperation>();
  for (const item of parsed) {
    for (const operation of item.operations)
      allOperations.set(schemaOperationKey(operation), operation);
  }

  const missingObjects = [...allOperations]
    .filter(
      ([key, operation]) =>
        !pendingKeys.has(key) && !schemaHasOperation(input.inventory, operation),
    )
    .map(([key]) => key);

  const pendingMigrations = pending.map((item) => item.migration.tag);
  const ok =
    historyProblems.length === 0 &&
    unsupportedStatements.length === 0 &&
    conflicts.length === 0 &&
    missingObjects.length === 0;

  return {
    ok,
    status: ok ? (pendingMigrations.length === 0 ? "current" : "ready") : "blocked",
    lastAppliedAt,
    pendingMigrations,
    conflicts,
    missingObjects,
    historyProblems,
    unsupportedStatements,
  };
}
