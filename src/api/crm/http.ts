/** Cliente HTTP dos conectores: erros normalizados, backoff e limite de concorrência. */

import { ErroCrm } from "./tipos";

export type Requisicao = {
  url: string;
  metodo?: "GET" | "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  corpo?: unknown;
  /** Máximo de tentativas contando a primeira. */
  tentativas?: number;
  esperar?: (ms: number) => Promise<void>;
};

const PAUSA_BASE_MS = 500;
const PAUSA_MAX_MS = 8000;

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Quanto esperar antes da próxima tentativa.
 * `Retry-After` (segundos) e os headers de limite do Ollow mandam; senão é
 * backoff exponencial com teto.
 */
export function calcularBackoff(tentativa: number, cabecalhos?: Headers | null): number {
  const retryAfter = cabecalhos?.get("retry-after");
  if (retryAfter) {
    const seg = Number(retryAfter);
    if (Number.isFinite(seg) && seg > 0) return Math.min(seg * 1000, PAUSA_MAX_MS * 4);
  }
  const restaSegundo = cabecalhos?.get("x-ratelimit-remaining-second");
  const restaMinuto = cabecalhos?.get("x-ratelimit-remaining-minute");
  if (restaMinuto !== null && restaMinuto !== undefined && Number(restaMinuto) <= 0) return 60_000;
  if (restaSegundo !== null && restaSegundo !== undefined && Number(restaSegundo) <= 0) return 1_000;
  return Math.min(PAUSA_BASE_MS * 2 ** Math.max(0, tentativa - 1), PAUSA_MAX_MS);
}

/** 429 e 5xx valem nova tentativa; 4xx de payload, não. */
export function valeRetentar(status: number): boolean {
  return status === 429 || status === 408 || (status >= 500 && status <= 599);
}

/** Uma requisição por vez por conta de cliente — os limites dos CRMs são por conta. */
const filas = new Map<string, Promise<unknown>>();

export function emFila<T>(chaveConta: string, tarefa: () => Promise<T>): Promise<T> {
  const anterior = filas.get(chaveConta) ?? Promise.resolve();
  const proxima = anterior.then(tarefa, tarefa);
  filas.set(
    chaveConta,
    proxima.catch(() => undefined),
  );
  return proxima;
}

function mensagemDeErro(status: number, corpo: string): string {
  if (status === 401 || status === 403) return "Credencial recusada pelo CRM. Confira o token.";
  if (status === 404) return "Recurso não encontrado no CRM.";
  if (status === 429) return "O CRM pediu para desacelerar (limite de requisições).";
  if (status >= 500) return "O CRM está instável agora. Tente de novo em alguns minutos.";
  const trecho = corpo.slice(0, 300).replace(/\s+/g, " ").trim();
  return trecho ? `O CRM recusou os dados (${status}): ${trecho}` : `O CRM recusou os dados (${status}).`;
}

export async function pedir<T>(req: Requisicao): Promise<T> {
  const tentativasMax = req.tentativas ?? 3;
  const esperar = req.esperar ?? dormir;
  let ultimo: ErroCrm | null = null;

  for (let tentativa = 1; tentativa <= tentativasMax; tentativa++) {
    let resposta: Response;
    try {
      resposta = await fetch(req.url, {
        method: req.metodo ?? "GET",
        headers: {
          Accept: "application/json",
          ...(req.corpo === undefined ? {} : { "Content-Type": "application/json" }),
          ...req.headers,
        },
        body: req.corpo === undefined ? undefined : JSON.stringify(req.corpo),
      });
    } catch {
      ultimo = new ErroCrm("Não deu para falar com o CRM (rede).", 0, null);
      if (tentativa < tentativasMax) await esperar(calcularBackoff(tentativa, null));
      continue;
    }

    if (resposta.ok) {
      const texto = await resposta.text();
      if (!texto) return {} as T;
      try {
        return JSON.parse(texto) as T;
      } catch {
        return {} as T;
      }
    }

    const texto = await resposta.text().catch(() => "");
    const erro = new ErroCrm(
      mensagemDeErro(resposta.status, texto),
      resposta.status,
      calcularBackoff(tentativa, resposta.headers),
    );
    if (!valeRetentar(resposta.status) || tentativa === tentativasMax) throw erro;
    ultimo = erro;
    await esperar(erro.retryAfterMs ?? PAUSA_BASE_MS);
  }

  throw ultimo ?? new ErroCrm("Falha desconhecida ao falar com o CRM.");
}
