import { describe, expect, test } from "bun:test";
import { contas } from "../contas";

describe("autenticação passwordless", () => {
  test("não expõe entrada direta sem prova de acesso ao e-mail", () => {
    expect(Object.hasOwn(contas, "entrar")).toBe(false);
    expect(Object.hasOwn(contas, "pedirCodigo")).toBe(true);
    expect(Object.hasOwn(contas, "entrarComCodigo")).toBe(true);
  });
});
