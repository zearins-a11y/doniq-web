import { describe, expect, it } from "bun:test";
import {
  formatarDataPorExtenso,
  gerarBriefingMatinal,
  primeiroNome,
} from "../briefing-matinal";
import type { EventoAgenda } from "../api";

describe("Briefing Matinal de Vendas (Daily Field Briefing)", () => {
  describe("formatarDataPorExtenso & primeiroNome", () => {
    it("formata datas por extenso corretamente em português", () => {
      expect(formatarDataPorExtenso("2026-09-14")).toBe("Segunda-feira, 14 de setembro");
      expect(formatarDataPorExtenso("2026-09-15")).toBe("Terça-feira, 15 de setembro");
      expect(formatarDataPorExtenso("2026-10-01")).toBe("Quinta-feira, 1 de outubro");
      expect(formatarDataPorExtenso("")).toBe("Hoje");
    });

    it("extrai primeiro nome formatado", () => {
      expect(primeiroNome("Carlos Eduardo")).toBe("Carlos");
      expect(primeiroNome("MARIA CLARA")).toBe("Maria");
      expect(primeiroNome("")).toBe("");
      expect(primeiroNome(undefined)).toBe("");
    });
  });

  describe("gerarBriefingMatinal", () => {
    it("gera briefing para dia sem compromissos e com carteira em dia", () => {
      const b = gerarBriefingMatinal({
        hojeIso: "2026-09-14",
        horaAtual: "08:30",
        usuarioNome: "Roberto Silva",
        eventosDoDia: [],
        semData: [],
      });

      expect(b.saudacao).toBe("Bom dia, Roberto!");
      expect(b.totalHoje).toBe(0);
      expect(b.primeiroCompromisso).toBeNull();
      expect(b.totalEsfriando).toBe(0);
      expect(b.resumoLinha).toBe("0 compromissos hoje");
      expect(b.scriptVoz).toContain("Você não tem visitas marcadas na agenda para hoje");
      expect(b.scriptVoz).toContain("Seu SLA comercial está em dia");
      expect(b.tempoEstimadoSegundos).toBeGreaterThanOrEqual(15);
    });

    it("gera briefing com 1 compromisso e alerta de lead esfriando", () => {
      const eventoHoje: EventoAgenda = {
        id: "comp:1",
        origem: "compromisso",
        dia: "2026-09-14",
        hora: "10:00",
        minutos: 60,
        titulo: "AgroSol Distribuidora",
        detalhe: "Apresentação da nova linha de defensivos",
        contato: "Marcos Souza",
        telefone: "41999998888",
        local: "Rodovia BR-277, km 105",
        relato_id: "",
        concluido: false,
        cancelado: false,
        selo: "compromisso",
        link_google: "",
      };

      // Lead quente registrado há 6 dias (ultrapassou SLA de 5 dias -> crítico)
      const leadEsfriando: EventoAgenda = {
        id: "relato:10",
        origem: "relato",
        dia: "2026-09-08",
        hora: "",
        minutos: 60,
        titulo: "Cooperativa Terra Forte",
        detalhe: "Enviar cotação de 500 sacas",
        contato: "Juliana Mendes",
        telefone: "41988887777",
        local: "",
        relato_id: "relato-10",
        concluido: true,
        cancelado: false,
        selo: "relato",
        link_google: "",
        temperatura: "quente",
      };

      const b = gerarBriefingMatinal({
        hojeIso: "2026-09-14",
        horaAtual: "07:45",
        usuarioNome: "Ana Paula",
        eventosDoDia: [eventoHoje],
        semData: [leadEsfriando],
      });

      expect(b.saudacao).toBe("Bom dia, Ana!");
      expect(b.totalHoje).toBe(1);
      expect(b.primeiroCompromisso?.titulo).toBe("AgroSol Distribuidora");
      expect(b.primeiroCompromisso?.hora).toBe("10:00");
      expect(b.totalEsfriando).toBe(1);
      expect(b.leadsEsfriando[0]?.evento.titulo).toBe("Cooperativa Terra Forte");
      expect(b.leadsEsfriando[0]?.diag.gravidade).toBe("critico");
      expect(b.resumoLinha).toBe("1 compromisso hoje · 1 lead esfriando");

      expect(b.scriptVoz).toContain("Você tem 1 compromisso na sua rota: às 10:00 na AgroSol Distribuidora com Marcos Souza");
      expect(b.scriptVoz).toContain("Rodovia BR-277, km 105");
      expect(b.scriptVoz).toContain("Cooperativa Terra Forte");
      expect(b.scriptVoz).toContain("WhatsApp rápido antes do meio-dia");
    });

    it("ordena múltiplos compromissos cronologicamente e saúda à tarde", () => {
      const ev1: EventoAgenda = {
        id: "comp:tarde",
        origem: "compromisso",
        dia: "2026-09-14",
        hora: "15:30",
        minutos: 60,
        titulo: "Fazenda Primavera",
        detalhe: "Renovação de contrato",
        contato: "Eduardo",
        telefone: "",
        local: "",
        relato_id: "",
        concluido: false,
        cancelado: false,
        selo: "compromisso",
        link_google: "",
      };

      const ev2: EventoAgenda = {
        id: "comp:manha",
        origem: "compromisso",
        dia: "2026-09-14",
        hora: "13:00",
        minutos: 60,
        titulo: "Laticínios Vale Real",
        detalhe: "Alinhamento técnico",
        contato: "Renata",
        telefone: "",
        local: "",
        relato_id: "",
        concluido: false,
        cancelado: false,
        selo: "compromisso",
        link_google: "",
      };

      const b = gerarBriefingMatinal({
        hojeIso: "2026-09-14",
        horaAtual: "12:30",
        usuarioNome: "Felipe",
        eventosDoDia: [ev1, ev2],
        semData: [],
      });

      expect(b.saudacao).toBe("Boa tarde, Felipe!");
      expect(b.totalHoje).toBe(2);
      expect(b.compromissosHoje[0].titulo).toBe("Laticínios Vale Real"); // 13:00 antes de 15:30
      expect(b.compromissosHoje[1].titulo).toBe("Fazenda Primavera");
      expect(b.primeiroCompromisso?.titulo).toBe("Laticínios Vale Real");
      expect(b.scriptVoz).toContain("Você tem 2 compromissos agendados para hoje");
      expect(b.scriptVoz).toContain("Seu primeiro compromisso é às 13:00 na Laticínios Vale Real com Renata");
      expect(b.scriptVoz).toContain("Fazenda Primavera");
    });
  });
});
