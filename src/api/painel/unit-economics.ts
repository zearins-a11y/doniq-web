/**
 * Métricas de Unit Economics — cálculo puro, sem dependências externas.
 *
 * O Doniq não tem ainda dados de pagamento históricos (Stripe em transição),
 * então estas funções projetam o que podemos medir quando os dados existirem:
 *   - MRR/ARR baseado em assinaturas ativas
 *   - Taxa de conversão teste → pago
 *   - Custos baseados em visitas processadas
 *
 * Quando a integração Stripe maturescer, adicionamos CAC e LTV real.
 */

import { ANUAL, MENSAL, CUSTO_POR_VISITA } from "../../shared/planos";

export interface DadosAssinatura {
  /** Plano: "mensal" | "anual" | "" */
  plano: string;
  /** Quantos assentos pagos */
  assentos: number;
  /** Status: "ativa" | "atrasada" | "teste" | "vencida" */
  status: string;
  /** Data de criação da conta (ISO) */
  criado_em: string;
  /** Data da primeira assinatura paga (ISO), vazio se nunca pagou */
  primeira_assinatura?: string;
  /** Contagem de visitas já processadas para esta conta */
  visitas_processadas: number;
}

export interface MetricasUnitEconomics {
  /** Monthly Recurring Revenue estimado */
  mrr: number;
  /** Annual Recurring Revenue estimado */
  arr: number;
  /** Total de contas ativas (pagas) */
  contas_ativas: number;
  /** Total de contas em teste */
  contas_teste: number;
  /** Total de contas vencidas */
  contas_vencidas: number;
  /** Taxa de conversão teste → pago (%) */
  taxa_conversao: number;
  /** Custo estimado com processamento de visitas no mês */
  custo_mensal_visitas: number;
  /** Margem bruta estimada */
  margem_bruta: number;
  /** ARPU médio por usuário ativo */
  arpu: number;
  /** Quantidade de vendedores ativos (soma de assentos) */
  vendedores_ativos: number;
}

/**
 * Calcula MRR/ARR baseado em assinaturas.
 * anual = 12 × mensal com desconto (já aplicado no preço)
 */
export function calcularMRR(assinaturas: DadosAssinatura[]): number {
  let mrr = 0;
  for (const a of assinaturas) {
    if (a.status !== "ativa" && a.status !== "atrasada") continue;
    const preco = a.plano === "anual" ? ANUAL : MENSAL;
    mrr += preco * a.assentos;
  }
  return mrr;
}

export function calcularARR(assinaturas: DadosAssinatura[]): number {
  return calcularMRR(assinaturas) * 12;
}

/**
 * Taxa de conversão: contas que saíram de "teste" para "ativa".
 * = (contas que já pagaram) / (total de contas que já tiveram teste)
 */
export function calcularTaxaConversao(assinaturas: DadosAssinatura[]): number {
  const jaPagaram = assinaturas.filter(
    (a) => a.primeira_assinatura && a.status === "ativa",
  ).length;
  // Total = ativas + atrasadas + testes (contas que passaram por teste)
  const totalComTeste = assinaturas.filter(
    (a) => a.status === "ativa" || a.status === "atrasada" || a.status === "teste",
  ).length;
  if (totalComTeste === 0) return 0;
  return Math.round((jaPagaram / totalComTeste) * 100);
}

/**
 * Custo estimado com processamento de visitas no mês.
 * Base: R$ 0,18 por visita (definido em planos.ts)
 */
export function calcularCustoVisitas(assinaturas: DadosAssinatura[]): number {
  const totalVisitas = assinaturas.reduce((acc, a) => acc + a.visitas_processadas, 0);
  return Math.round(totalVisitas * CUSTO_POR_VISITA * 100) / 100;
}

/**
 * Margem bruta = MRR - custo das visitas
 */
export function calcularMargemBruta(mrr: number, custoVisitas: number): number {
  return Math.round((mrr - custoVisitas) * 100) / 100;
}

/**
 * ARPU = MRR / contas ativas
 */
export function calcularARPU(mrr: number, contasAtivas: number): number {
  if (contasAtivas === 0) return 0;
  return Math.round((mrr / contasAtivas) * 100) / 100;
}

/**
 * Soma de todos os assentos pagos (vendedores)
 */
export function calcularVendedoresAtivos(assinaturas: DadosAssinatura[]): number {
  return assinaturas
    .filter((a) => a.status === "ativa" || a.status === "atrasada")
    .reduce((acc, a) => acc + a.assentos, 0);
}

/**
 * Agrega todas as métricas de unit economics
 */
export function calcularUnitEconomics(assinaturas: DadosAssinatura[]): MetricasUnitEconomics {
  const contasAtivas = assinaturas.filter(
    (a) => a.status === "ativa" || a.status === "atrasada",
  ).length;
  const contasTeste = assinaturas.filter((a) => a.status === "teste").length;
  const contasVencidas = assinaturas.filter((a) => a.status === "vencida").length;

  const mrr = calcularMRR(assinaturas);
  const custoVisitas = calcularCustoVisitas(assinaturas);

  return {
    mrr,
    arr: calcularARR(assinaturas),
    contas_ativas: contasAtivas,
    contas_teste: contasTeste,
    contas_vencidas: contasVencidas,
    taxa_conversao: calcularTaxaConversao(assinaturas),
    custo_mensal_visitas: custoVisitas,
    margem_bruta: calcularMargemBruta(mrr, custoVisitas),
    arpu: calcularARPU(mrr, contasAtivas),
    vendedores_ativos: calcularVendedoresAtivos(assinaturas),
  };
}
