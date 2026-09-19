import { describe, expect, it } from "bun:test";
import {
  gerarCheatSheetVisita,
  inferirTipoVisita,
} from "../cheat-sheet";
import type { EventoAgenda } from "../api";

describe("Mini-Checklist Pré-Visita & Cheat Sheet (cheat-sheet.ts)", () => {
  describe("inferirTipoVisita", () => {
    it("infere corretamente os tipos de visita", () => {
      expect(inferirTipoVisita("Assinar contrato e fechamento")).toBe("fechamento");
      expect(inferirTipoVisita("Apresentar segunda proposta de retorno")).toBe("retorno");
      expect(inferirTipoVisita("Acompanhar entrega e pós-venda")).toBe("posvenda");
      expect(inferirTipoVisita("Mapear decisores da fábrica")).toBe("prospeccao");
    });
  });

  describe("gerarCheatSheetVisita", () => {
    it("gera cheat sheet básica com links e checklist essencial", () => {
      const evento: EventoAgenda = {
        id: "ev-1",
        relato_id: "rel-1",
        origem: "compromisso",
        titulo: "Metalúrgica Paraná",
        contato: "Ricardo Silveira",
        telefone: "41999998888",
        local: "Rua das Indústrias 500, Curitiba - PR",
        dia: "2026-09-14",
        hora: "10:30",
        minutos: 60,
        detalhe: "Primeira apresentação institucional",
        selo: "prospecção",
        concluido: false,
        cancelado: false,
        link_google: "",
      };

      const cs = gerarCheatSheetVisita(evento, [], "2026-09-14");

      expect(cs.empresa).toBe("Metalúrgica Paraná");
      expect(cs.contato).toBe("Ricardo Silveira");
      expect(cs.primeiroNome).toBe("Ricardo");
      expect(cs.hora).toBe("10:30");
      expect(cs.tipoVisita).toBe("prospeccao");
      expect(cs.linkWaze).toContain("waze.com/ul");
      expect(cs.linkMaps).toContain("google.com/maps/search");
      expect(cs.linkWhatsApp).toContain("wa.me");

      // Checklist com perguntas do roteiro
      expect(cs.checklist.length).toBeGreaterThanOrEqual(3);
      expect(cs.checklist.length).toBeLessThanOrEqual(5);
      expect(cs.checklist.some((item) => item.essencial)).toBe(true);
    });

    it("identifica objeção e fornece contra-argumento tático de contorno", () => {
      const evento: EventoAgenda = {
        id: "ev-2",
        relato_id: "rel-2",
        origem: "relato",
        titulo: "AgroSol S.A.",
        contato: "Marcos Lima",
        telefone: "43988887777",
        local: "Rodovia Celso Garcia, Londrina - PR",
        dia: "2026-09-14",
        hora: "14:00",
        minutos: 60,
        detalhe: "Alinhar desconto da proposta",
        selo: "retorno",
        objecao: "achou o preço 20% acima do orçamento atual",
        concluido: false,
        cancelado: false,
        link_google: "",
      };

      const cs = gerarCheatSheetVisita(evento, [], "2026-09-14");

      expect(cs.objecaoConhecida).toBeDefined();
      expect(cs.objecaoConhecida?.categoria).toBe("preco");
      expect(cs.objecaoConhecida?.rotulo).toContain("Preço");
      expect(cs.objecaoConhecida?.contraArgumentoRecomendado).toBeTruthy();
      expect(cs.objecaoConhecida?.perguntaDestravamento).toBeTruthy();
    });

    it("resgata histórico recente da mesma empresa a partir da base geral", () => {
      const eventoAtual: EventoAgenda = {
        id: "ev-atual",
        relato_id: "rel-atual",
        origem: "compromisso",
        titulo: "Cooperativa Vale Fertilizantes",
        contato: "Juliana Silva",
        telefone: "41977776666",
        local: "Curitiba - PR",
        dia: "2026-09-14",
        hora: "16:00",
        minutos: 60,
        detalhe: "Reunião de fechamento com diretoria",
        selo: "fechamento",
        concluido: false,
        cancelado: false,
        link_google: "",
      };

      const historicoAnterior: EventoAgenda[] = [
        {
          id: "ev-anterior",
          relato_id: "rel-anterior",
          origem: "relato",
          titulo: "Cooperativa Vale Fertilizantes",
          contato: "Juliana Silva",
          telefone: "41977776666",
          local: "Curitiba - PR",
          dia: "2026-08-30",
          hora: "11:00",
          minutos: 60,
          detalhe: "Aprovou a parte técnica mas pediu validação com compras",
          selo: "visita",
          objecao: "concorrente ofereceu prazo de 60 dias",
          concluido: true,
          cancelado: false,
          link_google: "",
        },
      ];

      const cs = gerarCheatSheetVisita(eventoAtual, historicoAnterior, "2026-09-14");

      expect(cs.ultimaConversa).toBe(
        "Aprovou a parte técnica mas pediu validação com compras",
      );
      expect(cs.dataUltimaConversa).toBe("2026-08-30");
      expect(cs.diasSemContato).toBe(15);
      expect(cs.objecaoConhecida?.categoria).toBe("concorrente");
    });
  });
});
