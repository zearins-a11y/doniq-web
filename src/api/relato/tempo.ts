/** Tudo que envolve data passa por aqui. Servidor roda em UTC; vendedor, não. */

export const BR = "America/Sao_Paulo";

/**
 * "Agora" no fuso do vendedor. JS não tem datetime com fuso, então guardamos as
 * partes já convertidas — é o que `validators` e `prompts` precisam.
 */
export interface AgoraBR {
  /** YYYY-MM-DD no fuso America/Sao_Paulo */
  readonly dia: string;
  /** ISO-8601 com offset, ex: 2026-08-04T15:32:10-03:00 */
  readonly iso: string;
}

function partes(d: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}

function offsetBR(d: Date): string {
  const p = partes(d);
  const comoUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const minutos = Math.round((comoUtc - d.getTime()) / 60000);
  const sinal = minutos < 0 ? "-" : "+";
  const abs = Math.abs(minutos);
  return `${sinal}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function agoraBr(agora: Date = new Date()): AgoraBR {
  const p = partes(agora);
  const hora = p.hour === "24" ? "00" : p.hour;
  return {
    dia: `${p.year}-${p.month}-${p.day}`,
    iso: `${p.year}-${p.month}-${p.day}T${hora}:${p.minute}:${p.second}${offsetBR(agora)}`,
  };
}

export function hojeBr(agora: Date = new Date()): string {
  return agoraBr(agora).dia;
}

/** Soma dias a um YYYY-MM-DD sem passar por fuso nenhum. */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

export function amanhaBr(agora: Date = new Date()): string {
  return somarDias(hojeBr(agora), 1);
}

export function isoUtc(agora: Date = new Date()): string {
  return agora.toISOString().replace("Z", "+00:00");
}
