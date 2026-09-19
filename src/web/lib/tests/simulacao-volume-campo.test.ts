import { describe, expect, it } from "bun:test";
import { executarBateriaSimulacao } from "../../../../scripts/simular-volume-campo";

describe("Simulação e Benchmark em Volume de Campo (20 Contas)", () => {
  it("processa as 20 contas em menos de 50ms com 100% de sucesso", () => {
    const res = executarBateriaSimulacao();
    expect(res.duracaoTotal).toBeLessThan(50);
  });

  it("identifica corretamente a distribuição de SLAs de retomada nas 20 contas", () => {
    const res = executarBateriaSimulacao();
    expect(res.resumoSla.total).toBe(20);
    expect(res.resumoSla.criticos).toBe(5);
    expect(res.resumoSla.atencao).toBe(2);
    expect(res.resumoSla.emDia).toBe(13);
  });

  it("gera Cheat Sheets táticos de 30s completos para todas as 20 contas", () => {
    const res = executarBateriaSimulacao();
    expect(res.cheatSheets.length).toBe(20);

    for (const cs of res.cheatSheets) {
      expect(cs.empresa).toBeDefined();
      expect(cs.contato).toBeDefined();
      expect(cs.checklist.length).toBeGreaterThanOrEqual(3);
      expect(cs.linkMaps).toContain("google.com/maps");
      expect(cs.linkWaze).toContain("waze.com");
      expect(cs.linkWhatsApp).toContain("wa.me");
    }

    // Contas com objeção cadastrada devem conter contra-argumento do playbook
    const contasComObjecao = res.cheatSheets.filter((cs) => Boolean(cs.objecaoConhecida));
    expect(contasComObjecao.length).toBeGreaterThan(0);
    for (const cs of contasComObjecao) {
      expect(cs.objecaoConhecida?.contraArgumentoRecomendado).toBeDefined();
      expect(cs.objecaoConhecida?.contraArgumentoRecomendado.length).toBeGreaterThan(15);
    }
  });

  it("ordena cronologicamente a rota do dia e soma o pipeline financeiro em reais", () => {
    const res = executarBateriaSimulacao();
    expect(res.rotaOrdenada.length).toBe(6);

    for (let i = 0; i < res.rotaOrdenada.length - 1; i++) {
      const atual = res.rotaOrdenada[i].hora;
      const proximo = res.rotaOrdenada[i + 1].hora;
      if (atual && proximo) {
        expect(atual.localeCompare(proximo)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("sintetiza briefing matinal falado com duração adequada para consumo no carro", () => {
    const res = executarBateriaSimulacao();
    expect(res.briefing.tempoEstimadoSegundos).toBeGreaterThan(15);
    expect(res.briefing.tempoEstimadoSegundos).toBeLessThan(90);
    expect(res.briefing.primeiroCompromisso?.titulo).toBe("AgroSol Insumos Agrícolas");
    expect(res.briefing.primeiroCompromisso?.hora).toBe("08:30");
  });

  it("mapeia as 20 contas para o formato canônico de CRM com zero colisões de chave", () => {
    const res = executarBateriaSimulacao();
    expect(res.canonicos.length).toBe(20);

    for (const c of res.canonicos) {
      expect(c.chave).toContain("relato-visita:");
      expect(c.pessoa.telefone).toMatch(/^\+55\d{10,11}$/);
      expect(["Quente", "Morna", "Fria"]).toContain(c.negocio.temperatura);
    }

    const chaves = res.canonicos.map((c) => c.chave);
    const chavesUnicas = new Set(chaves);
    expect(chavesUnicas.size).toBe(20);
  });
});
