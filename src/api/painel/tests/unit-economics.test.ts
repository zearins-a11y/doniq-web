import { describe, expect, test } from "bun:test";
import {
  calcularMRR,
  calcularARR,
  calcularTaxaConversao,
  calcularCustoVisitas,
  calcularMargemBruta,
  calcularARPU,
  calcularVendedoresAtivos,
  calcularUnitEconomics,
  type DadosAssinatura,
} from "../unit-economics";

const assinaturaAtivaMensal: DadosAssinatura = {
  plano: "mensal",
  assentos: 1,
  status: "ativa",
  criado_em: "2026-01-01",
  primeira_assinatura: "2026-01-08",
  visitas_processadas: 50,
};

const assinaturaAtivaAnual: DadosAssinatura = {
  plano: "anual",
  assentos: 3,
  status: "ativa",
  criado_em: "2026-02-01",
  primeira_assinatura: "2026-02-15",
  visitas_processadas: 100,
};

const assinaturaTeste: DadosAssinatura = {
  plano: "",
  assentos: 1,
  status: "teste",
  criado_em: "2026-09-01",
  primeira_assinatura: undefined,
  visitas_processadas: 10,
};

const assinaturaVencida: DadosAssinatura = {
  plano: "mensal",
  assentos: 1,
  status: "vencida",
  criado_em: "2026-01-01",
  primeira_assinatura: "2026-01-08",
  visitas_processadas: 20,
};

describe("calcularMRR", () => {
  test("conta mensal simples", () => {
    const mrr = calcularMRR([assinaturaAtivaMensal]);
    expect(mrr).toBe(89);
  });

  test("conta anual com múltiplos assentos", () => {
    const mrr = calcularMRR([assinaturaAtivaAnual]);
    // anual = R$ 79/mês × 3 assentos = 237
    expect(mrr).toBe(237);
  });

  test("ignora contas em teste", () => {
    const mrr = calcularMRR([assinaturaAtivaMensal, assinaturaTeste]);
    expect(mrr).toBe(89);
  });

  test("ignora contas vencidas", () => {
    const mrr = calcularMRR([assinaturaAtivaMensal, assinaturaVencida]);
    expect(mrr).toBe(89);
  });
});

describe("calcularARR", () => {
  test("mensal × 12", () => {
    const arr = calcularARR([assinaturaAtivaMensal]);
    expect(arr).toBe(1068);
  });

  test("anual já é × 12", () => {
    const arr = calcularARR([assinaturaAtivaAnual]);
    expect(arr).toBe(2844);
  });
});

describe("calcularTaxaConversao", () => {
  test("100% quando todos pagaram", () => {
    const tx = calcularTaxaConversao([assinaturaAtivaMensal]);
    expect(tx).toBe(100);
  });

  test("0% quando ninguém pagou", () => {
    const tx = calcularTaxaConversao([assinaturaTeste]);
    expect(tx).toBe(0);
  });

  test("50% quando metade pagou", () => {
    // Uma ativa + uma que nunca pagou (teste)
    const assinaturaNuncaPagou: DadosAssinatura = {
      plano: "",
      assentos: 1,
      status: "teste",
      criado_em: "2026-09-01",
      primeira_assinatura: undefined,
      visitas_processadas: 10,
    };
    const tx = calcularTaxaConversao([assinaturaAtivaMensal, assinaturaNuncaPagou]);
    expect(tx).toBe(50);
  });
});

describe("calcularCustoVisitas", () => {
  test("custo com visitas", () => {
    const custo = calcularCustoVisitas([assinaturaAtivaAnual]);
    // 100 × 0.18 = 18
    expect(custo).toBe(18);
  });

  test("custo com poucas visitas", () => {
    const custo = calcularCustoVisitas([assinaturaTeste]);
    // 10 × 0.18 = 1.8
    expect(custo).toBe(1.8);
  });
});

describe("calcularMargemBruta", () => {
  test("margem positiva", () => {
    const margem = calcularMargemBruta(100, 10);
    expect(margem).toBe(90);
  });

  test("margem negativa se custo alto", () => {
    const margem = calcularMargemBruta(10, 100);
    expect(margem).toBe(-90);
  });
});

describe("calcularARPU", () => {
  test("ARPU = MRR / contas", () => {
    const arpu = calcularARPU(326, 2);
    // (89 + 237) / 2 = 163
    expect(arpu).toBe(163);
  });

  test("0 se sem contas ativas", () => {
    const arpu = calcularARPU(0, 0);
    expect(arpu).toBe(0);
  });
});

describe("calcularVendedoresAtivos", () => {
  test("soma assentos de ativas", () => {
    const v = calcularVendedoresAtivos([assinaturaAtivaMensal, assinaturaAtivaAnual]);
    // 1 + 3 = 4
    expect(v).toBe(4);
  });

  test("ignora teste e vencida", () => {
    const v = calcularVendedoresAtivos([
      assinaturaAtivaMensal,
      assinaturaTeste,
      assinaturaVencida,
    ]);
    expect(v).toBe(1);
  });
});

describe("calcularUnitEconomics", () => {
  test("agrega todas métricas", () => {
    const metricas = calcularUnitEconomics([
      assinaturaAtivaMensal,
      assinaturaAtivaAnual,
      assinaturaTeste,
    ]);

    expect(metricas.mrr).toBe(326);
    expect(metricas.arr).toBe(3912);
    expect(metricas.contas_ativas).toBe(2);
    expect(metricas.contas_teste).toBe(1);
    expect(metricas.vendedores_ativos).toBe(4);
    expect(metricas.arpu).toBe(163);
  });
});
