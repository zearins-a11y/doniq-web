/**
 * Envelope da Autumn — a única parte do código que fala com o provedor de pagamento.
 *
 * A regra deste arquivo: **nenhuma falha daqui derruba o produto.** Toda função
 * cai graciosamente para "não sei" (`null`), e quem chama trata "não sei" como
 * `vitrine` — ou seja, ninguém é travado por causa de uma API fora do ar. O
 * oposto (falhar fechado) significaria que uma pane na Autumn bloqueia o vendedor
 * de gravar a visita que ele acabou de fazer, e ele não tem como saber por quê.
 *
 * Por isso a cobrança também fica fora do caminho de leitura: histórico, painel
 * e exportação nunca chamam este arquivo.
 *
 * Estado hoje: sem conta Stripe conectada, `AUTUMN_SECRET_KEY` vazia. Tudo aqui
 * devolve `null`/`""` e o produto roda em `vitrine`. Quando a Stripe entrar,
 * basta preencher a env e rodar `npx atmn push -y` — nada muda aqui.
 */

import { Autumn } from "autumn-js";
import { MOEDA } from "../../shared/planos";
import type { PlanoCobravel } from "./assinatura";

/** Feature de assento. Mesmo id de `autumn.config.ts`. */
export const FEATURE_ASSENTO = "assento";

/** O que a tela precisa saber da assinatura. `null` = não conseguimos perguntar. */
export interface AssinaturaRemota {
  ativa: boolean;
  plano: string;
  assentos: number;
  /** Pagamento atrasado no cartão. A tela avisa, mas não trava por isso. */
  atrasada: boolean;
}

export function parametrosAtualizacaoAssentos(
  userId: string,
  plano: PlanoCobravel,
  assentos: number,
) {
  return {
    customerId: idDeCliente(userId),
    planId: plano,
    featureQuantities: [
      { featureId: FEATURE_ASSENTO, quantity: Math.max(1, Math.trunc(assentos)) },
    ],
    prorationBehavior: "prorate_immediately" as const,
    // Esta chamada roda em segundo plano após uma mudança de equipe. Se o banco
    // exigir nova autenticação, marcamos a sincronia como pendente em vez de
    // criar uma URL que ninguém verá.
    redirectMode: "never" as const,
  };
}

function chave(): string {
  return (process.env.AUTUMN_SECRET_KEY || "").trim();
}

interface AssinaturaSimulada {
  ativa: boolean;
  plano: string;
  assentos: number;
  atrasada: boolean;
}

const assinaturasSimuladas = new Map<string, AssinaturaSimulada>();

export function modoSimulado(env: NodeJS.ProcessEnv = process.env): boolean {
  return !chave() && env.SIMULAR_COBRANCA === "true";
}

export function definirAssinaturaSimulada(
  userId: string,
  dados: { ativa: boolean; plano: string; assentos?: number; atrasada?: boolean } | null,
) {
  if (!dados) {
    assinaturasSimuladas.delete(userId);
  } else {
    assinaturasSimuladas.set(userId, {
      ativa: dados.ativa,
      plano: dados.plano,
      assentos: Math.max(1, dados.assentos ?? 1),
      atrasada: Boolean(dados.atrasada),
    });
  }
}

export function limparAssinaturasSimuladas() {
  assinaturasSimuladas.clear();
}

/**
 * Cliente da Autumn, ou `null` quando não há chave.
 *
 * Criado por chamada em vez de guardado num módulo: assim mudar a env não exige
 * reiniciar o processo, e o teste não precisa desfazer um cliente global.
 */
function cliente(): Autumn | null {
  const secretKey = chave();
  if (!secretKey) return null;
  // failOpen: se a Autumn estiver degradada, ela mesma libera o acesso em vez de
  // negar. Combina com a nossa política: na dúvida, não trava.
  return new Autumn({ secretKey, failOpen: true, timeoutMs: 8000 });
}

