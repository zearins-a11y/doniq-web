/**
 * Roteiro por tipo de visita.
 *
 * O que estes testes protegem:
 *   - o roteiro nunca fica longo demais para ser usado em pé, na porta do cliente;
 *   - o item horizontal nunca é cortado em favor do item de nicho;
 *   - cobertura é prova, não palpite: item marcado como coberto tem campo na ficha
 *     ou assunto na fala. Dizer ao vendedor que ele perguntou o que não perguntou
 *     é pior do que não dizer nada.
 */
import { expect, test } from "bun:test";
import {
  CAMPOS_RESPOSTA,
  COTA_RAMO,
  ITENS_BASE,
  LIMITE_ROTEIRO,
  TIPOS_VISITA,
  TIPO_PADRAO,
  avaliarRoteiro,
  cobertura,
  listarTiposVisita,
  montarRoteiro,
  normalizar,
  obterTipo,
  perguntasDoRoteiro,
  tipoValido,
} from "../checklist";
import { VERTICAIS } from "../verticais";

/* ------------------------------------------------ catálogo de tipos */

test("todo tipo de visita tem id igual à chave, rótulo e a dica de quando usar", () => {
  for (const [chave, t] of Object.entries(TIPOS_VISITA)) {
    expect(t.id).toBe(chave);
    expect(t.rotulo.length).toBeGreaterThan(3);
    expect(t.quando.length).toBeGreaterThan(10);
  }
});

test("tipo desconhecido, vazio ou hostil cai no padrão em vez de quebrar", () => {
  for (const entrada of ["", "   ", "xpto", null, undefined, 7, "__proto__", "constructor"]) {
    expect(tipoValido(entrada)).toBe(TIPO_PADRAO);
    expect(obterTipo(entrada).id).toBe(TIPO_PADRAO);
  }
});

test("id de tipo é normalizado por caixa e espaço", () => {
  expect(tipoValido(" Prospeccao ")).toBe("prospeccao");
});

test("o seletor recebe todos os tipos", () => {
  expect(listarTiposVisita().map((t) => t.id)).toEqual(Object.keys(TIPOS_VISITA));
});

/* ------------------------------------------------ integridade dos itens */

test("item de roteiro tem id único, pergunta em forma de pergunta e pelo menos um sinal", () => {
  const todos = [...ITENS_BASE, ...Object.values(VERTICAIS).flatMap((v) => v.itens)];
  const ids = todos.map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const item of todos) {
    expect(item.id).toMatch(/^[a-z0-9_]+$/);
    expect(item.pergunta.endsWith("?")).toBe(true);
    expect(item.sinais.length).toBeGreaterThan(0);
    const tipos = Object.entries(item.tipos);
    expect(tipos.length).toBeGreaterThan(0);
    for (const [t, peso] of tipos) {
      expect(Object.hasOwn(TIPOS_VISITA, t)).toBe(true);
      // 0 = essencial, nunca cortado; 3 = bom ter, cai primeiro. Fora disso é erro de digitação.
      expect(peso).toBeGreaterThanOrEqual(0);
      expect(peso).toBeLessThanOrEqual(3);
      expect(Number.isInteger(peso)).toBe(true);
    }
    if (item.campo) expect(CAMPOS_RESPOSTA).toContain(item.campo);
  }
});

test("todo tipo de visita cobra o próximo passo: visita sem próximo passo não aconteceu", () => {
  for (const tipo of Object.keys(TIPOS_VISITA)) {
    expect(montarRoteiro("geral", tipo).map((i) => i.id)).toContain("proximo_passo");
  }
});

/* ------------------------------------------------ montagem do roteiro */

test("nenhum roteiro passa do teto, em nenhuma combinação de ramo e tipo", () => {
  for (const ramo of Object.keys(VERTICAIS)) {
    for (const tipo of Object.keys(TIPOS_VISITA)) {
      const r = montarRoteiro(ramo, tipo);
      expect(r.length).toBeGreaterThan(2);
      expect(r.length).toBeLessThanOrEqual(LIMITE_ROTEIRO);
    }
  }
});

test("a ordem é: horizontal, depois o do ramo, e o essencial fechando a visita", () => {
  const ids = montarRoteiro("opme", "prospeccao").map((i) => i.id);
  const doRamo = ids.filter((id) => id.startsWith("opme_"));
  const horizontais = ids.filter((id) => !id.startsWith("opme_") && id !== "proximo_passo");
  // nenhum item de ramo aparece antes de um horizontal não-essencial
  expect(ids.indexOf(doRamo[0] as string)).toBeGreaterThan(
    ids.indexOf(horizontais[horizontais.length - 1] as string),
  );
  // e a última pergunta é sempre o combinado com data — é assim que se encerra visita
  expect(ids[ids.length - 1]).toBe("proximo_passo");
});

test("o ramo tem cota garantida: teto apertado corta horizontal, não o vocabulário do ramo", () => {
  for (const ramo of ["opme", "agro", "seguros", "imoveis", "consorcio"]) {
    for (const tipo of Object.keys(TIPOS_VISITA)) {
      const disponiveis = VERTICAIS[ramo]?.itens.filter((i) => Object.hasOwn(i.tipos, tipo)).length ?? 0;
      const usados = montarRoteiro(ramo, tipo).filter((i) => i.id.startsWith(`${ramo}_`)).length;
      expect(usados).toBeGreaterThanOrEqual(Math.min(disponiveis, COTA_RAMO));
    }
  }
});

test("cada tipo pede coisa diferente — senão o seletor era decoração", () => {
  const prospeccao = montarRoteiro("opme", "prospeccao").map((i) => i.id);
  const posvenda = montarRoteiro("opme", "posvenda").map((i) => i.id);
  expect(prospeccao).not.toEqual(posvenda);
  expect(prospeccao).toContain("situacao_hoje");
  expect(posvenda).toContain("recompra");
  expect(posvenda).not.toContain("situacao_hoje");
});

