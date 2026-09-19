/**
 * Permissão errada é bug invisível: ninguém reclama, e um dia o vendedor lê a
 * carteira do colega. Estes testes fixam quem pode o quê antes de existir rota.
 */
import { expect, test } from "bun:test";
import {
  PAPEIS,
  PAPEL_PADRAO,
  escopoDeLeitura,
  papelValido,
  podeConvidar,
  podeRemover,
  podeSair,
  podeVerPainel,
} from "../papeis";

const equipe = { equipeId: "eq1", donoUserId: "dono" };
const gestor = { userId: "dono", papel: "gestor" as const };
const outroGestor = { userId: "g2", papel: "gestor" as const };
const vendedor = { userId: "v1", papel: "vendedor" as const };

/* ------------------------------------------------ papel */

test("papel desconhecido cai no papel de menor poder", () => {
  expect(papelValido("gestor")).toBe("gestor");
  expect(papelValido("vendedor")).toBe("vendedor");
  expect(papelValido("admin")).toBe(PAPEL_PADRAO);
  expect(papelValido("")).toBe(PAPEL_PADRAO);
  expect(papelValido(undefined)).toBe(PAPEL_PADRAO);
  expect(papelValido(null)).toBe(PAPEL_PADRAO);
  expect(papelValido(1)).toBe(PAPEL_PADRAO);
  expect(PAPEL_PADRAO).toBe("vendedor");
});

test("o padrão nunca é o papel mais poderoso", () => {
  expect(PAPEIS[0]).toBe("gestor");
  expect(PAPEL_PADRAO).not.toBe("gestor");
});

/* ------------------------------------------------ painel e convite */

test("só gestor vê painel e convida", () => {
  expect(podeVerPainel("gestor")).toBe(true);
  expect(podeVerPainel("vendedor")).toBe(false);
  expect(podeConvidar("gestor")).toBe(true);
  expect(podeConvidar("vendedor")).toBe(false);
});

/* ------------------------------------------------ remover */

test("vendedor não remove ninguém, nem outro vendedor", () => {
  const r = podeRemover(vendedor, "v2", equipe);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivo).toContain("gestor");
});

test("gestor remove vendedor da equipe", () => {
  expect(podeRemover(outroGestor, "v1", equipe).ok).toBe(true);
});

test("ninguém se remove por esta porta: para isso existe sair da equipe", () => {
  const r = podeRemover(outroGestor, "g2", equipe);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivo).toContain("sair");
});

test("o dono da equipe é intocável, mesmo para outro gestor", () => {
  const r = podeRemover(outroGestor, "dono", equipe);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivo).toContain("dono");
});

/* ------------------------------------------------ sair */

test("o dono não sai da própria equipe", () => {
  const r = podeSair(gestor, equipe);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.motivo.length).toBeGreaterThan(10);
});

test("vendedor e gestor convidado podem sair", () => {
  expect(podeSair(vendedor, equipe).ok).toBe(true);
  expect(podeSair(outroGestor, equipe).ok).toBe(true);
});

/* ------------------------------------------------ escopo de leitura */

test("vendedor só lê a si mesmo, mesmo com equipe cheia", () => {
  const ids = escopoDeLeitura(vendedor, [gestor, vendedor, { userId: "v2", papel: "vendedor" }]);
  expect(ids).toEqual(["v1"]);
});

test("gestor lê a equipe inteira e a si mesmo, sem repetir id", () => {
  const ids = escopoDeLeitura(gestor, [gestor, vendedor, { userId: "v2", papel: "vendedor" }]);
  expect(ids.sort()).toEqual(["dono", "v1", "v2"]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("escopo nunca volta vazio: lista vazia em IN viraria todos", () => {
  expect(escopoDeLeitura(gestor, [])).toEqual(["dono"]);
  expect(escopoDeLeitura(vendedor, []).length).toBe(1);
});
