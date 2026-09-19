import { describe, expect, test } from "bun:test";
import { resolverVarianteFalar } from "../variante-falar";

describe("variante visual da etapa Falar", () => {
  test("usa a versão aprovada por padrão", () => {
    expect(resolverVarianteFalar("")).toBe("aprovada");
    expect(resolverVarianteFalar("?sem-studio=1")).toBe("aprovada");
  });

  test("mantém compatibilidade com o parâmetro antigo de aprovação", () => {
    expect(resolverVarianteFalar("?falar-aprovado=1")).toBe("aprovada");
  });

  test("ativa a versão anterior somente com o fallback explícito", () => {
    expect(resolverVarianteFalar("?falar-legado=1")).toBe("legada");
    expect(resolverVarianteFalar("?falar-legado=0")).toBe("aprovada");
  });

  test("o fallback explícito prevalece quando os dois parâmetros aparecem", () => {
    expect(
      resolverVarianteFalar("?falar-aprovado=1&falar-legado=1"),
    ).toBe("legada");
  });
});
