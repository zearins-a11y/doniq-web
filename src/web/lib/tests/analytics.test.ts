import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { caminhoSeguroAnalytics } from "../analytics";

describe("analytics sem segredos na URL", () => {
  test("substitui o token do convite por um nome de rota", () => {
    expect(caminhoSeguroAnalytics("/convite/segredo-abc")).toBe("/convite/:token");
    expect(caminhoSeguroAnalytics("/convite/segredo%2Fcodificado")).toBe("/convite/:token");
    expect(caminhoSeguroAnalytics("/convite/segredo-abc/")).toBe("/convite/:token");
  });

  test("não envia pageview quando a URL tem query ou hash", () => {
    expect(caminhoSeguroAnalytics("/precos?utm_source=email")).toBeNull();
    expect(caminhoSeguroAnalytics("/precos#planos")).toBeNull();
    expect(caminhoSeguroAnalytics("/login?codigo=segredo")).toBeNull();
  });

  test("mantém rotas sem segredo", () => {
    expect(caminhoSeguroAnalytics("/privacidade")).toBe("/privacidade");
    expect(caminhoSeguroAnalytics("")).toBe("/");
  });

  test("o HTML desativa a coleta automática antes de carregar o analytics", () => {
    const html = readFileSync(new URL("../../../../index.html", import.meta.url), "utf8");
    expect(html).toContain('<meta name="stonks-collect" content="false" />');
  });
});

describe("observabilidade sem conteúdo pessoal", () => {
  test("remove query, hash e token de convite de URLs absolutas e relativas", async () => {
    const { urlSeguraObservabilidade } = await import("../analytics");
    expect(urlSeguraObservabilidade("/login?codigo=123456#campo")).toBe("/login");
    expect(
      urlSeguraObservabilidade("https://app.doniq.com.br/convite/segredo?email=a@b.com"),
    ).toBe("https://app.doniq.com.br/convite/:token");
  });

  test("desativa categorias sensíveis da coleta do Sentry", async () => {
    const { COLETA_SENTRY_MINIMA } = await import("../analytics");
    expect(COLETA_SENTRY_MINIMA).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    });
  });
});
