import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ModalCheatSheet from "../modal-cheat-sheet";
import type { CheatSheetVisita } from "../../lib/cheat-sheet";

const CHEAT_SHEET_MOCK: CheatSheetVisita = {
  id: "cs-teste",
  empresa: "Indústrias Metalúrgicas Guaíra",
  contato: "Eduardo Souza",
  primeiroNome: "Eduardo",
  telefone: "41999991234",
  endereco: "Av. das Araucárias 2500, Araucária - PR",
  hora: "14:30",
  dia: "2026-09-14",
  objetivo: "Apresentar proposta comercial e defender prazo de entrega",
  tipoVisita: "retorno",
  diasSemContato: 12,
  ultimaConversa: "Gostou do teste das amostras mas pediu desconto de 5%",
  dataUltimaConversa: "2026-09-02",
  objecaoConhecida: {
    categoria: "preco",
    rotulo: "Preço, Orçamento & ROI",
    textoOriginal: "achou preço alto em relação ao concorrente",
    diagnostico: "Cliente sensível a custo e comparando diretamente com concorrente local.",
    contraArgumentoRecomendado: "Destaque o custo por peça usinada e garantia de reposição imediata.",
    perguntaDestravamento: "Se garantirmos o prazo em 48h, o valor atual atende ao seu planejamento?",
  },
  checklist: [
    {
      id: "chk-1",
      pergunta: "Qual o prazo final de decisão da diretoria?",
      essencial: true,
    },
    {
      id: "chk-2",
      pergunta: "Quem mais precisa assinar a ordem de compra?",
      essencial: true,
    },
    {
      id: "chk-3",
      pergunta: "Qual o volume mensal estimado?",
      essencial: false,
    },
  ],
  linkWaze: "https://waze.com/ul?q=Araucaria",
  linkMaps: "https://maps.google.com/?q=Araucaria",
  linkWhatsApp: "https://wa.me/5541999991234?text=Ola",
};

describe("ModalCheatSheet Component", () => {
  test("renderiza dialog acessível com título semântico da empresa", () => {
    const html = renderToStaticMarkup(
      <ModalCheatSheet
        cheatSheet={CHEAT_SHEET_MOCK}
        onFechar={() => {}}
      />,
    );

    expect(html).toContain('<dialog open="" class="cheat-sheet-modal" aria-labelledby="cheat-sheet-titulo"');
    expect(html).toContain('id="cheat-sheet-titulo"');
    expect(html).toContain("Indústrias Metalúrgicas Guaíra");
    expect(html).toContain("14:30");
  });

  test("renderiza contexto recente, objeção ativa e script de contorno", () => {
    const html = renderToStaticMarkup(
      <ModalCheatSheet
        cheatSheet={CHEAT_SHEET_MOCK}
        onFechar={() => {}}
      />,
    );

    // Histórico da última conversa
    expect(html).toContain("Gostou do teste das amostras");
    expect(html).toContain("12 dias atrás");

    // Objeção e script
    expect(html).toContain("Preço, Orçamento &amp; ROI");
    expect(html).toContain("Destaque o custo por peça usinada");
    expect(html).toContain("Se garantirmos o prazo em 48h");
  });

  test("renderiza itens do checklist interativo com badges obrigatórios e botões de navegação", () => {
    const html = renderToStaticMarkup(
      <ModalCheatSheet
        cheatSheet={CHEAT_SHEET_MOCK}
        onFechar={() => {}}
      />,
    );

    expect(html).toContain("Qual o prazo final de decisão da diretoria?");
    expect(html).toContain("OBRIGATÓRIO");
    expect(html).toContain("Quem mais precisa assinar a ordem de compra?");

    // Links de navegação e WhatsApp
    expect(html).toContain("waze.com/ul");
    expect(html).toContain("maps.google.com");
    expect(html).toContain("wa.me/5541999991234");
  });
});
