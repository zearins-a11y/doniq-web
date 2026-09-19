/**
 * Camada 2 do portão: o VALOR extraído tem de estar dentro da evidência citada.
 * Regressão do bug em que o modelo citava um trecho verdadeiro e escrevia
 * ao lado dele um nome que ninguém falou.
 */
import { expect, test } from "bun:test";
import { camposParaRevisar, normalizarRelato, valorAncorado } from "../validators";

const HOJE = "2026-08-04";
const FALA = "estive hoje no hospital sao lucas e falei com o marcelo gerente de compras";

/* ------------------------------------------------ valorAncorado, unitário */

test("valor idêntico ao trecho passa", () => {
  expect(valorAncorado("Hospital São Lucas", "estive hoje no hospital sao lucas")).toBe(true);
});

test("acento e caixa não reprovam", () => {
  expect(valorAncorado("hospital sao lucas", "no Hospital São Lucas, hoje")).toBe(true);
});

test("valor inventado com trecho verdadeiro reprova", () => {
  expect(valorAncorado("Hospital Santa Marta", "estive hoje no hospital sao lucas")).toBe(false);
});

test("uma só palavra fora da evidência já reprova", () => {
  expect(valorAncorado("Hospital São Lucas Zona Sul", "estive hoje no hospital sao lucas")).toBe(false);
});

test("palavra parcial não conta como presente", () => {
  // "lucas" não pode ser dado por presente porque existe "lucasville" no trecho
  expect(valorAncorado("Lucas", "passei em lucasville hoje")).toBe(false);
});

test("valor vazio não é alucinação", () => {
  expect(valorAncorado("", "qualquer coisa")).toBe(true);
});

test("sigla curta exige aparecer literal", () => {
  expect(valorAncorado("3M", "comprei da 3m semana passada")).toBe(true);
  expect(valorAncorado("3M", "comprei da johnson semana passada")).toBe(false);
});

test("trecho vazio reprova valor preenchido", () => {
  expect(valorAncorado("Acme", "")).toBe(false);
});

/* ------------------------------------------------ integração no relato */

test("empresa inventada com evidência verdadeira é zerada", () => {
  const bruto = {
    empresa: "Hospital Santa Marta", // nunca dito
    contato: "Marcelo",
    resumo: "visita de acompanhamento",
    data_iso: HOJE,
    evidencia: {
      empresa: "estive hoje no hospital sao lucas", // trecho verdadeiro
      contato: "falei com o marcelo",
    },
    confianca: { empresa: "alta", contato: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.empresa).toBe("");
  expect(r.confianca.empresa).toBe("vazio");
  expect(r.evidencia.empresa).toBe("");
});

test("o motivo chega ao vendedor na ficha", () => {
  const bruto = {
    empresa: "Hospital Santa Marta",
    resumo: "x",
    data_iso: HOJE,
    evidencia: { empresa: "estive hoje no hospital sao lucas" },
    confianca: { empresa: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.precisa_confirmar).toBe(true);
  expect(r.campo_a_confirmar).toContain("empresa");
  expect(r.campo_a_confirmar).toContain("não foi dito");
});

test("cargo inventado é zerado sem derrubar o resto", () => {
  const bruto = {
    empresa: "Hospital São Lucas",
    contato: "Marcelo",
    cargo: "Diretor Clínico", // dito foi "gerente de compras"
    resumo: "visita boa",
    data_iso: HOJE,
    evidencia: {
      empresa: "no hospital sao lucas",
      contato: "falei com o marcelo",
      cargo: "o marcelo gerente de compras",
    },
    confianca: { empresa: "alta", contato: "alta", cargo: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.cargo).toBe("");
  expect(r.empresa).toBe("Hospital São Lucas");
  expect(r.contato).toBe("Marcelo");
  expect(r.confianca.empresa).toBe("alta");
  expect(r.confianca.contato).toBe("alta");
});

test("campo de interpretação continua podendo resumir", () => {
  const fala = "ele disse que o preco ta salgado comparado com o concorrente";
  const bruto = {
    empresa: "Acme",
    resumo: "x",
    objecao: "preço acima do concorrente",
    data_iso: HOJE,
    evidencia: {
      empresa: "acme",
      objecao: "o preco ta salgado comparado com o concorrente",
    },
    confianca: { empresa: "media", objecao: "alta" },
  };
  const r = normalizarRelato(bruto, `${HOJE}`, "passei na acme hoje, " + fala);
  expect(r.objecao).toBe("preço acima do concorrente");
  expect(r.confianca.objecao).toBe("alta");
});

test("valor ancorado mantém a confiança declarada pelo modelo", () => {
  const bruto = {
    empresa: "Hospital São Lucas",
    resumo: "x",
    data_iso: HOJE,
    evidencia: { empresa: "estive hoje no hospital sao lucas" },
    confianca: { empresa: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, FALA);
  expect(r.empresa).toBe("Hospital São Lucas");
  expect(r.confianca.empresa).toBe("alta");
  expect(camposParaRevisar(r)).not.toContain("empresa");
});
