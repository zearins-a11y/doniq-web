/**
 * Datas são o ponto onde este produto quebra silenciosamente: o modelo devolve
 * '12/06/2026', o banco guarda a string, e a agenda de amanhã nunca encontra nada.
 */
import { describe, expect, test } from "bun:test";
import { normalizarData, normalizarHora } from "../validators";

const HOJE = "2026-08-04"; // terça

describe("normalizarData", () => {
  test.each([
    ["2026-08-12", "2026-08-12"],
    ["12/08/2026", "2026-08-12"],
    ["12-08-2026", "2026-08-12"],
    ["12/08/26", "2026-08-12"],
    ["12/08", "2026-08-12"], // sem ano: próximo futuro
    ["2026-8-9", "2026-08-09"],
  ])("formato aceito: %p -> %p", (entrada, esperado) => {
    expect(normalizarData(entrada, HOJE)).toBe(esperado);
  });

  test.each([
    "",
    null,
    "próximo dia 12",
    "semana que vem",
    "2026-13-45",
    "31/02/2026",
    "não informado",
    "N/A",
    "2019-01-01", // passado distante
    "2030-01-01", // além de 2 anos
  ])("lixo vira vazio: %p", (entrada) => {
    expect(normalizarData(entrada, HOJE)).toBe("");
  });

  test("virada de ano: 'dia 05' dito em 28/12 aponta para janeiro do ano seguinte", () => {
    expect(normalizarData("05/01", "2026-12-28")).toBe("2027-01-05");
  });

  test("data de ontem ainda passa", () => {
    expect(normalizarData("2026-08-03", HOJE)).toBe("2026-08-03");
  });
});

describe("normalizarHora", () => {
  test.each([
    ["14h", "14:00"],
    ["14:30", "14:30"],
    ["9h15", "09:15"],
    ["09:00", "09:00"],
    ["", ""],
    ["25:00", ""],
    ["meio-dia", ""],
  ])("%p -> %p", (entrada, esperado) => {
    expect(normalizarHora(entrada)).toBe(esperado);
  });
});