/**
 * O `customerId` da Autumn é o nosso `userId`.
 *
 * Não usamos e-mail: e-mail muda (a pessoa troca de domínio ao mudar de emprego)
 * e cliente novo na Autumn com histórico velho perdido é o tipo de bagunça que
 * só aparece na hora de emitir a segunda fatura.
 */
export function idDeCliente(userId: string): string {
  return userId;
}

export function parametrosCheckout(dados: {
  userId: string;
  plano: PlanoCobravel;
  assentos: number;
  successUrl?: string;
}) {
  return {
    customer_id: idDeCliente(dados.userId),
    plan_id: dados.plano,
    currency: MOEDA,
    feature_quantities: [
      { feature_id: FEATURE_ASSENTO, quantity: Math.max(1, Math.trunc(dados.assentos)) },
    ],
    proration_behavior: "prorate_immediately" as const,
    redirect_mode: "always" as const,
    ...(dados.successUrl ? { success_url: dados.successUrl } : {}),
  };
}

interface RespostaCheckout {
  payment_url?: string | null;
}

interface ErroCheckout {
  code?: unknown;
  type?: unknown;
  message?: unknown;
  error?: unknown;
}

function textoSeguro(valor: unknown): string | undefined {
  if (typeof valor !== "string" || !valor.trim()) return undefined;
  return valor
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(/\b(?:sk|am|pk|rk)[-_][a-z0-9_-]{8,}\b/gi, "[secret]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[id]")
    .slice(0, 300);
}

function resumoErroCheckout(
  status: number,
  corpo: unknown,
  customerId: string,
): Record<string, string | number> {
  const raiz =
    corpo && typeof corpo === "object" ? (corpo as ErroCheckout) : ({} as ErroCheckout);
  const erro =
    raiz.error && typeof raiz.error === "object" ? (raiz.error as ErroCheckout) : raiz;
  const code = textoSeguro(erro.code ?? raiz.code);
  const type = textoSeguro(erro.type ?? raiz.type);
  const message = textoSeguro(erro.message ?? raiz.message)?.replaceAll(customerId, "[customer]");

  return {
    status,
    ...(code ? { code } : {}),
    ...(type ? { type } : {}),
    ...(message ? { message } : {}),
  };
}

