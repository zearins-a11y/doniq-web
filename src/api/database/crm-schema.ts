import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Conectores de CRM (fase 1: Agendor, RD Station CRM, Ollow).
 * `credenciais` guarda o token do cliente cifrado em repouso (AES-256-GCM) —
 * nunca sai do servidor. `mapaCampos` cobre os campos personalizados de cada CRM.
 */
export const integracoes = sqliteTable(
  "integracoes",
  {
    integracaoId: text("integracao_id").primaryKey(),
    userId: text("user_id").notNull(),
    provedor: text("provedor").notNull(),
    credenciais: text("credenciais").notNull(),
    mapaCampos: text("mapa_campos", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    funilId: text("funil_id").notNull().default(""),
    etapaId: text("etapa_id").notNull().default(""),
    ativa: integer("ativa", { mode: "boolean" }).notNull().default(true),
    ultimoTesteEm: text("ultimo_teste_em").notNull().default(""),
    ultimoTesteOk: integer("ultimo_teste_ok", { mode: "boolean" }).notNull().default(false),
    ultimoTesteErro: text("ultimo_teste_erro").notNull().default(""),
    criadoEm: text("criado_em").notNull(),
    atualizadoEm: text("atualizado_em").notNull(),
  },
  (t) => [
    uniqueIndex("integracoes_user_provedor_idx").on(t.userId, t.provedor),
    index("integracoes_user_idx").on(t.userId),
  ],
);

/** Uma linha por (relato, provedor): idempotência e reenvio via PATCH nos ids externos. */
export const sincronizacoes = sqliteTable(
  "sincronizacoes",
  {
    sincronizacaoId: text("sincronizacao_id").primaryKey(),
    relatoId: text("relato_id").notNull(),
    userId: text("user_id").notNull(),
    provedor: text("provedor").notNull(),
    status: text("status").notNull().default("pendente"),
    tentativas: integer("tentativas").notNull().default(0),
    claimToken: text("claim_token").notNull().default(""),
    claimExpiraEm: text("claim_expira_em").notNull().default(""),
    idExterno: text("id_externo", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    erro: text("erro").notNull().default(""),
    payloadEnviado: text("payload_enviado", { mode: "json" }).$type<unknown>(),
    criadoEm: text("criado_em").notNull(),
    atualizadoEm: text("atualizado_em").notNull(),
  },
  (t) => [
    uniqueIndex("sincronizacoes_relato_provedor_idx").on(t.relatoId, t.provedor),
    index("sincronizacoes_user_idx").on(t.userId, t.criadoEm),
  ],
);
