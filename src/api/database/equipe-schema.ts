import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Equipe: um gestor, vários vendedores.
 *
 * Uma conta pertence a no máximo uma equipe (uniqueIndex em `membros.userId`) —
 * vendedor terceirizado que atende duas empresas é caso real, mas resolver isso
 * agora custaria seletor de contexto em toda tela. Fica explícito como limite.
 *
 * O token do convite é guardado com hash, igual à tabela `sessions`: quem lê o
 * banco não consegue aceitar convite alheio.
 */

export const equipes = sqliteTable(
  "equipes",
  {
    equipeId: text("equipe_id").primaryKey(),
    nome: text("nome").notNull().default(""),
    donoUserId: text("dono_user_id").notNull(),
    criadoEm: text("criado_em").notNull(),
  },
  (t) => [index("equipes_dono_idx").on(t.donoUserId)],
);

export const membros = sqliteTable(
  "membros",
  {
    membroId: text("membro_id").primaryKey(),
    equipeId: text("equipe_id").notNull(),
    userId: text("user_id").notNull(),
    /** "gestor" | "vendedor" — ver PAPEIS em relato/../equipe/papeis.ts */
    papel: text("papel").notNull().default("vendedor"),
    entrouEm: text("entrou_em").notNull(),
  },
  (t) => [
    uniqueIndex("membros_user_idx").on(t.userId),
    index("membros_equipe_idx").on(t.equipeId),
  ],
);

export const convites = sqliteTable(
  "convites",
  {
    conviteId: text("convite_id").primaryKey(),
    equipeId: text("equipe_id").notNull(),
    email: text("email").notNull(),
    papel: text("papel").notNull().default("vendedor"),
    /** HMAC do token. O token em claro só existe na resposta da criação. */
    tokenHash: text("token_hash").notNull(),
    /** "pendente" | "aceito" | "revogado" */
    status: text("status").notNull().default("pendente"),
    criadoPor: text("criado_por").notNull(),
    criadoEm: text("criado_em").notNull(),
    expiraEm: text("expira_em").notNull(),
    aceitoEm: text("aceito_em").notNull().default(""),
    /** Se o e-mail saiu de verdade. Falso quando não há provedor configurado. */
    emailEnviado: text("email_enviado").notNull().default("nao"),
  },
  (t) => [
    uniqueIndex("convites_token_idx").on(t.tokenHash),
    index("convites_equipe_idx").on(t.equipeId),
    index("convites_email_idx").on(t.email),
  ],
);
