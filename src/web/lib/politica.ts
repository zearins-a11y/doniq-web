/**
 * Ponte de compatibilidade.
 *
 * Os fatos da política moram em `src/shared/politica.ts` desde que o app móvel
 * passou a ter a própria tela de privacidade: web e celular precisam recitar a
 * mesma política, e duas cópias do mesmo texto viram, com o tempo, duas
 * políticas diferentes — a errada sempre é a que o titular leu.
 *
 * Este arquivo continua existindo só para as telas da web que já importavam daqui.
 */

export * from "../../shared/politica";
