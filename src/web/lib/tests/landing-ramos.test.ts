/**
 * Landing por ramo: a página é pública e o ramo vem da URL, ou seja, de fora.
 * Estes testes protegem duas coisas — o conteúdo prometido existe em cada ramo
 * (nada de seção vazia no ar) e a URL hostil não vira página nem herança de
 * protótipo. A rota de cadastro precisa continuar carregando o ?ramo=, senão o
 * visitante cai no app genérico e a landing perde a razão de existir.
 */
import { expect, test } from "bun:test";
import { VERTICAIS } from "../../../api/relato/verticais";
import { LANDINGS_RAMOS, obterLandingRamo } from "../landing-ramos";

test("cada landing tem id igual à chave e as seções cheias", () => {
  for (const [chave, l] of Object.entries(LANDINGS_RAMOS)) {
    expect(l.id as string).toBe(chave);
    expect(l.titulo.length).toBeGreaterThan(20);
    expect(l.subtitulo.length).toBeGreaterThan(40);
    expect(l.cta.length).toBeGreaterThan(5);
    expect(l.problema.length).toBeGreaterThanOrEqual(3);
    expect(l.provaProduto.length).toBeGreaterThanOrEqual(2);
    expect(l.roteiro.length).toBe(3);
    expect(l.objecoes.length).toBeGreaterThanOrEqual(3);
    expect(l.termos.length).toBeGreaterThanOrEqual(5);
    expect(l.menu.length).toBeGreaterThan(2);
    expect(l.ficha.empresa.length).toBeGreaterThan(3);
    expect(l.ficha.proximaAcao.length).toBeGreaterThan(10);
    expect(l.ficha.faltouPerguntar.endsWith("?")).toBe(true);
  }
});

test("a rota de cadastro leva o ramo na query, para pré-selecionar o perfil", () => {
  for (const [chave, l] of Object.entries(LANDINGS_RAMOS)) {
    expect(l.rotaCadastro).toBe(`/?ramo=${chave}`);
  }
});

test("nenhuma objeção fica sem resposta", () => {
  for (const l of Object.values(LANDINGS_RAMOS)) {
    for (const o of l.objecoes) {
      expect(o.pergunta.endsWith("?")).toBe(true);
      expect(o.resposta.length).toBeGreaterThan(30);
    }
  }
});

test("ramo válido devolve o pacote, com folga de caixa e espaço na URL", () => {
  expect(obterLandingRamo("opme")?.id).toBe("opme");
  expect(obterLandingRamo("OPME")?.id).toBe("opme");
  expect(obterLandingRamo(" agro ")?.id).toBe("agro");
  expect(obterLandingRamo("imoveis")?.id).toBe("imoveis");
  expect(obterLandingRamo("Consorcio")?.id).toBe("consorcio");
});

test("seguros tem landing pública", () => {
  const s = obterLandingRamo("seguros");
  expect(s).not.toBeNull();
  expect(s?.id).toBe("seguros");
  expect(s?.termos).toContain("sinistralidade");
  expect(s?.termos).toContain("apólice");
  expect(s?.status).toBe("ramo pronto no app");
});

test("ramo inexistente ou ausente devolve null em vez de quebrar a página", () => {
  expect(obterLandingRamo("")).toBeNull();
  expect(obterLandingRamo(undefined)).toBeNull();
  expect(obterLandingRamo(null)).toBeNull();
  expect(obterLandingRamo(42)).toBeNull();
  expect(obterLandingRamo("ramo-que-nao-existe")).toBeNull();
});

test("URL hostil não alcança o protótipo do objeto", () => {
  for (const hostil of ["__proto__", "constructor", "prototype", "toString"]) {
    expect(obterLandingRamo(hostil)).toBeNull();
  }
});

test("todo ramo com página de venda existe como ramo no app", () => {
  // landing prometendo vocabulário que o app não tem é propaganda enganosa
  for (const chave of Object.keys(LANDINGS_RAMOS)) {
    expect(VERTICAIS[chave]).toBeDefined();
    expect((VERTICAIS[chave]?.itens.length ?? 0)).toBeGreaterThanOrEqual(5);
  }
});
