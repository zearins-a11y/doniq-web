import { Hono } from "hono";
import { cors } from "hono/cors";
import { os, type Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

/**
 * TEMPLATE-MANAGED (__ prefix) — do not edit. Feature procedures belong in
 * src/api/routes/, composed in src/api/index.ts.
 *
 * oRPC is the API layer: define procedures on the `router` in src/api/index.ts;
 * they are served at /api/rpc/* and called through the typed clients
 * (web: src/web/lib/api.ts, mobile: lib/api.ts).
 *
 * Hono is only the HTTP mount. Rare plain routes (webhooks, streaming
 * responses, the Better Auth handler) register directly on the app returned
 * by createApp, with full /api/... paths.
 */

/** Per-request context available in every procedure via `context`. */
export interface RpcContext {
  /** Raw request headers — read cookies/authorization for auth. */
  headers: Headers;
}

/** Base procedure builder — chain .input()/.use()/.handler() off this. */
export const base = os.$context<RpcContext>();

/**
 * `origin: (origin) => origin ?? "*"` ecoava QUALQUER Origin de volta com
 * credentials:true — qualquer site conseguia fazer fetch(credentials:"include")
 * pra cá e ler a resposta usando o cookie de sessão da vítima (achado C2 da
 * auditoria de 2026-08-19). Trocado por uma origem fixa, mesmo valor que
 * `auth.ts` já usa como confiável (WEBSITE_URL) — nada além disso responde
 * com Access-Control-Allow-Origin, então o navegador bloqueia a leitura.
 */
/**
 * Lista de origens permitidas para CORS. Lê WEBSITE_URL (mantida por
 * compat com auth.ts e redirects do Better Auth) e, opcionalmente,
 * WEBSITE_URL_ALLOWED (CSV) para incluir o app web (5173) e o preview do
 * mobile web (5179) no mesmo backend.
 *
 * Por que não devolver qualquer Origin (achado C2 da auditoria de
 * 2026-08-19): com credentials:true, uma allowlist dinâmica permite que um
 * site malicioso faça fetch com o cookie da vítima. Mantemos allowlist
 * fechada — cada origem extra é declarada via env.
 */
const origensAmbiente = [
  process.env.WEBSITE_URL || "http://localhost:3000",
  ...(process.env.WEBSITE_URL_ALLOWED
    ? process.env.WEBSITE_URL_ALLOWED.split(",").map((o: string) => o.trim()).filter(Boolean)
    : []),
]
  .map((o) => o.replace(/\/$/, ""))
  .filter((o, i, arr) => arr.indexOf(o) === i);

/** Ecoa a Origin se ela estiver na allowlist; "" se não — o navegador bloqueia. */
const origemPermitida = (origin: string) =>
  origensAmbiente.includes(origin.replace(/\/$/, "")) ? origin : "";

/** Assembles the HTTP mount: CORS → /api/health → oRPC procedures at /api/rpc/*. */
export function createApp(router: Router<Record<never, never>, RpcContext>) {
  const app = new Hono().use(
    cors({
      origin: origemPermitida,
      credentials: true,
      // Required so the browser can read the bearer token header set by Better Auth.
      exposeHeaders: ["set-auth-token"],
    }),
  );

  app.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  // Global error handler — captura exceções não tratadas em qualquer rota.
  // Erros já tratados (ORPCError, ErroLLM, ErroCrm) não passam por aqui.
  app.onError((err, c) => {
    // Em dev mostra o erro; em prod retorna genérico para não vazar stack trace
    if (process.env.NODE_ENV === "development") {
      return c.json({ error: err.message, stack: err.stack }, 500);
    }
    return c.json({ error: "Erro interno no servidor." }, 500);
  });

  const handler = new RPCHandler(router);
  app.use("/api/rpc/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context: { headers: c.req.raw.headers },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  });

  return app;
}