async function requisitarCheckout(
  secretKey: string,
  parametros: ReturnType<typeof parametrosCheckout>,
): Promise<RespostaCheckout | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resposta = await fetch("https://api.useautumn.com/v1/billing.attach", {
      method: "POST",
      headers: {
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(parametros),
      signal: controller.signal,
    });
    if (!resposta.ok) {
      const texto = await resposta.text();
      let corpo: unknown = {};
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = { message: texto };
      }
      console.error(
        "[cobranca] Autumn recusou checkout",
        resumoErroCheckout(resposta.status, corpo, parametros.customer_id),
      );
      return null;
    }

    return (await resposta.json()) as RespostaCheckout;
  } catch (erro) {
    console.error("[cobranca] Falha ao chamar checkout Autumn", {
      type: erro instanceof Error ? erro.name : "UnknownError",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Assinatura de quem paga. `null` quando não há provedor ou a chamada falhou.
 *
 * Repare que erro e "não configurado" devolvem a mesma coisa de propósito: para
 * quem chama, os dois significam "não sei se pode cobrar", e a resposta correta
 * nos dois casos é a mesma.
 */
export async function assinaturaDoCliente(userId: string): Promise<AssinaturaRemota | null> {
  const api = cliente();
  if (!api) {
    if (modoSimulado()) {
      const s = assinaturasSimuladas.get(userId);
      if (!s) return { ativa: false, plano: "", assentos: 0, atrasada: false };
      return s;
    }
    return null;
  }
  try {
    const cli = await api.customers.getOrCreate({ customerId: idDeCliente(userId) });
    const assinaturas = cli.subscriptions ?? [];
    const viva = assinaturas.find((s) => s.status === "active");
    if (!viva) return { ativa: false, plano: "", assentos: 0, atrasada: false };
    return {
      ativa: true,
      plano: viva.planId ?? "",
      assentos: Math.max(1, Math.trunc(viva.quantity ?? 1)),
      atrasada: Boolean(viva.pastDue),
    };
  } catch {
    return null;
  }
}

/**
 * Abre o checkout e devolve a URL para onde mandar o gestor.
 *
 * `redirectMode: "always"` porque queremos sempre a página hospedada da Stripe:
 * é lá que Pix e cartão aparecem juntos, e é ela que a Stripe mantém em ordem
 * com as regras de cada meio de pagamento. Construir formulário de cartão aqui
 * seria assumir PCI sem motivo.
 *
 * `prorationBehavior: "prorate_immediately"` faz o assento que entra no dia 28
 * custar os dias que faltam, não o mês cheio.
 */
export async function abrirCheckout(dados: {
  userId: string;
  plano: PlanoCobravel;
  assentos: number;
  successUrl?: string;
}): Promise<string | null> {
  const secretKey = chave();
  if (!secretKey) {
    if (modoSimulado()) {
      const params = new URLSearchParams({
        plano: dados.plano,
        assentos: String(dados.assentos),
        retorno: dados.successUrl || "/equipe?assinatura=ok",
      });
      return `/checkout-simulado?${params.toString()}`;
    }
    return null;
  }
  try {
    const resposta = await requisitarCheckout(secretKey, parametrosCheckout(dados));
    return resposta?.payment_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Muda a quantidade de assentos de quem já assina.
 *
 * Usa `billing.update`, a operação própria para alterar uma assinatura existente.
 * Chamado quando um convite é **aceito** (nunca quando é enviado) e quando um
 * vendedor é removido.
 *
 * Devolve `true` só quando deu certo. Falso não é motivo para desfazer a entrada
 * do vendedor na equipe: é melhor um assento não cobrado por alguns minutos do
 * que um convite aceito que "não colou" por causa da fatura.
 */
export async function atualizarAssentos(
  userId: string,
  plano: PlanoCobravel,
  assentos: number,
): Promise<boolean> {
  const api = cliente();
  if (!api) {
    if (modoSimulado()) {
      const s = assinaturasSimuladas.get(userId);
      if (s && s.ativa) {
        s.assentos = Math.max(1, Math.trunc(assentos));
        s.plano = plano;
        return true;
      }
      return false;
    }
    return false;
  }
  try {
    const resposta = await api.billing.update(parametrosAtualizacaoAssentos(userId, plano, assentos));
    return !resposta.requiredAction && !resposta.paymentUrl;
  } catch {
    return false;
  }
}

/**
 * Portal da Stripe: trocar cartão, ver faturas, cancelar.
 *
 * Cancelamento mora aqui, e não numa tela nossa, de propósito: quem quer sair
 * consegue sair sozinho, sem falar com ninguém. Assinatura que só cancela por
 * e-mail gera chargeback, e chargeback custa mais que o mês que se tentou salvar.
 */
export async function abrirPortal(userId: string, returnUrl?: string): Promise<string | null> {
  const api = cliente();
  if (!api) {
    if (modoSimulado()) {
      const s = assinaturasSimuladas.get(userId);
      if (s?.ativa) {
        return `/checkout-simulado?portal=true&retorno=${encodeURIComponent(returnUrl || "/equipe")}`;
      }
      return null;
    }
    return null;
  }
  try {
    const r = await api.billing.openCustomerPortal({
      customerId: idDeCliente(userId),
      ...(returnUrl ? { returnUrl } : {}),
    });
    return r.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Moeda da cobrança, só para a tela escrever "R$".
 *
 * O mesmo valor também é enviado à Autumn ao abrir o checkout. O plano precisa
 * oferecer essa moeda em `additionalCurrencies`.
 */
export function moeda(): string {
  return MOEDA;
}
