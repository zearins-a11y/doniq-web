/**
 * Estado da cobrança — funções puras, sem banco e sem rede.
 *
 * Cinco estados, decididos aqui e devolvidos à tela pronta:
 *
 *   vitrine  — não existe forma de pagar (Autumn/Stripe não conectada).
 *   teste    — dentro dos primeiros DIAS_TESTE dias da conta.
 *   ativa    — assinatura paga em dia.
 *   atrasada — renovação pendente, com acesso durante a recuperação.
 *   vencida  — o teste acabou e ninguém assinou.
 *
 * A regra mais importante deste arquivo: **`vitrine` não trava nada.** Cortar o
 * produto sem existir um botão que resolva não é rigor comercial, é sequestro do
 * dado — a pessoa fica sem o produto e sem como voltar. Enquanto a Stripe não
 * estiver conectada, o teto do estado é `vitrine`, mesmo com o teste vencido.
 *
 * A segunda regra: vencido trava **só o que custa dinheiro** (transcrever e
 * gerar ficha nova). Histórico, painel, edição e exportação continuam abertos,
 * porque aquilo já é dado da pessoa, não é serviço a prestar. Cobrar pelo acesso
 * ao que ela mesma escreveu é refém, não é assinatura.
 */

import { DIAS_TESTE } from "../../shared/planos";

export const MODOS_COBRANCA = ["vitrine", "teste", "ativa", "atrasada", "vencida"] as const;
export type ModoCobranca = (typeof MODOS_COBRANCA)[number];

/** Planos cobráveis. Espelha `autumn.config.ts` na raiz. */
export const PLANOS_COBRAVEIS = ["mensal", "anual"] as const;
export type PlanoCobravel = (typeof PLANOS_COBRAVEIS)[number];

export interface EstadoCobranca {
  modo: ModoCobranca;
  /** Pode gravar/gerar ficha nova? Só `vencida` diz não. */
  pode_criar_ficha: boolean;
  /** Dias inteiros que faltam no teste. Zero fora do teste. */
  dias_restantes: number;
  /** Plano assinado, quando houver. */
  plano: PlanoCobravel | "";
  /** Assentos pagos hoje (membros que aceitaram, mínimo 1). */
  assentos: number;
  /** Frase única, em português, para a tela não inventar texto. */
  aviso: string;
  /** Se esta conta é quem paga (dono da equipe ou conta solo). */
  paga: boolean;
}

/** Só entra em `PLANOS_COBRAVEIS`; qualquer outra string vira "". */
export function planoConhecido(valor: string): PlanoCobravel | "" {
  return PLANOS_COBRAVEIS.find((p) => p === valor) ?? "";
}

/**
 * Provedor de pagamento existe? Sem chave da Autumn não há checkout possível.
 *
 * Repare no que NÃO está aqui: não perguntamos se a Stripe está conectada, porque
 * isso só se descobre chamando a Autumn. Quem chama trata a falha e cai para
 * `vitrine` — o padrão seguro é não cobrar.
 */
export function provedorDePagamentoConfigurado(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.AUTUMN_SECRET_KEY || "").trim()) || env.SIMULAR_COBRANCA === "true";
}

/**
 * Dias inteiros que faltam do teste, contando a partir da criação da conta.
 *
 * Arredonda para cima de propósito: quem está no meio do sétimo dia ainda tem
 * "1 dia". Prometer 7 e cortar em 6,4 é o tipo de detalhe que a pessoa lembra.
 */
export function diasRestantesDeTeste(criadoEm: string, agora: Date, dias = DIAS_TESTE): number {
  const inicio = Date.parse(criadoEm);
  if (Number.isNaN(inicio)) return 0;
  const fim = inicio + dias * 86400_000;
  const falta = fim - agora.getTime();
  if (falta <= 0) return 0;
  return Math.ceil(falta / 86400_000);
}

/**
 * Assentos que entram na conta.
 *
 * Contamos quem **aceitou** o convite, nunca quem só foi convidado: convite
 * pendente que ninguém abriu é intenção, e cobrar por intenção é o jeito mais
 * rápido de o gestor parar de convidar — o oposto do que o produto precisa.
 *
 * Mínimo 1: a conta solo é um assento (o dela).
 */
export function assentosEmUso(membrosAceitos: number): number {
  return Math.max(1, Math.trunc(membrosAceitos) || 0);
}

/** Valor mensal devido hoje, em reais. Serve para a tela mostrar a conta fechada. */
export function totalMensal(assentos: number, precoPorAssento: number): number {
  return assentosEmUso(assentos) * precoPorAssento;
}

function frase(
  modo: ModoCobranca,
  dias: number,
  plano: string,
  assentos: number,
  paga: boolean,
): string {
  if (modo === "vitrine") {
    return "A assinatura ainda não abriu. Você está usando o produto inteiro, sem cobrança e sem limite.";
  }
  if (modo === "teste") {
    const d = dias === 1 ? "1 dia" : `${dias} dias`;
    return `Teste em andamento: ${d} restantes. Nenhum cartão foi pedido até aqui.`;
  }
  if (modo === "ativa") {
    const s = assentos === 1 ? "1 vendedor" : `${assentos} vendedores`;
    return `Assinatura ${plano} ativa para ${s}.`;
  }
  if (modo === "atrasada") {
    return paga
      ? "O pagamento da assinatura está pendente. O acesso continua liberado enquanto você atualiza a forma de pagamento."
      : "O pagamento da equipe está pendente. O acesso continua liberado durante a regularização pelo proprietário.";
  }
  return "O teste acabou. Gravar visita nova está pausado — seu histórico, o painel e a exportação continuam abertos.";
}

/**
 * O estado, montado a partir do que o banco sabe.
 *
 * `assinaturaAtiva` vem da Autumn; `criadoEm` e `membrosAceitos` vêm do nosso
 * banco. A ordem das perguntas importa: provedor primeiro (senão é vitrine),
 * assinatura depois, teste por último.
 */
export function estadoCobranca(dados: {
  criadoEm: string;
  agora: Date;
  provedorPronto: boolean;
  assinaturaAtiva: boolean;
  assinaturaAtrasada?: boolean;
  plano?: string;
  membrosAceitos?: number;
  paga?: boolean;
}): EstadoCobranca {
  const assentos = assentosEmUso(dados.membrosAceitos ?? 1);
  const plano = planoConhecido(dados.plano ?? "");
  const dias = diasRestantesDeTeste(dados.criadoEm, dados.agora);
  const paga = dados.paga ?? true;

  let modo: ModoCobranca;
  if (dados.assinaturaAtiva && plano) modo = dados.assinaturaAtrasada ? "atrasada" : "ativa";
  else if (!dados.provedorPronto) modo = "vitrine";
  else if (dias > 0) modo = "teste";
  else modo = "vencida";

  return {
    modo,
    pode_criar_ficha: modo !== "vencida",
    dias_restantes: modo === "teste" ? dias : 0,
    plano: modo === "ativa" || modo === "atrasada" ? plano : "",
    assentos,
    aviso: frase(modo, dias, plano, assentos, paga),
    paga,
  };
}

/**
 * Só o proprietário da equipe administra a cobrança.
 *
 * O papel "gestor" libera funções operacionais, mas não transfere a propriedade
 * da assinatura. Conta solo administra a própria cobrança.
 */
export function quemPaga(userId: string, donoUserId?: string | null): boolean {
  if (!donoUserId) return true;
  return userId === donoUserId;
}
