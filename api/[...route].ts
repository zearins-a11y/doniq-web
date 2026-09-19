export const config = {
  maxDuration: 300,
};

const HEADERS_SEGURANCA = {
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

let appPromise:
  | Promise<{ fetch(request: Request): Response | Promise<Response> }>
  | undefined;

function bancoDeProducaoConfigurado(): boolean {
  // Support both DATABASE_URL (legacy) and TURSO_DATABASE_URL (preferred).
  const dbUrl =
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  const dbToken =
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.DATABASE_AUTH_TOKEN?.trim() ||
    "";
  return Boolean(dbUrl && !dbUrl.startsWith("file:") && dbToken);
}

function configuracaoSensivelCompleta(): boolean {
  return Boolean(
    process.env.BETTER_AUTH_SECRET?.trim() &&
      process.env.TOKEN_SECRET?.trim() &&
      process.env.CRM_CRYPTO_KEY?.trim(),
  );
}

function respostaJson(corpo: object, status: number): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: HEADERS_SEGURANCA,
  });
}

async function carregarApp() {
  const moduloDoApp = "../dist-server/app.mjs";
  appPromise ??= import(moduloDoApp).then(({ default: app }) => app);
  return appPromise;
}

export async function vercelHandler(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/health") {
    return respostaJson({ status: "ok" }, 200);
  }

  if (!bancoDeProducaoConfigurado() || !configuracaoSensivelCompleta()) {
    return respostaJson({ error: "Serviço temporariamente indisponível." }, 503);
  }

  try {
    const app = await carregarApp();
    return app.fetch(request);
  } catch (error) {
    console.error("Falha ao inicializar a API.", error);
    return respostaJson({ error: "Erro interno do servidor." }, 500);
  }
}

export default { fetch: vercelHandler };
