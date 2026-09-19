/** O portão anti-alucinação: campo sem lastro na fala não passa sozinho. */
import { expect, test } from "bun:test";
import { camposParaRevisar, evidenciaConfere, normalizarRelato } from "../validators";

const HOJE = "2026-08-04";
const FALA = "passei na cirurgica parana agora e falei com o marcelo do cme";

test("trecho literal passa", () => {
  expect(evidenciaConfere("passei na cirúrgica paraná", FALA)).toBe(true);
});

test("acento e pontuação não atrapalham", () => {
  expect(evidenciaConfere("Cirúrgica Paraná, agora!", FALA)).toBe(true);
});

test("paráfrase não passa", () => {
  expect(evidenciaConfere("o cliente demonstrou interesse", FALA)).toBe(false);
});

test("trecho curto demais não passa", () => {
  expect(evidenciaConfere("na", FALA)).toBe(false);
});

test("campo sem evidência vai para revisão", () => {
  const bruto = {
    empresa: "Hospital Santa Cruz", // não foi dito
    contato: "Marcelo",
    resumo: "conversa boa",
    evidencia: { empresa: "", contato: "falei com o marcelo" },
    confianca: { empresa: "alta", contato: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.confianca.empresa).toBe("baixa");
  expect(r.confianca.contato).toBe("alta");
  expect(camposParaRevisar(r)).toContain("empresa");
});

test("modelo não consegue se autoaprovar", () => {
  // Evidência parafraseada + confiança 'alta' declarada pelo modelo = revisão.
  const bruto = {
    empresa: "Acme",
    resumo: "x",
    evidencia: { empresa: "o vendedor mencionou a empresa Acme" },
    confianca: { empresa: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.confianca.empresa).toBe("baixa");
});
