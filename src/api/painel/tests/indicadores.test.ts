/**
 * Painel do gestor: número errado aqui é pior que número nenhum, porque vira
 * conversa de avaliação. O dia de referência entra por parâmetro, então o teste
 * manda no calendário.
 */
import { expect, test } from "bun:test";
import {
  diaDoRelato,
  lacunasFrequentes,
  montarPainel,
  normalizarTexto,
  objecoesFrequentes,
  porVendedor,
  visitasPorPeriodo,
} from "../indicadores";

const HOJE = "2026-08-10";

/* ------------------------------------------------ dia do relato */

test("o dia da visita é o dia em que a ficha foi gravada", () => {
  expect(diaDoRelato({ created_at: "2026-08-09T12:00:00Z" })).toBe("2026-08-09");
});

test("data_iso é prazo do próximo passo e não pode virar dia da visita", () => {
  // Caso real que quebrou o painel: visita gravada hoje, proposta prometida para
  // a semana que vem. Contar pelo prazo mostrava zero visita na semana.
  const r = { data_iso: "2026-08-17", created_at: "2026-08-10T18:00:00Z" };
  expect(diaDoRelato(r)).toBe("2026-08-10");
  expect(visitasPorPeriodo([r], HOJE).semana).toBe(1);
});

test("visita gravada de noite conta no dia do vendedor, não no dia do servidor", () => {
  // 01:56 UTC de 11/08 é 22:56 de 10/08 no Brasil: a visita é de segunda, não de terça.
  expect(diaDoRelato({ created_at: "2026-08-11T01:56:00Z" })).toBe("2026-08-10");
  expect(visitasPorPeriodo([{ created_at: "2026-08-11T01:56:00Z" }], "2026-08-10").semana).toBe(1);
});

test("sem created_at válido não se inventa dia", () => {
  expect(diaDoRelato({})).toBe("");
  expect(diaDoRelato({ created_at: "" })).toBe("");
  expect(diaDoRelato({ created_at: "10/08/2026" })).toBe("");
  expect(diaDoRelato({ created_at: 20260810 })).toBe("");
  expect(diaDoRelato({ data_iso: "2026-08-04" })).toBe("");
});

/* ------------------------------------------------ janelas */

test("as janelas de 7 e 30 dias incluem hoje e a borda", () => {
  const relatos = [
    { created_at: `${HOJE}T09:00:00Z` },
    { created_at: "2026-08-04T09:00:00Z" }, // hoje-6, última da semana
    { created_at: "2026-08-03T09:00:00Z" }, // hoje-7, fora da semana, dentro do mês
    { created_at: "2026-07-12T09:00:00Z" }, // hoje-29, última do mês
    { created_at: "2026-07-11T09:00:00Z" }, // hoje-30, fora do mês
  ];
  const c = visitasPorPeriodo(relatos, HOJE);
  expect(c.semana).toBe(2);
  expect(c.mes).toBe(4);
  expect(c.total).toBe(5);
});

test("ficha com data à frente de hoje não entra na conta", () => {
  const c = visitasPorPeriodo(
    [{ created_at: "2026-08-20T09:00:00Z" }, { created_at: `${HOJE}T09:00:00Z` }],
    HOJE,
  );
  expect(c.semana).toBe(1);
  expect(c.mes).toBe(1);
});

test("relato sem data nenhuma não entra em janela, mas continua no total", () => {
  const c = visitasPorPeriodo([{}, { created_at: `${HOJE}T09:00:00Z` }], HOJE);
  expect(c.semana).toBe(1);
  expect(c.total).toBe(2);
});

/* ------------------------------------------------ por vendedor */

const membros = [
  { user_id: "v1", nome: "Ana" },
  { user_id: "v2", nome: "Bruno" },
  { user_id: "v3", nome: "" },
];

test("vendedor sem nenhuma visita continua na lista: silêncio é o que o gestor precisa ver", () => {
  const linhas = porVendedor([{ user_id: "v1", created_at: `${HOJE}T09:00:00Z` }], membros, HOJE);
  expect(linhas.length).toBe(3);
  const bruno = linhas.find((l) => l.user_id === "v2");
  expect(bruno?.semana).toBe(0);
  expect(bruno?.total).toBe(0);
  expect(bruno?.ultima_visita).toBe("");
});

