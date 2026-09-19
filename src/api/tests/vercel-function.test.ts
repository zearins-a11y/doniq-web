import { describe, expect, test } from "bun:test";
import handler from "../../../api/[...route]";

describe("entrypoint da Vercel", () => {
  test("responde ao health check sem inicializar dependências externas", async () => {
    const response = await handler.fetch(new Request("https://doniq.test/api/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("não inicializa a API com banco local ou configuração incompleta", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;

    process.env.DATABASE_URL = "file:./local-dev.db";
    delete process.env.DATABASE_AUTH_TOKEN;

    try {
      const response = await handler.fetch(new Request("https://doniq.test/api/rpc/saude"));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Serviço temporariamente indisponível.",
      });
    } finally {
      if (databaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = databaseUrl;

      if (databaseAuthToken === undefined) delete process.env.DATABASE_AUTH_TOKEN;
      else process.env.DATABASE_AUTH_TOKEN = databaseAuthToken;
    }
  });
});
