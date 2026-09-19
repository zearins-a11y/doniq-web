/**
 * Datas para os CRMs. O relato guarda dia (YYYY-MM-DD) e hora (HH:MM) no fuso do
 * vendedor; os CRMs querem ISO-8601. O Ollow exige offset explícito e devolve UTC.
 * Brasil não tem horário de verão desde 2019, então -03:00 é constante.
 */

export const OFFSET_BR = "-03:00";

/** "2026-08-12" + "14:30" -> "2026-08-12T14:30:00-03:00". */
export function isoComOffsetBr(dataIso: string, hora = ""): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso || "")) return "";
  const h = /^\d{2}:\d{2}$/.test(hora) ? hora : "09:00";
  return `${dataIso}T${h}:00${OFFSET_BR}`;
}

/** Mesmo instante em UTC com offset explícito: "2026-08-12T17:30:00+00:00". */
export function isoUtcDe(dataIso: string, hora = ""): string {
  const comOffset = isoComOffsetBr(dataIso, hora);
  if (!comOffset) return "";
  return new Date(comOffset).toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** Agora em UTC, no formato que os três CRMs aceitam. */
export function agoraUtc(agora: Date = new Date()): string {
  return agora.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}
