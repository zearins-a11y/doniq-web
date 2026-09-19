import { describe, expect, test } from "bun:test";
import { blocoSemSom } from "../use-recorder";

describe("detecção de silêncio da gravação web", () => {
  test("descarta somente bloco silencioso medido por um monitor ativo", () => {
    expect(blocoSemSom(0, true)).toBe(true);
    expect(blocoSemSom(0.02, true)).toBe(false);
  });

  test("falha do AudioContext não transforma fala não medida em silêncio", () => {
    expect(blocoSemSom(0, false)).toBe(false);
  });
});
