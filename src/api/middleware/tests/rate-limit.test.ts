import { describe, expect, test } from "bun:test";
import {
  criarRateLimit,
  headersRateLimit,
  extrairIp,
  rateLimiters,
} from "../rate-limit";

describe("criarRateLimit", () => {
  test("permite requisições dentro do limite", async () => {
    const limitar = criarRateLimit({ janelaMs: 1000, max: 3, nome: "teste" });
    const ip = "192.168.1.1";

    const r1 = await limitar(ip);
    expect(r1.limitado).toBe(false);
    expect(r1.limite).toBe(3);
    expect(r1.restantes).toBe(2);

    const r2 = await limitar(ip);
    expect(r2.limitado).toBe(false);
    expect(r2.restantes).toBe(1);

    const r3 = await limitar(ip);
    expect(r3.limitado).toBe(false);
    expect(r3.restantes).toBe(0);
  });

  test("bloqueia após limite excedido", async () => {
    const limitar = criarRateLimit({ janelaMs: 1000, max: 2, nome: "teste2" });
    const ip = "192.168.1.2";

    await limitar(ip);
    await limitar(ip);

    const r = await limitar(ip);
    expect(r.limitado).toBe(true);
    expect(r.restantes).toBe(0);
    expect(r.resetEm).toBeGreaterThan(Date.now());
  });

  test("IPs diferentes têm baldes independentes", async () => {
    const limitar = criarRateLimit({ janelaMs: 1000, max: 2, nome: "teste3" });

    await limitar("192.168.1.1");
    await limitar("192.168.1.1");

    // Outro IP ainda tem espaço
    const r = await limitar("192.168.1.3");
    expect(r.limitado).toBe(false);
  });

  test("limite anterior expira após janela", async () => {
    const limitar = criarRateLimit({ janelaMs: 100, max: 1, nome: "teste4" });
    const ip = "192.168.1.4";

    await limitar(ip);
    const bloqueado = await limitar(ip);
    expect(bloqueado.limitado).toBe(true);

    // Após janela expirar
    await new Promise((r) => setTimeout(r, 150));
    const liberou = await limitar(ip);
    expect(liberou.limitado).toBe(false);
  });
});

describe("headersRateLimit", () => {
  test("gera headers corretos", () => {
    const resetEm = Date.now() + 30000;
    const h = headersRateLimit(10, 5, resetEm);

    expect(h["X-RateLimit-Limit"]).toBe("10");
    expect(h["X-RateLimit-Remaining"]).toBe("5");
    expect(Number(h["X-RateLimit-Reset"])).toBeGreaterThan(0);
    expect(Number(h["Retry-After"])).toBeGreaterThan(0);
    expect(Number(h["Retry-After"])).toBeLessThanOrEqual(31);
  });

  test("restantes nunca é negativo", () => {
    const h = headersRateLimit(10, 0, Date.now() + 1000);
    expect(h["X-RateLimit-Remaining"]).toBe("0");
  });

  test("preserva o limite total quando a requisição é bloqueada", async () => {
    const limitar = criarRateLimit({ janelaMs: 1000, max: 10, nome: "headers-bloqueado" });
    for (let i = 0; i < 10; i++) await limitar("192.168.1.5");

    const resultado = await limitar("192.168.1.5");
    const h = headersRateLimit(resultado.limite, resultado.restantes, resultado.resetEm);

    expect(resultado.limitado).toBe(true);
    expect(h["X-RateLimit-Limit"]).toBe("10");
    expect(h["X-RateLimit-Remaining"]).toBe("0");
  });
});

describe("extrairIp", () => {
  test("Cloudflare", () => {
    const h = new Headers({ "cf-connecting-ip": "1.2.3.4" });
    expect(extrairIp(h)).toBe("1.2.3.4");
  });

  test("X-Forwarded-For (primeiro IP)", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extrairIp(h)).toBe("1.2.3.4");
  });

  test("X-Real-IP", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(extrairIp(h)).toBe("9.9.9.9");
  });

  test("fallback para anon", () => {
    const h = new Headers();
    expect(extrairIp(h)).toBe("anon");
  });

  test("prioridade Cloudflare sobre X-Forwarded-For", () => {
    const h = new Headers({
      "cf-connecting-ip": "1.1.1.1",
      "x-forwarded-for": "2.2.2.2",
    });
    expect(extrairIp(h)).toBe("1.1.1.1");
  });
});

describe("rateLimiters pré-configurados", () => {
  test("login permite 10 por minuto", async () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 10; i++) {
      const r = await rateLimiters.login(ip);
      expect(r.limitado).toBe(false);
    }
    const r = await rateLimiters.login(ip);
    expect(r.limitado).toBe(true);
  });

  test("transcrever permite 10 por minuto", async () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 10; i++) {
      const r = await rateLimiters.transcrever(ip);
      expect(r.limitado).toBe(false);
    }
    const r = await rateLimiters.transcrever(ip);
    expect(r.limitado).toBe(true);
  });

  test("geral permite 60 por minuto", async () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < 60; i++) {
      const r = await rateLimiters.geral(ip);
      expect(r.limitado).toBe(false);
    }
    const r = await rateLimiters.geral(ip);
    expect(r.limitado).toBe(true);
  });
});
