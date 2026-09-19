import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ModalRadarProximidade from "../modal-radar-proximidade";
import type { EventoAgenda } from "../../lib/api";

const EVENTOS_FICTICIOS: EventoAgenda[] = [
  {
    id: "ev-1",
    relato_id: "rel-1",
    titulo: "AgroSol S.A.",
    contato: "Carlos Mendes",
    telefone: "(41) 98888-1111",
    dia: "2026-09-14",
    hora: "09:00",
    minutos: 60,
    detalhe: "alinhamento de proposta",
    local: "Av. das Araucárias 1000, Batel, Curitiba - PR",
    selo: "Visita de alinhamento",
    origem: "relato",
    temperatura: "quente",
    objecao: "achou caro em relação ao concorrente",
    concluido: true,
    cancelado: false,
    link_google: "",
  },
  {
    id: "ev-2",
    relato_id: "rel-2",
    titulo: "Cooperativa Pioneira",
    contato: "Fernanda Costa",
    telefone: "(43) 97777-2222",
    dia: "2026-09-14",
    hora: "14:00",
    minutos: 60,
    detalhe: "demonstração técnica",
    local: "Rodovia Celso Garcia 500, Londrina - PR",
    selo: "Demonstração técnica",
    origem: "compromisso",
    temperatura: "morna",
    concluido: false,
    cancelado: false,
    link_google: "",
  },
];

const SEM_DATA_FICTICIOS: EventoAgenda[] = [
  {
    id: "sd-1",
    relato_id: "rel-3",
    titulo: "Distribuidora Vale Verde",
    contato: "Mariana Souza",
    telefone: "(41) 99999-3333",
    dia: "2026-08-25",
    hora: "",
    minutos: 60,
    detalhe: "precisa de retorno sobre prazo de entrega",
    local: "Rua Marechal Deodoro 200, Centro, Curitiba - PR",
    selo: "Retomada de proposta",
    origem: "relato",
    temperatura: "quente",
    concluido: false,
    cancelado: false,
    link_google: "",
  },
];

describe("ModalRadarProximidade", () => {
  test("renderiza dialog acessível com título semântico e cabeçalho", () => {
    const html = renderToStaticMarkup(
      <ModalRadarProximidade
        eventosAgenda={EVENTOS_FICTICIOS}
        semData={SEM_DATA_FICTICIOS}
        hojeIso="2026-09-14"
        onFechar={() => {}}
        onAgendarEncaixe={() => {}}
      />,
    );

    expect(html).toContain('<dialog open="" class="radar-modal" aria-labelledby="radar-titulo"');
    expect(html).toContain('id="radar-titulo"');
    expect(html).toContain("Clientes por Perto &amp; Encaixe de Visitas");
  });

  test("renderiza candidatos com score de prioridade, botões de rota e agendar encaixe", () => {
    const html = renderToStaticMarkup(
      <ModalRadarProximidade
        eventosAgenda={EVENTOS_FICTICIOS}
        semData={SEM_DATA_FICTICIOS}
        hojeIso="2026-09-14"
        onFechar={() => {}}
        onAgendarEncaixe={() => {}}
      />,
    );

    // Contém as empresas candidatas
    expect(html).toContain("AgroSol S.A.");
    expect(html).toContain("Distribuidora Vale Verde");

    // Badges de score
    expect(html).toContain("radar-score-badge");
    expect(html).toContain("Score ");

    // Botões de navegação GPS (Waze e Maps)
    expect(html).toContain("waze.com/ul");
    expect(html).toContain("google.com/maps/search");

    // Botão de agendar encaixe
    expect(html).toContain("radar-btn-agendar");
    expect(html).toContain("Agendar Encaixe");
  });

  test("exibe atalhos rápidos com base nos compromissos do dia", () => {
    const html = renderToStaticMarkup(
      <ModalRadarProximidade
        eventosAgenda={EVENTOS_FICTICIOS}
        semData={SEM_DATA_FICTICIOS}
        hojeIso="2026-09-14"
        onFechar={() => {}}
        onAgendarEncaixe={() => {}}
      />,
    );

    expect(html).toContain("Perto de:");
    expect(html).toContain("AgroSol S.A.");
    expect(html).toContain("Cooperativa Pioneira");
    expect(html).toContain("Toda a carteira");
  });

  test("renderiza botão de Cheat Sheet quando onAbrirCheatSheet é fornecido", () => {
    const html = renderToStaticMarkup(
      <ModalRadarProximidade
        eventosAgenda={EVENTOS_FICTICIOS}
        semData={SEM_DATA_FICTICIOS}
        hojeIso="2026-09-14"
        onFechar={() => {}}
        onAgendarEncaixe={() => {}}
        onAbrirCheatSheet={() => {}}
      />,
    );

    expect(html).toContain("btn-cheat-sheet");
    expect(html).toContain("Cheat Sheet");
  });
});