test("o ramo entra com o vocabulário dele; o geral fica só no roteiro base", () => {
  expect(perguntasDoRoteiro("opme", "retorno").join(" ")).toContain("consignado");
  expect(perguntasDoRoteiro("agro", "fechamento").join(" ")).toContain("barter");
  expect(perguntasDoRoteiro("seguros", "prospeccao").join(" ")).toContain("vidas");
  const geral = montarRoteiro("geral", "prospeccao");
  expect(geral.every((i) => ITENS_BASE.includes(i))).toBe(true);
});

test("ramo e tipo inválidos ainda devolvem um roteiro utilizável", () => {
  const r = montarRoteiro("xpto", "nada disso");
  expect(r).toEqual(montarRoteiro("geral", TIPO_PADRAO));
  expect(r.length).toBeGreaterThan(2);
});

test("não há pergunta repetida dentro do mesmo roteiro", () => {
  for (const ramo of Object.keys(VERTICAIS)) {
    for (const tipo of Object.keys(TIPOS_VISITA)) {
      const p = perguntasDoRoteiro(ramo, tipo);
      expect(new Set(p).size).toBe(p.length);
    }
  }
});

/* ------------------------------------------------ cobertura */

test("campo preenchido na ficha cobre o item, e a origem é a ficha", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const pontos = avaliarRoteiro(itens, {
    transcricao: "",
    ficha: { proxima_acao: "Enviar proposta na segunda" },
  });
  const p = pontos.find((x) => x.id === "proximo_passo");
  expect(p?.coberto).toBe(true);
  expect(p?.como).toBe("ficha");
});

test("lista preenchida também cobre: números e concorrentes contam", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const pontos = avaliarRoteiro(itens, {
    transcricao: "",
    ficha: { numeros: ["40 unidades/mês"], concorrentes: ["Medstar"] },
  });
  expect(pontos.find((x) => x.id === "volume")?.coberto).toBe(true);
  expect(pontos.find((x) => x.id === "situacao_hoje")?.coberto).toBe(true);
});

test("lista vazia não cobre nada — array existir não é resposta", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const pontos = avaliarRoteiro(itens, { transcricao: "", ficha: { numeros: [], concorrentes: [] } });
  expect(pontos.find((x) => x.id === "volume")?.coberto).toBe(false);
  expect(pontos.find((x) => x.id === "volume")?.como).toBe("");
});

test("assunto citado na fala cobre o item mesmo sem campo na ficha", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const pontos = avaliarRoteiro(itens, {
    transcricao: "perguntei quem decide junto com ele e ele falou que o diretor participa",
    ficha: {},
  });
  const p = pontos.find((x) => x.id === "quem_decide");
  expect(p?.coberto).toBe(true);
  expect(p?.como).toBe("fala");
});

test("acento e caixa na fala não escondem o assunto", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const comAcento = avaliarRoteiro(itens, { transcricao: "falou de ORÇAMENTO aprovado", ficha: {} });
  const semAcento = avaliarRoteiro(itens, { transcricao: "falou de orcamento aprovado", ficha: {} });
  expect(comAcento.find((x) => x.id === "orcamento")?.coberto).toBe(true);
  expect(semAcento.find((x) => x.id === "orcamento")?.coberto).toBe(true);
});

test("visita sem nada dito deixa tudo em aberto, sem inventar cobertura", () => {
  const itens = montarRoteiro("opme", "retorno");
  const pontos = avaliarRoteiro(itens, { transcricao: "", ficha: {} });
  expect(pontos.every((p) => !p.coberto && p.como === "")).toBe(true);
  expect(pontos).toHaveLength(itens.length);
});

test("a ficha só conta depois do portão: valor vazio não cobre", () => {
  const itens = montarRoteiro("geral", "retorno");
  const pontos = avaliarRoteiro(itens, { transcricao: "", ficha: { objecao: "", data_iso: "" } });
  expect(pontos.find((x) => x.id === "objecao_aberta")?.coberto).toBe(false);
  expect(pontos.find((x) => x.id === "prazo_decisao")?.coberto).toBe(false);
});

test("a ordem e o tamanho do roteiro sobrevivem à avaliação", () => {
  const itens = montarRoteiro("agro", "fechamento");
  const pontos = avaliarRoteiro(itens, { transcricao: "vamos fechar em barter", ficha: {} });
  expect(pontos.map((p) => p.id)).toEqual(itens.map((i) => i.id));
});

test("a conta de cobertura fecha e o que sobra vira pergunta pra próxima visita", () => {
  const itens = montarRoteiro("geral", "prospeccao");
  const pontos = avaliarRoteiro(itens, {
    transcricao: "eles usam hoje a Medstar e reclamou do prazo",
    ficha: { proxima_acao: "Levar amostra" },
  });
  const c = cobertura(pontos);
  expect(c.total).toBe(pontos.length);
  expect(c.cobertos).toBe(pontos.filter((p) => p.coberto).length);
  expect(c.em_aberto).toHaveLength(c.total - c.cobertos);
  expect(c.percentual).toBe(Math.round((c.cobertos / c.total) * 100));
  expect(c.em_aberto.every((q) => q.endsWith("?"))).toBe(true);
});

test("roteiro vazio não divide por zero", () => {
  expect(cobertura([])).toEqual({ cobertos: 0, total: 0, percentual: 0, em_aberto: [] });
});

test("normalizar deixa a fala comparável sem apagar o conteúdo", () => {
  expect(normalizar("Preço, prazo e GLOSA!")).toBe("preco prazo e glosa");
  expect(normalizar("")).toBe("");
});
