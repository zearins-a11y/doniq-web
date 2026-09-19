import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Agenda: compromisso marcado na mão e token do feed .ics.
 *
 * `compromissos` é tabela separada de propósito. Relato é prova do que
 * aconteceu; compromisso é intenção. Se intenção entrasse em `relatos`, o painel
 * do gestor passaria a contar visita que ninguém fez, o histórico misturaria as
 * duas coisas e a exportação para CRM mandaria promessa como fato.
 *
 * `status`: "aberto" (marcado), "feito" (visitado — normalmente com relatoId
 * preenchido), "cancelado" (continua na tabela para o feed poder mandar
 * STATUS:CANCELLED e o evento sumir da agenda de quem já sincronizou).
 */
export const compromissos = sqliteTable(
  "compromissos",
  {
    compromissoId: text("compromisso_id").primaryKey(),
    userId: text("user_id").notNull(),
    empresa: text("empresa").notNull().default(""),
    contato: text("contato").notNull().default(""),
    telefone: text("telefone").notNull().default(""),
    /** O que se vai fazer lá. Cai no corpo do evento no calendário. */
    objetivo: text("objetivo").notNull().default(""),
    endereco: text("endereco").notNull().default(""),
    /** YYYY-MM-DD no fuso do vendedor. */
    dataIso: text("data_iso").notNull().default(""),
    /** HH:MM. Vazio = dia inteiro, que é o normal de "passo lá amanhã". */
    hora: text("hora").notNull().default(""),
    minutos: integer("minutos").notNull().default(60),
    status: text("status").notNull().default("aberto"),
    /** Relato gerado a partir deste compromisso, quando a visita foi gravada. */
    relatoId: text("relato_id").notNull().default(""),
    criadoEm: text("criado_em").notNull(),
    atualizadoEm: text("atualizado_em").notNull(),
  },
  (t) => [
    index("compromissos_user_data_idx").on(t.userId, t.dataIso),
    index("compromissos_user_idx").on(t.userId, t.criadoEm),
  ],
);

/**
 * Token do feed de calendário. Uma linha por usuário.
 *
 * O feed é URL sem login — é a única coisa que Google Calendar e Outlook
 * conseguem consumir de calendário externo. Então o segredo é a própria URL:
 * token de 32 bytes aleatórios, e botão de revogar na tela (gera outro, o antigo
 * morre na hora). O que o feed carrega: empresa, contato, telefone, próxima ação.
 * O que ele nunca carrega: transcrição e áudio.
 */
export const feedsAgenda = sqliteTable(
  "feeds_agenda",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull(),
    /** Última vez que um cliente de calendário buscou — a tela mostra isso. */
    ultimoAcessoEm: text("ultimo_acesso_em").notNull().default(""),
    acessos: integer("acessos").notNull().default(0),
    criadoEm: text("criado_em").notNull(),
  },
  (t) => [uniqueIndex("feeds_agenda_user_idx").on(t.userId)],
);
