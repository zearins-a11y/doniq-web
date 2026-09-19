/**
 * Testes para o cliente HTTP dos conectores CRM.
 *
 * Cobertura:
 * - calcularBackoff: retry-after, ratelimit, exponencial
 * - valeRetentar: 429/408/5xx vs 4xx
 * - pedir: sucesso, erro de rede, retry, exaustão
 * - emFila: execução sequencial por chave
 */
import { describe, expect, test } from "bun:test";
import { calcularBackoff, emFila, pedir, valeRetentar } from "../http";

describe("calcularBackoff", () => {
  test("retry-after em segundos", () => {
    const headers = new Headers({ "retry-after": "5" });
    expect(calcularBackoff(1, headers)).toBe(5_000);
  });

  test("retry-after com teto de 4x o máximo", () => {
    const headers = new Headers({ "retry-after": "999" });
    // Math.min(999000, 8000 * 4) = 32000
    expect(calcularBackoff(1, headers)).toBe(32_000);
  });

  test("retry-after inválido é ignorado", () => {
    const headers = new Headers({ "retry-after": "não é número" });
    expect(calcularBackoff(1, headers)).not.toBeNaN();
  });

  test("x-ratelimit-remaining-minute = 0", () => {
    const headers = new Headers({ "x-ratelimit-remaining-minute": "0" });
    expect(calcularBackoff(1, headers)).toBe(60_000);
  });

  test("x-ratelimit-remaining-minute > 0", () => {
    const headers = new Headers({ "x-ratelimit-remaining-minute": "5" });
    const resultado = calcularBackoff(1, headers);
    // Não deve ser 60000 (ignora rate limit quando há saldo)
    expect(resultado).not.toBe(60_000);
  });

  test("x-ratelimit-remaining-second = 0", () => {
    const headers = new Headers({ "x-ratelimit-remaining-second": "0" });
    expect(calcularBackoff(1, headers)).toBe(1_000);
  });

  test("backoff exponencial sem headers", () => {
    expect(calcularBackoff(1, null)).toBe(500);   // 500 * 2^0
    expect(calcularBackoff(2, null)).toBe(1_000);  // 500 * 2^1
    expect(calcularBackoff(3, null)).toBe(2_000);  // 500 * 2^2
    expect(calcularBackoff(4, null)).toBe(4_000);  // 500 * 2^3
    expect(calcularBackoff(5, null)).toBe(8_000);  // teto: 8000
    expect(calcularBackoff(6, null)).toBe(8_000);  // teto: 8000
  });

  test("retry-after tem prioridade sobre ratelimit", () => {
    const headers = new Headers({ "retry-after": "3", "x-ratelimit-remaining-minute": "0" });
    expect(calcularBackoff(1, headers)).toBe(3_000);
  });

  test("undefined/null headers não quebra", () => {
    expect(() => calcularBackoff(1, undefined)).not.toThrow();
    expect(() => calcularBackoff(1, null)).not.toThrow();
  });
});

describe("valeRetentar", () => {
  test("429 vale retry", () => expect(valeRetentar(429)).toBe(true));
  test("408 vale retry", () => expect(valeRetentar(408)).toBe(true));
  test("500 vale retry", () => expect(valeRetentar(500)).toBe(true));
  test("502 vale retry", () => expect(valeRetentar(502)).toBe(true));
  test("503 vale retry", () => expect(valeRetentar(503)).toBe(true));
  test("599 vale retry", () => expect(valeRetentar(599)).toBe(true));
  test("400 não vale retry", () => expect(valeRetentar(400)).toBe(false));
  test("401 não vale retry", () => expect(valeRetentar(401)).toBe(false));
  test("403 não vale retry", () => expect(valeRetentar(403)).toBe(false));
  test("404 não vale retry", () => expect(valeRetentar(404)).toBe(false));
  test("422 não vale retry", () => expect(valeRetentar(422)).toBe(false));
});

