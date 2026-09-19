import { describe, expect, it } from "bun:test";
import { NOMES_PROVEDOR } from "../../../api/crm/tipos";
import {
  ANUAL,
  CUSTO_POR_VISITA,
  DIAS_TESTE,
  FAQ_PRECO,
  INCLUI,
  inteiroReais,
  MENSAL,
  MINIMO_VENDEDORES,
  NAO_INCLUI,
  PLANOS,
  economiaAnualPorcento,
  reais,
} from "../precos";

describe("preço público", () => {
  it("o preço fica no piso defensável, acima do custo de operação", () => {
    // Custo de operação estimado: R$ 11 a 13 por vendedor/mês. Preço abaixo de
    // R$ 70 não paga servidor, suporte e desenvolvimento.
    expect(MENSAL).toBeGreaterThanOrEqual(70);
    expect(MENSAL).toBeLessThanOrEqual(90);
    expect(ANUAL).toBeGreaterThanOrEqual(70);
    expect(ANUAL).toBeLessThan(MENSAL);
    expect(CUSTO_POR_VISITA).toBeLessThan(1);
  });

  it("o anual é mais barato por vendedor e o desconto sai inteiro", () => {
    const p = economiaAnualPorcento();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(50);
    expect(Number.isInteger(p)).toBe(true);
  });

  it("desconto não estoura quando o preço é zero ou igual", () => {
    expect(economiaAnualPorcento(0, 0)).toBe(0);
    expect(economiaAnualPorcento(89, 89)).toBe(0);
  });

  it("dinheiro sai em formato brasileiro, com vírgula", () => {
    expect(reais(0.18)).toBe("R$ 0,18");
    expect(reais(89)).toBe("R$ 89,00");
    expect(inteiroReais(89)).toBe("R$ 89");
    expect(inteiroReais(78.6)).toBe("R$ 79");
  });

  it("cada plano tem preço, cadência e chamada, e só um é destaque", () => {
    expect(PLANOS.length).toBe(2);
    for (const p of PLANOS) {
      expect(p.preco).toBeGreaterThan(0);
      expect(p.cadencia.length).toBeGreaterThan(0);
      expect(p.chamada.length).toBeGreaterThan(0);
      expect(p.selos.length).toBeGreaterThan(0);
    }
    expect(PLANOS.filter((p) => p.destaque).length).toBe(1);
  });

  it("os planos batem com as constantes, sem número solto na página", () => {
    const mensal = PLANOS.find((p) => p.id === "mensal");
    const anual = PLANOS.find((p) => p.id === "anual");
    expect(mensal?.preco).toBe(MENSAL);
    expect(anual?.preco).toBe(ANUAL);
  });

  it("o teste tem prazo e o mínimo aceita vendedor autônomo", () => {
    expect(DIAS_TESTE).toBeGreaterThanOrEqual(7);
    expect(MINIMO_VENDEDORES).toBe(1);
  });

  it("promete o que entra e avisa o que não entra", () => {
    expect(INCLUI.length).toBeGreaterThanOrEqual(5);
    expect(NAO_INCLUI.length).toBeGreaterThanOrEqual(1);
    // Nada de item vazio virando bala em branco na página.
    for (const i of [...INCLUI, ...NAO_INCLUI]) expect(i.trim().length).toBeGreaterThan(0);
  });

  it("a página de preço não continua avisando falta de coisa que já ficou pronta", () => {
    // Regra da casa: fato que deixou de ser verdade sai do código antes de sair
    // da tela. Conector pronto não pode seguir listado como ausência.
    const texto = NAO_INCLUI.join(" ").toLowerCase();
    for (const nome of Object.values(NOMES_PROVEDOR)) {
      expect(texto).not.toContain(nome.toLowerCase().split(" ")[0] as string);
    }
  });

  it("nenhuma pergunta de preço fica sem resposta", () => {
    expect(FAQ_PRECO.length).toBeGreaterThanOrEqual(4);
    for (const f of FAQ_PRECO) {
      expect(f.pergunta.trim().length).toBeGreaterThan(0);
      expect(f.resposta.trim().length).toBeGreaterThan(20);
    }
  });

  it("a promessa de ilimitado não convive com cota escrita na página", () => {
    const texto = [...INCLUI, ...FAQ_PRECO.map((f) => f.resposta)].join(" ").toLowerCase();
    expect(texto).toContain("ilimitad");
    expect(texto).not.toContain("cota de visitas");
  });
});
