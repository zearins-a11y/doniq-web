function caminhoSemSegredo(caminho: string): string {
  return caminho === "/convite" || caminho.startsWith("/convite/")
    ? "/convite/:token"
    : caminho;
}

/**
 * O OneDollarStats lê parâmetros UTM diretamente de `window.location`.
 * Se houver query ou hash, não basta passar um pathname limpo: o evento ainda
 * carregaria esses valores. Nesses casos, não enviamos a visualização.
 */
export function caminhoSeguroAnalytics(localizacao: string): string | null {
  if (/[?#]/.test(localizacao)) return null;
  return caminhoSemSegredo(localizacao || "/");
}

/** Remove query, hash e tokens de convite antes de uma URL chegar à observabilidade. */
export function urlSeguraObservabilidade(valor: string): string {
  try {
    const absoluta = /^[a-z][a-z\d+.-]*:/i.test(valor);
    const url = new URL(valor, "https://doniq.local");
    const caminho = caminhoSemSegredo(url.pathname || "/");
    return absoluta ? `${url.origin}${caminho}` : caminho;
  } catch {
    return "[url removida]";
  }
}

export const COLETA_SENTRY_MINIMA = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: false,
    response: false,
  },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: {
    document: false,
    variables: false,
  },
  genAI: {
    inputs: false,
    outputs: false,
  },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};