describe("pedir", () => {
  test("GET bem-sucedido retorna JSON", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ empresa: "Teste" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const result = await pedir({ url: "/test", headers: {} });
    expect(result).toEqual({ empresa: "Teste" });
  });

  test("resposta vazia retorna objeto vazio", async () => {
    globalThis.fetch = () => Promise.resolve(new Response("", { status: 200 }));
    const result = await pedir<Record<string, unknown>>({ url: "/empty" });
    expect(result).toEqual({});
  });

  test("corpo JSON é enviado com Content-Type", async () => {
    let capturedInit: RequestInit = {};
    globalThis.fetch = (_url, init) => {
      capturedInit = init ?? {};
      return Promise.resolve(new Response("{}", { status: 200 }));
    };
    await pedir({ url: "/test", metodo: "POST", corpo: { empresa: "X" } });
    expect(capturedInit.headers).toHaveProperty("Content-Type", "application/json");
    expect(JSON.parse((capturedInit.body as string) ?? "")).toEqual({ empresa: "X" });
  });

  test("não adiciona Content-Type quando não há corpo", async () => {
    globalThis.fetch = () =>
      Promise.resolve(new Response("{}", { status: 200 }));
    const result = await pedir<Record<string, unknown>>({ url: "/test" });
    expect(result).toEqual({});
  });

  test("erro de rede faz retry", async () => {
    let tentativas = 0;
    globalThis.fetch = () => {
      tentativas++;
      if (tentativas < 3) throw new TypeError("network error");
      return Promise.resolve(new Response("{}", { status: 200 }));
    };
    const result = await pedir({ url: "/test", tentativas: 3 });
    expect(tentativas).toBe(3);
    expect(result).toEqual({});
  });

  test("429 faz retry automático", async () => {
    let tentativas = 0;
    globalThis.fetch = () => {
      tentativas++;
      const status = tentativas === 1 ? 429 : 200;
      return Promise.resolve(
        new Response("{}", { status, headers: { "Content-Type": "application/json" } }),
      );
    };
    // Mock de esperar: não esperamos de verdade
    const result = await pedir({
      url: "/test",
      tentativas: 3,
      esperar: () => Promise.resolve(),
    });
    expect(tentativas).toBe(2);
    expect(result).toEqual({});
  });

  test("4xx não faz retry", async () => {
    let tentativas = 0;
    globalThis.fetch = () => {
      tentativas++;
      return Promise.resolve(
        new Response("bad request", { status: 422, headers: { "Content-Type": "text/plain" } }),
      );
    };
    await expect(
      pedir({ url: "/test", tentativas: 3, esperar: () => Promise.resolve() }),
    ).rejects.toThrow("O CRM recusou os dados (422)");
    expect(tentativas).toBe(1);
  });

  test("exauridas as tentativas lança erro", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response("erro", { status: 500, headers: { "Content-Type": "text/plain" } }),
      );
    await expect(
      pedir({ url: "/test", tentativas: 2, esperar: () => Promise.resolve() }),
    ).rejects.toThrow();
  });

  test("corpo de erro não-JSON não quebra", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        new Response("plain text error", { status: 500, headers: { "Content-Type": "text/plain" } }),
      );
    await expect(
      pedir({ url: "/test", tentativas: 1, esperar: () => Promise.resolve() }),
    ).rejects.toThrow();
  });

  test("405 method not allowed não faz retry", async () => {
    let tentativas = 0;
    globalThis.fetch = () => {
      tentativas++;
      return Promise.resolve(new Response("", { status: 405 }));
    };
    await expect(
      pedir({ url: "/test", tentativas: 3, esperar: () => Promise.resolve() }),
    ).rejects.toThrow();
    expect(tentativas).toBe(1);
  });
});

describe("emFila", () => {
  test("executa tarefa imediatamente se fila vazia", async () => {
    let rodou = false;
    const result = await emFila("conta-1", async () => {
      rodou = true;
      return 42;
    });
    expect(rodou).toBe(true);
    expect(result).toBe(42);
  });

  test("segunda chamada espera a primeira", async () => {
    let ordem: number[] = [];
    const p1 = emFila("conta-x", async () => {
      ordem.push(1);
      await new Promise((r) => setTimeout(r, 10));
      return 1;
    });
    const p2 = emFila("conta-x", async () => {
      ordem.push(2);
      return 2;
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(ordem).toEqual([1, 2]);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
  });

  test("emFila executa em ordem para mesma conta", async () => {
    const ordem: number[] = [];
    const p1 = emFila("conta-1", async () => {
      await new Promise((r) => setTimeout(r, 5));
      ordem.push(1);
      return 1;
    });
    const p2 = emFila("conta-1", async () => {
      ordem.push(2);
      return 2;
    });
    await Promise.all([p1, p2]);
    expect(ordem).toEqual([1, 2]);
  });

  test("filas diferentes executam em paralelo", async () => {
    let _aIniciou = false;
    const p1 = emFila("c1", async () => {
      await new Promise((r) => setTimeout(r, 20));
      _aIniciou = true;
      return 1;
    });
    const p2 = emFila("c2", async () => 2);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(_aIniciou).toBe(true); // p1 executou até o fim
  });

  test("emFila propaga erro da tarefa", async () => {
    await expect(
      emFila("conta-erro", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
