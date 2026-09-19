export type EstadoVoz =
  | "pronto"
  | "gravando"
  | "pausado"
  | "processando"
  | "offline"
  | "concluido"
  | "erro";

export function resolverEstadoVoz({
  erro,
  gravando,
  pausado,
  pendentes,
  online,
  concluido,
}: {
  erro: boolean;
  gravando: boolean;
  pausado: boolean;
  pendentes: number;
  online: boolean;
  concluido: boolean;
}): EstadoVoz {
  if (erro) return "erro";
  if (pausado) return "pausado";
  if (gravando) return "gravando";
  if (pendentes > 0 && !online) return "offline";
  if (pendentes > 0) return "processando";
  if (concluido) return "concluido";
  return "pronto";
}

export function nivelVozDeDecibeis(decibeis?: number): number {
  if (decibeis === undefined || !Number.isFinite(decibeis)) return 0;
  return Math.min(1, Math.max(0, (decibeis + 60) / 60));
}
