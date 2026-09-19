import { describe, expect, it } from "bun:test";
import {
  gerarLinkWhatsAppRota,
  gerarTextoWhatsAppRota,
  ordenarEventosCronologicamente,
} from "../exportar-rota";
import type { EventoAgenda } from "../api";

describe("Exportação de Rota do Dia de Campo (exportar-rota.ts)", () => {
  const eventos: EventoAgenda[] = [
    {
      id: "ev-tarde",
      relato_id: "rel-1",
      origem: "compromisso",
      dia: "2026-09-14",
      hora: "14:30",
      minutos: 60,
      titulo: "AgroSol Londrina",
      detalhe: "Demonstração técnica de defensivos",
      contato: "Eduardo Souza",
      telefone: "43999991111",
      local: "Rodovia Celso Garcia 500, Londrina",
      selo: "demonstração",
      concluido: false,
      cancelado: false,
      link_google: "",
    },
    {
      id: "ev-manha",
      relato_id: "rel-2",
      origem: "relato",
      dia: "2026-09-14",
      hora: "09:00",
      minutos: 60,
      titulo: "Cooperativa Pioneira",
      detalhe: "Alinhamento de compras de safra",
      contato: "Mariana Costa",
      telefone: "43988882222",
      local: "Av. Brasil 1200, Londrina",
      selo: "alinhamento",
      concluido: true,
      cancelado: false,
      link_google: "",
    },
  ];

  it("ordena eventos cronologicamente por horário de início", () => {
    const ordenados = ordenarEventosCronologicamente(eventos);
    expect(ordenados[0]?.hora).toBe("09:00");
    expect(ordenados[1]?.hora).toBe("14:30");
  });

  it("gera texto limpo e legível para envio no WhatsApp", () => {
    const texto = gerarTextoWhatsAppRota(eventos, "2026-09-14", "Roberto Alencar");
    expect(texto).toContain("ROTA DE VISITAS — 14/09/2026");
    expect(texto).toContain("Roberto Alencar");
    expect(texto).toContain("Total: 2 atendimentos agendado(s)");
    expect(texto).toContain("*1.* ⏰ *09:00* — 🏢 *Cooperativa Pioneira*");
    expect(texto).toContain("*2.* ⏰ *14:30* — 🏢 *AgroSol Londrina*");
    expect(texto).toContain("Rota gerada pelo Doniq");
  });

  it("trata dias livres sem compromisso com mensagem encorajadora de prospecção", () => {
    const textoVazio = gerarTextoWhatsAppRota([], "2026-09-14");
    expect(textoVazio).toContain("ROTA DE CAMPO — 14/09/2026");
    expect(textoVazio).toContain("Nenhum compromisso agendado para hoje");
    expect(textoVazio).toContain("Dia livre para prospecção ativa");
  });

  it("gera link wa.me com texto codificado e suporte a telefone de destino", () => {
    const linkSemTel = gerarLinkWhatsAppRota(eventos, "2026-09-14");
    expect(linkSemTel).toContain("https://wa.me/?text=");
    expect(linkSemTel).toContain("Cooperativa%20Pioneira");

    const linkComTel = gerarLinkWhatsAppRota(eventos, "2026-09-14", "41999998888");
    expect(linkComTel).toContain("https://wa.me/5541999998888?text=");
  });
});
