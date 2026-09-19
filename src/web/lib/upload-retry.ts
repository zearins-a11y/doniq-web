export const MAX_TENTATIVAS_UPLOAD = 6;

export function erroUploadSemConexao(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === undefined || status === 0;
}

/** Erro do servidor que não melhora com retry automático. */
export function erroUploadPermanente(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 400 || status === 401 || status === 403 || status === 413 || status === 422;
}

export function statusDepoisDaFalha(
  err: unknown,
  tentativas: number,
): "pending" | "failed" {
  if (erroUploadSemConexao(err)) return "pending";
  return erroUploadPermanente(err) || tentativas >= MAX_TENTATIVAS_UPLOAD
    ? "failed"
    : "pending";
}