test("cada linha conta só as visitas do próprio vendedor", () => {
  const relatos = [
    { user_id: "v1", created_at: `${HOJE}T09:00:00Z` },
    { user_id: "v1", created_at: "2026-08-08T09:00:00Z" },
    { user_id: "v2", created_at: "2026-07-20T09:00:00Z" },
  ];
  const linhas = porVendedor(relatos, membros, HOJE);
  const ana = linhas.find((l) => l.user_id === "v1");
  const bruno = linhas.find((l) => l.user_id === "v2");
  expect(ana?.semana).toBe(2);
  expect(ana?.ultima_visita).toBe(HOJE);
  expect(bruno?.semana).toBe(0);
  expect(bruno?.mes).toBe(1);
});

test("sem nome cadastrado a linha mostra o id, nunca vazio", () => {
  const linhas = porVendedor([], membros, HOJE);
  expect(linhas.find((l) => l.user_id === "v3")?.nome).toBe("v3");
});

test("a ordem é por visitas no mês, empate resolvido pelo nome", () => {
  const relatos = [
    { user_id: "v2", created_at: `${HOJE}T09:00:00Z` },
    { user_id: "v2", created_at: `${HOJE}T09:00:00Z` },
  ];
  const linhas = porVendedor(relatos, membros, HOJE);
  expect(linhas[0]?.user_id).toBe("v2");
  expect(linhas[1]?.nome).toBe("Ana");
});

/* ------------------------------------------------ agrupamento de texto */

test("agrupar ignora caixa, acento e ponto final", () => {
  expect(normalizarTexto("Preço alto.")).toBe(normalizarTexto("preco alto"));
  expect(normalizarTexto("  PRAZO   de   entrega ")).toBe("prazo de entrega");
});

test("objeções iguais escritas diferente viram uma linha só, com a primeira grafia", () => {
  const r = objecoesFrequentes([
    { objecao: "Preço alto" },
    { objecao: "preço alto." },
    { objecao: "PREÇO ALTO" },
    { objecao: "Prazo de entrega" },
    { objecao: "" },
    {},
  ]);
  expect(r.length).toBe(2);
  expect(r[0]).toEqual({
    texto: "Preço alto",
    vezes: 3,
    categoria: "preco",
    rotulo_categoria: "Preço, Orçamento & ROI",
    cor: "amber",
  });
  expect(r[1]?.vezes).toBe(1);
});

test("o limite do ranking é respeitado", () => {
  const relatos = Array.from({ length: 12 }, (_, i) => ({ objecao: `objecao ${i}` }));
  expect(objecoesFrequentes(relatos, 3).length).toBe(3);
});

test("perguntas que faltaram somam a equipe inteira, item por item", () => {
  const r = lacunasFrequentes([
    { faltou_perguntar: ["prazo de pagamento", "quem decide"] },
    { faltou_perguntar: ["Prazo de pagamento."] },
    { faltou_perguntar: "não é lista" },
    { faltou_perguntar: [123, "quem decide"] },
    {},
  ]);
  expect(r[0]).toEqual({ texto: "prazo de pagamento", vezes: 2 });
  expect(r.find((x) => x.texto === "quem decide")?.vezes).toBe(2);
});

/* ------------------------------------------------ painel inteiro */

test("o painel junta tudo e conta quem sumiu na semana", () => {
  const relatos = [
    { user_id: "v1", created_at: `${HOJE}T09:00:00Z`, objecao: "Preço alto", faltou_perguntar: ["quem decide"] },
    { user_id: "v1", created_at: "2026-08-09T09:00:00Z", objecao: "preço alto" },
    { user_id: "v2", created_at: "2026-07-15T09:00:00Z", objecao: "Sem verba" },
  ];
  const p = montarPainel(relatos, membros, HOJE);
  expect(p.hoje).toBe(HOJE);
  expect(p.equipe.semana).toBe(2);
  expect(p.equipe.mes).toBe(3);
  expect(p.vendedores.length).toBe(3);
  expect(p.objecoes[0]?.vezes).toBe(2);
  expect(p.distribuicao_objecoes.length).toBe(1);
  expect(p.distribuicao_objecoes[0]?.categoria).toBe("preco");
  expect(p.distribuicao_objecoes[0]?.percentual).toBe(100);
  expect(p.lacunas[0]?.texto).toBe("quem decide");
  expect(p.sem_visita_na_semana).toBe(2); // v2 e v3
});

test("painel de equipe sem relato nenhum não quebra e não mente", () => {
  const p = montarPainel([], membros, HOJE);
  expect(p.equipe).toEqual({ semana: 0, mes: 0, total: 0 });
  expect(p.objecoes).toEqual([]);
  expect(p.lacunas).toEqual([]);
  expect(p.sem_visita_na_semana).toBe(3);
});
