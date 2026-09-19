/**
 * utils.test.ts — testa cn() (twMerge wrapper) usado em todo o app.
 *
 * Por que importa: cn() decide qual classe CSS sobrevive quando há conflito
 * (ex: "p-2 p-4" → "p-4"). Se twMerge parar de funcionar ou o clsx
 * interpretar errado, classes críticas do design podem ser sobrescritas
 * silenciosamente em produção.
 */

import { describe, expect, test } from "bun:test";
import { cn } from "../utils";

describe("cn() — twMerge wrapper", () => {
  test("string simples retorna a string", () => {
    expect(cn("foo")).toBe("foo");
  });

  test("concatena múltiplas strings com espaço", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("ignora valores falsy (false, null, undefined)", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  test("ignora string vazia", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  test("suporta objeto do clsx", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  test("suporta array", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  test("twMerge resolve conflito (último vence)", () => {
    // p-2 e p-4 conflitam — p-4 deve ganhar (Tailwind merge)
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("twMerge resolve conflito entre prefixos diferentes (vários não conflitam)", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
  });

  test("twMerge resolve conflito de cor (bg-red-500 vs bg-blue-500)", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  test("mantém classes não conflitantes", () => {
    expect(cn("text-sm font-bold")).toBe("text-sm font-bold");
  });

  test("input misto (string, objeto, array, falsy)", () => {
    expect(cn("base", { active: true, disabled: false }, ["flex", null], undefined)).toBe("base active flex");
  });

  test("input vazio devolve string vazia", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(undefined, null, false)).toBe("");
  });

  test("não introduz espaço extra entre classes", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
    expect(cn("a")).toBe("a");
  });
});
