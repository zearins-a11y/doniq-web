/**
 * Números do plano em um lugar só — lidos pelo navegador E pelo servidor.
 *
 * Por que sair da `web/lib/precos.ts`: o prazo do teste virou regra de servidor
 * (é ele quem decide travar o "gravar nova visita" quando o teste acaba). Prazo
 * escrito em dois arquivos é o jeito garantido de a página prometer 7 dias e o
 * servidor cortar no 14 — ou pior, o contrário.
 *
 * DECISÃO COMERCIAL CONFIRMADA PELO OWNER (2026-08-23):
 *   MENSAL / ANUAL / MINIMO_VENDEDORES / DIAS_TESTE.
 * O piso defensável é R$ 70–90 por vendedor/mês: o custo de operação é de
 * R$ 11 a 13 por vendedor/mês (≈ R$ 0,18 por visita processada).
 */

/** Preço de tabela, por vendedor, por mês, em reais. */
export const MENSAL = 89;

/** Preço por vendedor/mês quando o pagamento é anual à vista. */
export const ANUAL = 79;

/** Menor contratação aceita. Vendedor autônomo cabe. */
export const MINIMO_VENDEDORES = 1;

/**
 * Dias de teste sem cartão.
 *
 * Sete, não catorze: o hábito que o produto precisa criar é gravar a visita ao
 * voltar para o carro. Quem grava na primeira semana grava sempre; quem não
 * gravou em sete dias não vai gravar no décimo terceiro — só vai custar catorze
 * dias de transcrição paga.
 */
export const DIAS_TESTE = 7;

/** Custo interno estimado por visita processada, em reais. Base do piso. */
export const CUSTO_POR_VISITA = 0.18;

/** Moeda de cobrança. A Autumn/Stripe recebe o valor em centavos. */
export const MOEDA = "brl";

/** Centavos, que é como a Stripe conta dinheiro. */
export function centavos(reais: number): number {
  return Math.round(reais * 100);
}

export function economiaAnualPorcento(mensal = MENSAL, anual = ANUAL): number {
  if (mensal <= 0) return 0;
  return Math.round(((mensal - anual) / mensal) * 100);
}
