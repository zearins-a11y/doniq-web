/**
 * Camada única de normalização: relato do banco -> RelatoCanonico.
 * Nada de rede aqui — é função pura, testável.
 *
 * Não vai para o CRM: evidencia, confianca, prompt_versao, modelo,
 * faltou_perguntar, campo_a_confirmar (metadado interno do app).
 */

import { telefoneE164 } from "../relato/validators";
import type { RelatoCanonico } from "./tipos";

/** Só o que o canônico precisa do relato — desacopla do schema. */
export type RelatoEntrada = {
  relatoId: string;
  clientId?: string | null;
  empresa: string;
  contato: string;
  cargo: string;
  telefone: string;
  resumo: string;
  transcricao: string;
  objecao: string;
  proximaAcao: string;
  followup: string;
  dataIso: string;
  hora: string;
  temperatura: string;
  tags: string[];
  concorrentes: string[];
  numeros: string[];
  createdAt: string;
};

const ROTULO_TEMPERATURA: Record<string, string> = {
  quente: "Quente",
  morna: "Morna",
  fria: "Fria",
};

/** Chave de idempotência externa — reaproveita client_id quando existe. */
export function chaveDedupe(r: Pick<RelatoEntrada, "relatoId" | "clientId">): string {
  const bruta = (r.clientId || r.relatoId || "").trim().toLowerCase();
  return `relato-visita:${bruta.replace(/[^a-z0-9_-]+/g, "-")}`;
}

/** Telefone em E.164 com o "+" — formato que os três CRMs aceitam. */
export function telefoneInternacional(telefone: string): string {
  const e164 = telefoneE164(telefone);
  return e164 ? `+${e164}` : "";
}

function dataBr(iso: string): string {
  const [a, m, d] = (iso || "").split("-");
  return a && m && d ? `${d}/${m}/${a}` : "";
}

function linhas(...partes: (string | number | false | null | undefined)[]): string {
  return partes.filter((p): p is string => Boolean(p && String(p).trim())).join("\n");
}

/** Chancela institucional de conformidade com o Pacto de Confiança e Privacidade. */
export const CHANCELA_DONIQ =
  "⚡ Relatado por voz via Doniq · Síntese estruturada por IA em conformidade com o Pacto de Privacidade";

export function paraCanonico(r: RelatoEntrada): RelatoCanonico {
  const empresa = (r.empresa || "").trim();
  const contato = (r.contato || "").trim();
  const temperatura = ROTULO_TEMPERATURA[(r.temperatura || "").toLowerCase()] ?? "Morna";
  const visita = dataBr(r.dataIso);

  const titulo = empresa || contato || "Visita sem empresa identificada";

  const descricao = linhas(
    r.resumo?.trim(),
    r.objecao?.trim() && `Objeção: ${r.objecao.trim()}`,
    r.concorrentes?.length && `Concorrentes: ${r.concorrentes.join(", ")}`,
    r.numeros?.length && `Números citados: ${r.numeros.join("; ")}`,
  );

  const anotacao = linhas(
    `Relato de visita${visita ? ` — ${visita}${r.hora ? ` ${r.hora}` : ""}` : ""}`,
    r.resumo?.trim() && `\nResumo: ${r.resumo.trim()}`,
    r.objecao?.trim() && `Objeção: ${r.objecao.trim()}`,
    r.concorrentes?.length && `Concorrentes: ${r.concorrentes.join(", ")}`,
    r.numeros?.length && `Números: ${r.numeros.join("; ")}`,
    r.transcricao?.trim() && `\nTranscrição:\n${r.transcricao.trim()}`,
    `\n---\n${CHANCELA_DONIQ}`,
  );

  const textoTarefa = linhas(
    r.proximaAcao?.trim() || (r.followup?.trim() ? "Follow-up da visita" : ""),
    r.followup?.trim() && r.proximaAcao?.trim() ? `Follow-up: ${r.followup.trim()}` : "",
  );

  return {
    chave: chaveDedupe(r),
    organizacao: { nome: empresa },
    pessoa: {
      nome: contato,
      cargo: (r.cargo || "").trim(),
      telefone: telefoneInternacional(r.telefone || ""),
    },
    negocio: {
      titulo,
      descricao,
      temperatura,
      tags: (r.tags ?? []).map((t) => t.trim()).filter(Boolean),
    },
    anotacao: { texto: anotacao },
    tarefa: textoTarefa ? { texto: textoTarefa, dataIso: r.dataIso || "", hora: r.hora || "" } : null,
    extras: {
      objecao: (r.objecao || "").trim(),
      concorrentes: r.concorrentes ?? [],
      numeros: r.numeros ?? [],
      visitaEm: r.dataIso || "",
    },
  };
}
