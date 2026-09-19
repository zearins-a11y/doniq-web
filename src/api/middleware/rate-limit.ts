/**
 * Rate limiting genérico em memória.
 *
 * Cada "balde" é um mapa de IP → timestamps das requisições recentes.
 * Requisições além do limite dentro da janela são rejeitadas com 429.
 *
 * Não sobrevive a restart — é suficiente para segurar bots e abuso acidental,
 * mas para DDoS real precisa de Redis ou similar.
 */

export interface RateLimitConfig {
  /** Milissegundos da janela. */
  janelaMs: number;
  /** Máximo de requisições por janela. */
  max: number;
  /** Chave para distinguir baldes diferentes (ex: "login", "relato", "transcrever"). */
  nome: string;
}

/** Armazém de baldes por nome. */
const baldes = new Map<string, Map<string, number[]>>();

/**
 * Cria um middleware de rate limiting.
 *
 * @example
 * const limitarLogin = criarRateLimit({ janelaMs: 60_000, max: 10, nome: "login" });
 * app.use("/api/rpc/contas/*", limitarLogin);
 */
export function criarRateLimit(config: RateLimitConfig) {
  return async (
    ip: string,
  ): Promise<{ limitado: boolean; limite: number; restantes: number; resetEm: number }> => {
    const agora = Date.now();
    const janelaAnterior = agora - config.janelaMs;

    // Obtém ou cria o balde
    if (!baldes.has(config.nome)) {
      baldes.set(config.nome, new Map());
    }
    const balde = baldes.get(config.nome)!;

    // Limpa timestamps antigos
    const historico = (balde.get(ip) ?? []).filter((t) => t > janelaAnterior);

    // Verifica limite
    if (historico.length >= config.max) {
      const maisAntigo = Math.min(...historico);
      const resetEm = maisAntigo + config.janelaMs;
      return { limitado: true, limite: config.max, restantes: 0, resetEm };
    }

    // Registra nova requisição
    historico.push(agora);
    balde.set(ip, historico);

    return {
      limitado: false,
      limite: config.max,
      restantes: config.max - historico.length,
      resetEm: agora + config.janelaMs,
    };
  };
}

/**
 * Headers padrão para respostas de rate limit.
 */
export function headersRateLimit(
  limite: number,
  restantes: number,
  resetEm: number,
): Record<string, string> {
  const segundosAteReset = Math.ceil((resetEm - Date.now()) / 1000);
  return {
    "X-RateLimit-Limit": String(limite),
    "X-RateLimit-Remaining": String(Math.max(0, restantes)),
    "X-RateLimit-Reset": String(Math.ceil(resetEm / 1000)),
    "Retry-After": String(segundosAteReset),
  };
}

/**
 * Rate limiters pré-configurados para cada contexto.
 */
export const rateLimiters = {
  /** 10 login attempts por minuto por IP. */
  login: criarRateLimit({ janelaMs: 60_000, max: 10, nome: "login" }),

  /** 30 criação de relato por minuto por usuário. */
  criarRelato: criarRateLimit({ janelaMs: 60_000, max: 30, nome: "criarRelato" }),

  /** 60 requisições gerais por minuto por IP. */
  geral: criarRateLimit({ janelaMs: 60_000, max: 60, nome: "geral" }),

  /** 10 transcrições por minuto por usuário (custa dinheiro). */
  transcrever: criarRateLimit({ janelaMs: 60_000, max: 10, nome: "transcrever" }),
};

/**
 * Extrai IP da requisição, respeitando proxy (Cloudflare, etc).
 */
export function extrairIp(headers: Headers): string {
  return (
    // Cloudflare
    headers.get("cf-connecting-ip") ??
    // Vercel
    headers.get("x-vercel-forwarded-for") ??
    // Nginx / proxy genérico
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    // Fly.io
    headers.get("x-forwarded-headers") ??
    // Header padrão
    headers.get("x-real-ip") ??
    "anon"
  );
}
