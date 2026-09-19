import { describe, expect, it } from "bun:test";
import {
  calcularScoreEncaixe,
  extrairPrimeiroNome,
  extrairRegiaoOuCidade,
  filtrarCandidatosEncaixe,
  gerarMensagemEncaixe,
  normalizarTexto,
} from "../radar-proximidade";
import type { EventoAgenda } from "../api";

describe("Radar de Proximidade & Encaixe de Agenda Comercial", () => {
  describe("normalizarTexto & extrairPrimeiroNome", () => {
    it("normaliza textos removendo acentos e espaços", () => {
      expect(normalizarTexto("Maringá")).toBe("maringa");
      expect(normalizarTexto("São José dos Pinhais - PR")).toBe("sao jose dos pinhais - pr");
    });

    it("extrai primeiro nome do contato", () => {
      expect(extrairPrimeiroNome("Carlos Roberto")).toBe("Carlos");
      expect(extrairPrimeiroNome("MARIA CLARA")).toBe("Maria");
      expect(extrairPrimeiroNome("")).toBe("");
    });
  });

  describe("extrairRegiaoOuCidade", () => {
    it("extrai cidade de endereços formatados", () => {
      expect(
        extrairRegiaoOuCidade("Rua das Flores 123, Batel, Curitiba - PR", "Loja Alfa"),
      ).toBe("Curitiba");

      expect(
        extrairRegiaoOuCidade("", "Cooperativa Terra Forte (Londrina)"),
      ).toBe("Londrina");

      expect(
        extrairRegiaoOuCidade("", "Madeireira Sul - Cascavel"),
      ).toBe("Cascavel");
    });

    it("retorna fallback se não houver dados de localização", () => {
      expect(extrairRegiaoOuCidade("", "")).toBe("Região comercial");
    });
  });

  describe("calcularScoreEncaixe", () => {
    it("concede score alto para lead quente com afinidade geográfica e tempo ideal de retorno", () => {
      const score = calcularScoreEncaixe("quente", 15, false, true);
      // Base: 20 + 35 (quente) + 20 (dias 10-35) + 25 (afinidade) = 100
      expect(score).toBe(100);
    });

    it("concede score moderado para lead morno sem afinidade", () => {
      const score = calcularScoreEncaixe("morna", 8, true, false);
      // 20 + 20 (morna) + 15 (objecao) + 10 (dias >=5) = 65
      expect(score).toBe(65);
    });
  });

  describe("gerarMensagemEncaixe", () => {
    it("gera mensagem com primeiro nome e contexto de ação", () => {
      const msg = gerarMensagemEncaixe(
        "Roberto Silva",
        "Metalúrgica Alfa",
        "Apresentar nova tabela",
        "CIC Curitiba",
      );
      expect(msg).toContain("Oi Roberto!");
      expect(msg).toContain("CIC Curitiba");
      expect(msg).toContain("apresentar nova tabela");
      expect(msg).toContain("café rápido");
    });

    it("gera mensagem genérica amigável quando não há ação específica", () => {
      const msg = gerarMensagemEncaixe("Ana", "AgroSol", "", "Centro");
      expect(msg).toContain("Oi Ana!");
      expect(msg).toContain("AgroSol");
      expect(msg).toContain("dar um pulo rápido aí antes do almoço");
    });
  });

  describe("filtrarCandidatosEncaixe", () => {
    const ev1: EventoAgenda = {
      id: "ev:1",
      origem: "relato",
      dia: "2026-09-01",
      hora: "",
      minutos: 60,
      titulo: "Agro Sol - Londrina",
      detalhe: "Cotar defensivos",
      contato: "Eduardo Souza",
      telefone: "43999991111",
      local: "Rodovia Celso Garcia, km 12, Londrina",
      relato_id: "relato-1",
      concluido: true,
      cancelado: false,
      selo: "relato",
      link_google: "",
      temperatura: "quente",
    };

    const ev2: EventoAgenda = {
      id: "ev:2",
      origem: "compromisso",
      dia: "2026-08-20",
      hora: "",
      minutos: 60,
      titulo: "Ferragens Brasil",
      detalhe: "Retomar negociação de fixadores",
      contato: "Marcos Lima",
      telefone: "41988882222",
      local: "Rua Marechal Deodoro 500, Curitiba",
      relato_id: "",
      concluido: false,
      cancelado: false,
      selo: "compromisso",
      link_google: "",
      temperatura: "morna",
      objecao: "Preço alto",
    };

    it("prioriza candidato com afinidade geográfica da pesquisa", () => {
      const hoje = "2026-09-14";
      const candidatosLondrina = filtrarCandidatosEncaixe([ev1, ev2], [], "Londrina", hoje);

      expect(candidatosLondrina.length).toBeGreaterThan(0);
      expect(candidatosLondrina[0].empresa).toBe("Agro Sol - Londrina");
      expect(candidatosLondrina[0].scorePrioridade).toBeGreaterThanOrEqual(90);
      expect(candidatosLondrina[0].linkMaps).toContain("google.com/maps");
      expect(candidatosLondrina[0].linkWaze).toContain("waze.com/ul");
      expect(candidatosLondrina[0].mensagemWhatsApp).toContain("Oi Eduardo!");
    });

    it("ordena múltiplos candidatos pelo score comercial", () => {
      const hoje = "2026-09-14";
      const todos = filtrarCandidatosEncaixe([ev1, ev2], [], "", hoje);

      expect(todos.length).toBe(2);
      // Agro Sol é lead quente -> score maior
      expect(todos[0].scorePrioridade).toBeGreaterThanOrEqual(todos[1].scorePrioridade);
    });
  });
});
