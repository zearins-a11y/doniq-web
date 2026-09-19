/**
 * Inicialização do Sentry para o package web (browser).
 *
 * Usa @sentry/browser porque o @sentry/bun traz imports Node que
 * quebram o build do Vite (ver erro: "subscribe is not exported
 * by node:diagnostics_channel"). Para o servidor Bun (Hono), o
 * servidor de produção tem init próprio — este módulo só roda no
 * browser, ativado por import no main.tsx.
 *
 * Não faz nada se SENTRY_DSN não estiver configurado.
 */
import * as Sentry from "@sentry/browser";
import { COLETA_SENTRY_MINIMA, urlSeguraObservabilidade } from "./analytics";

const CHAVES_URL_BREADCRUMB = ["url", "from", "to"] as const;

function sanitizarBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (!breadcrumb.data) return breadcrumb;
  const data = { ...breadcrumb.data };
  for (const chave of CHAVES_URL_BREADCRUMB) {
    if (typeof data[chave] === "string") {
      data[chave] = urlSeguraObservabilidade(data[chave]);
    }
  }
  return { ...breadcrumb, data };
}

export function initSentry() {
  const dsn =
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SENTRY_DSN ||
    (typeof process !== "undefined" ? process.env.SENTRY_DSN : undefined);
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment:
      (import.meta as { env?: Record<string, string | undefined> }).env?.MODE ??
      (typeof process !== "undefined" ? process.env.NODE_ENV : "development"),
    attachStacktrace: true,
    dataCollection: COLETA_SENTRY_MINIMA,
    beforeBreadcrumb: sanitizarBreadcrumb,
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = urlSeguraObservabilidade(event.request.url);
      }
      if (event.transaction) {
        event.transaction = urlSeguraObservabilidade(event.transaction);
      }
      return event;
    },
  });

  // Captura erros em promises rejeitadas e eventos não-tratados
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
        level: "error",
      });
    });
    window.addEventListener("error", (event) => {
      Sentry.captureException(event.error ?? new Error(event.message), { level: "fatal" });
    });
  }
}

/**
 * Reporta ao Sentry sem deixar o erro escapar silenciosamente.
 * Use em pontos onde um catch-block já existe e queremos logar antes de ignorar.
 */
export async function withSentry<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    Sentry.captureException(e instanceof Error ? e : new Error(String(e)));
    return fallback ? fallback() : (undefined as T);
  }
}
