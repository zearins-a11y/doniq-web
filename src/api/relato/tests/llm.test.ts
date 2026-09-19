/** Extração de JSON: as respostas tortas que o modelo devolve na vida real. */
import { expect, test } from "bun:test";
import { ErroLLM, extrairJson } from "../llm";

type Qualquer = Record<string, unknown>;

test("json puro", () => {
  expect(extrairJson('{"empresa":"Acme"}')).toEqual({ empresa: "Acme" });
});

test("cerca markdown", () => {
  expect((extrairJson('```json\n{"empresa":"Acme"}\n```') as Qualquer).empresa).toBe("Acme");
});

test("preâmbulo conversacional", () => {
  expect((extrairJson('Claro! Aqui está:\n{"empresa":"Acme"}') as Qualquer).empresa).toBe("Acme");
});

test("truncado por max_tokens", () => {
  const cru = '{"empresa": "Acme", "faltou_perguntar": ["quem decide?"';
  expect((extrairJson(cru) as Qualquer).faltou_perguntar).toEqual(["quem decide?"]);
});

test("truncado no meio de uma string", () => {
  const cru = '{"empresa": "Acme", "resumo": "cliente pediu propos';
  expect((extrairJson(cru) as Qualquer).empresa).toBe("Acme");
});

test("objeto aninhado truncado", () => {
  const cru = '{"empresa":"A","evidencia":{"empresa":"passei na A"';
  expect(((extrairJson(cru) as Qualquer).evidencia as Qualquer).empresa).toBe("passei na A");
});

test("sem json levanta erro", () => {
  expect(() => extrairJson("desculpe, não consigo ajudar com isso")).toThrow(ErroLLM);
});

/** Cache semântico: hash SHA-256 da transcrição + userId. */
import { cacheKey } from "../llm";

test("cacheKey: mesma entrada gera mesma chave", () => {
  const k1 = cacheKey("falei com o Marcelo do CME", "user_abc");
  const k2 = cacheKey("falei com o Marcelo do CME", "user_abc");
  expect(k1).toBe(k2);
});

test("cacheKey: transcrição diferente gera chave diferente", () => {
  const k1 = cacheKey("falei com o Marcelo", "user_abc");
  const k2 = cacheKey("falei com a Ana", "user_abc");
  expect(k1).not.toBe(k2);
});

test("cacheKey: usuário diferente gera chave diferente", () => {
  const k1 = cacheKey("falei com o Marcelo", "user_abc");
  const k2 = cacheKey("falei com o Marcelo", "user_xyz");
  expect(k1).not.toBe(k2);
});

test("cacheKey: tamanho fixo de 32 caracteres (hex)", () => {
  const k = cacheKey("qualquer texto longo que vier", "user_teste");
  expect(k).toHaveLength(32);
  expect(k).toMatch(/^[0-9a-f]+$/);
});

test("cacheKey: espaços e case são significativos", () => {
  const k1 = cacheKey("Falei com o Marcelo", "user_abc");
  const k2 = cacheKey("falei com o marcelo", "user_abc");
  expect(k1).not.toBe(k2);
});
