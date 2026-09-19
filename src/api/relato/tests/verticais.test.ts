/**
 * Pacote de vertical: é configuração, não código de nicho.
 * O que estes testes protegem é o contrato — ramo inválido não derruba nada,
 * o vocabulário do ramo nunca é engolido pelo histórico, e o teto do ASR
 * continua respeitado com a lista maior.
 */
import { expect, test } from "bun:test";
import {
  GLOSSARIO_MAX_CHARS,
  montarGlossarioAsr,
  montarSystem,
  termosGlossarioAsr,
} from "../prompts";
import { VERTICAIS, VERTICAL_PADRAO, listarVerticais, obterVertical, verticalValida } from "../verticais";

/* ------------------------------------------------ catálogo */

test("todo ramo tem id igual à chave e os quatro pedaços do pacote", () => {
  for (const [chave, v] of Object.entries(VERTICAIS)) {
    expect(v.id).toBe(chave);
    expect(v.rotulo.length).toBeGreaterThan(3);
    expect(v.contexto.length).toBeGreaterThan(10);
    expect(Array.isArray(v.termos)).toBe(true);
    expect(v.lacunas.length).toBeGreaterThan(0);
    expect(Array.isArray(v.itens)).toBe(true);
  }
});

test("o ramo geral existe e não tem vocabulário nem item próprio", () => {
  expect(VERTICAIS[VERTICAL_PADRAO]).toBeDefined();
  expect(obterVertical(VERTICAL_PADRAO).termos).toHaveLength(0);
  // vazio de propósito: o roteiro do ramo geral é o horizontal, ITENS_BASE.
  expect(obterVertical(VERTICAL_PADRAO).itens).toHaveLength(0);
});

test("todo ramo com vocabulário próprio traz itens de roteiro próprios", () => {
  for (const v of Object.values(VERTICAIS)) {
    if (v.id === VERTICAL_PADRAO) continue;
    expect(v.itens.length).toBeGreaterThan(0);
    for (const item of v.itens) expect(item.id.startsWith(`${v.id}_`)).toBe(true);
  }
});

test("ramo desconhecido, vazio ou hostil cai no padrão", () => {
  for (const entrada of ["", "  ", "xpto", null, undefined, 42, "__proto__", "constructor"]) {
    expect(verticalValida(entrada)).toBe(VERTICAL_PADRAO);
    expect(obterVertical(entrada).id).toBe(VERTICAL_PADRAO);
  }
});

test("id é normalizado por caixa e espaço", () => {
  expect(verticalValida(" OPME ")).toBe("opme");
});

test("o seletor recebe todos os ramos, e só id, rótulo e nome curto", () => {
  const lista = listarVerticais();
  expect(lista.length).toBe(Object.keys(VERTICAIS).length);
  expect(lista.map((x) => x.id)).toContain("opme");
  // quem monta roteiro é montarRoteiro(ramo, tipo); duas fontes de verdade
  // para "o que perguntar" divergiriam na primeira mudança.
  for (const x of lista) expect(Object.keys(x).sort()).toEqual(["curto", "id", "rotulo"]);
});

test("não há termo repetido dentro do mesmo ramo", () => {
  for (const v of Object.values(VERTICAIS)) {
    const norm = v.termos.map((t) => t.toLowerCase());
    expect(new Set(norm).size).toBe(norm.length);
  }
});

/* ------------------------------------------------ glossário do ASR */

test("o ramo entra no glossário mesmo sem cadastro do vendedor", () => {
  const g = montarGlossarioAsr("", [], "opme");
  expect(g).toContain("OPME");
  expect(g).toContain("consignado");
});

test("o vocabulário do ramo vem antes do produto e dos nomes históricos", () => {
  const g = montarGlossarioAsr("ProdutoZX", ["ClienteQY"], "opme");
  expect(g.indexOf("OPME")).toBeLessThan(g.indexOf("ProdutoZX"));
  expect(g.indexOf("ProdutoZX")).toBeLessThan(g.indexOf("ClienteQY"));
});

test("trinta nomes históricos não removem nenhum termo técnico do ramo", () => {
  const nomes = Array.from(
    { length: 30 },
    (_, indice) => `Empresa Cliente Comercial ${indice + 1}`,
  );

  for (const vertical of Object.values(VERTICAIS)) {
    if (vertical.id === VERTICAL_PADRAO) continue;
    const selecionados = termosGlossarioAsr(
      "Equipamentos e soluções comerciais",
      nomes,
      vertical.id,
    );

    for (const termo of vertical.termos) {
      expect(selecionados).toContain(termo);
    }
  }
});

test("o teto de caracteres continua valendo com a lista maior", () => {
  for (const id of Object.keys(VERTICAIS)) {
    const g = montarGlossarioAsr("Produto X", ["Nome Y", "Nome Z"], id);
    expect(g.length).toBeLessThanOrEqual(GLOSSARIO_MAX_CHARS + 1);
  }
});

test("termo duplicado entre vendedor e ramo aparece uma vez só", () => {
  // "consignado" também é do ramo; entra pelo vendedor e não pode repetir.
  // Compara item a item: "reposição de consignado" é outro termo, e deve ficar.
  const g = montarGlossarioAsr("consignado", [], "opme");
  const itens = g
    .replace(/^[^:]+:\s*/, "")
    .replace(/\.$/, "")
    .split(", ")
    .map((t) => t.toLowerCase());
  expect(itens.filter((t) => t === "consignado")).toHaveLength(1);
  expect(new Set(itens).size).toBe(itens.length);
});

test("sem ramo e sem cadastro, o glossário é o texto neutro", () => {
  expect(montarGlossarioAsr("", [], "geral")).toBe(
    "Relato de visita comercial ditado por vendedor de campo no Brasil.",
  );
});

/* ------------------------------------------------ prompt do LLM */

test("o prompt carrega o rótulo e as lacunas do ramo", () => {
  const p = montarSystem("Ana", "implantes", "2026-08-10T14:00:00-03:00", [], "opme");
  expect(p).toContain("Saúde — dispositivos médicos");
  expect(p).toContain("comissão de padronização");
});

test("o ramo não afrouxa a regra anti-alucinação", () => {
  const p = montarSystem("Ana", "implantes", "2026-08-10T14:00:00-03:00", [], "opme");
  expect(p).toContain("REGRA ABSOLUTA");
  expect(p).toContain("termo do ramo que não foi dito não entra no relato");
});

test("sem ramo informado, o prompt usa o geral e continua íntegro", () => {
  const p = montarSystem("Ana", "software", "2026-08-10T14:00:00-03:00", []);
  expect(p).toContain("Vendas externas B2B (geral)");
  expect(p).toContain("orçamento disponível");
});

test("o chip do celular tem nome curto, único e sem parede de texto", () => {
  const vistos = new Set<string>();
  for (const v of listarVerticais()) {
    expect(v.curto.length).toBeGreaterThan(2);
    expect(v.curto.length).toBeLessThanOrEqual(12);
    expect(v.curto).not.toContain("—");
    expect(vistos.has(v.curto)).toBe(false);
    vistos.add(v.curto);
  }
});
