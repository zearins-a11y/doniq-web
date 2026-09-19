import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Lista de espera da landing "em breve" — sem login, sem oRPC (POST público
 * simples, igual à transcrição de áudio). E-mail único: quem reenvia o
 * formulário (duplo clique, aba recarregada) não vira duas linhas.
 */
export const listaEspera = sqliteTable(
  "lista_espera",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    segmento: text("segmento").notNull().default(""),
    criadoEm: text("criado_em").notNull(),
  },
  (t) => [uniqueIndex("lista_espera_email_idx").on(t.email)],
);
