import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { PontoRoteiro } from "../relato/checklist";

/**
 * Espelho do modelo do export (MongoDB): coleções `users`, `sessions`, `relatos`.
 * Listas e dicionários viram colunas JSON (`{ mode: "json" }`) para o JSON da API
 * continuar idêntico ao do backend original.
 */

export const users = sqliteTable(
  "users",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    nome: text("nome").notNull().default(""),
    produto: text("produto").notNull().default(""),
    vertical: text("vertical").notNull().default("geral"),
    criadoEm: text("criado_em").notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const relatos = sqliteTable(
  "relatos",
  {
    relatoId: text("relato_id").primaryKey(),
    userId: text("user_id").notNull(),
    clientId: text("client_id"),
    transcricao: text("transcricao").notNull(),
    empresa: text("empresa").notNull().default(""),
    contato: text("contato").notNull().default(""),
    cargo: text("cargo").notNull().default(""),
    telefone: text("telefone").notNull().default(""),
    resumo: text("resumo").notNull().default(""),
    resumoNarrativo: text("resumo_narrativo").notNull().default(""),
    emailCliente: text("email_cliente").notNull().default(""),
    proximasPerguntas: text("proximas_perguntas", { mode: "json" }).$type<string[]>().notNull().default([]),
    objecao: text("objecao").notNull().default(""),
    proximaAcao: text("proxima_acao").notNull().default(""),
    dataIso: text("data_iso").notNull().default(""),
    hora: text("hora").notNull().default(""),
    temperatura: text("temperatura").notNull().default("morna"),
    faltouPerguntar: text("faltou_perguntar", { mode: "json" }).$type<string[]>().notNull().default([]),
    followup: text("followup").notNull().default(""),
    precisaConfirmar: integer("precisa_confirmar", { mode: "boolean" }).notNull().default(false),
    campoAConfirmar: text("campo_a_confirmar").notNull().default(""),
    audioIninteligivel: integer("audio_ininteligivel", { mode: "boolean" }).notNull().default(false),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    concorrentes: text("concorrentes", { mode: "json" }).$type<string[]>().notNull().default([]),
    numeros: text("numeros", { mode: "json" }).$type<string[]>().notNull().default([]),
    evidencia: text("evidencia", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    confianca: text("confianca", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
    revisado: integer("revisado", { mode: "boolean" }).notNull().default(false),
    camposARevisar: text("campos_a_revisar", { mode: "json" }).$type<string[]>().notNull().default([]),
    /** Tipo escolhido ANTES de falar: prospecção, retorno, fechamento, pós-venda. */
    tipoVisita: text("tipo_visita").notNull().default("prospeccao"),
    /**
     * Roteiro avaliado, gravado junto com o relato. É snapshot de propósito:
     * trocar de ramo depois não pode reescrever o que foi cobrado no passado.
     */
    roteiro: text("roteiro", { mode: "json" }).$type<PontoRoteiro[]>().notNull().default([]),
    promptVersao: text("prompt_versao").notNull().default(""),
    modelo: text("modelo").notNull().default(""),
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    duracaoMs: integer("duracao_ms").notNull().default(0),
    cacheKey: text("cache_key").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("relatos_user_created_idx").on(t.userId, t.createdAt),
    index("relatos_user_data_idx").on(t.userId, t.dataIso),
    index("relatos_data_idx").on(t.dataIso),
    index("relatos_user_client_idx").on(t.userId, t.clientId),
  ],
);

export const criacoesRelato = sqliteTable(
  "criacoes_relato",
  {
    criacaoId: text("criacao_id").primaryKey(),
    userId: text("user_id").notNull(),
    clientId: text("client_id").notNull(),
    relatoId: text("relato_id").notNull(),
    status: text("status").notNull().default("processando"),
    claimToken: text("claim_token").notNull(),
    claimExpiraEm: text("claim_expira_em").notNull(),
    erro: text("erro").notNull().default(""),
    criadoEm: text("criado_em").notNull(),
    atualizadoEm: text("atualizado_em").notNull(),
  },
  (t) => [
    uniqueIndex("criacoes_relato_user_client_idx").on(t.userId, t.clientId),
    uniqueIndex("criacoes_relato_relato_idx").on(t.relatoId),
  ],
);



export * from "./auth-schema";

export * from "./crm-schema";

export * from "./equipe-schema";

export * from "./agenda-schema";

export * from "./lista-espera-schema";
