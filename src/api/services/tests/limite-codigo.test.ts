import { expect, test } from "bun:test";
import {
  JANELA_CODIGO_MS,
  MAX_CODIGOS_POR_JANELA,
  criarLimiteCodigo,
} from "../limite-codigo";

test("permite no máximo três códigos por e-mail em uma hora", async () => {
  const limitar = criarLimiteCodigo();

  for (let n = 0; n < MAX_CODIGOS_POR_JANELA; n++) {
    const resultado = await limitar("Pessoa@Empresa.com.br ");
    expect(resultado.limitado).toBe(false);
  }

  const bloqueado = await limitar("pessoa@empresa.com.br");
  expect(bloqueado.limitado).toBe(true);
  expect(bloqueado.resetEm).toBeGreaterThan(Date.now());
  expect(bloqueado.resetEm).toBeLessThanOrEqual(Date.now() + JANELA_CODIGO_MS);
});

test("não mistura limites de endereços diferentes", async () => {
  const limitar = criarLimiteCodigo();

  for (let n = 0; n < MAX_CODIGOS_POR_JANELA; n++) {
    await limitar("a@empresa.com.br");
  }

  expect((await limitar("a@empresa.com.br")).limitado).toBe(true);
  expect((await limitar("b@empresa.com.br")).limitado).toBe(false);
});
