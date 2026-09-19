import { criarRateLimit } from "../middleware/rate-limit";

export const JANELA_CODIGO_MS = 60 * 60 * 1000;
export const MAX_CODIGOS_POR_JANELA = 3;

export function criarLimiteCodigo() {
  const limitar = criarRateLimit({
    janelaMs: JANELA_CODIGO_MS,
    max: MAX_CODIGOS_POR_JANELA,
    nome: `codigo-email-${crypto.randomUUID()}`,
  });

  return (email: string) => limitar(email.trim().toLowerCase());
}

export const limitarCodigoPorEmail = criarLimiteCodigo();
