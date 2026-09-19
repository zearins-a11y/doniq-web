/**
 * Formatos de exportação do relato.
 * Três formatos: JSON, texto (WhatsApp/e-mail), Markdown (documentação).
 */

import type { Relato } from "../lib/api";

/** Objeto com os campos estruturados do relato (sem metadados internos). */
function base(r: Relato) {
  return {
    empresa: r.empresa,
    contato: r.contato,
    cargo: r.cargo || undefined,
    telefone: r.telefone || undefined,
    temperatura: r.temperatura,
    resumo: r.resumo,
    objecao: r.objecao || undefined,
    proxima_acao: r.proxima_acao || undefined,
    quando: r.data_iso ? `${r.data_iso}${r.hora ? " " + r.hora : ""}` : undefined,
    followup: r.followup || undefined,
    tags: r.tags?.length ? r.tags : undefined,
    concorrentes: r.concorrentes?.length ? r.concorrentes : undefined,
    numeros: r.numeros?.length ? r.numeros : undefined,
    revisado: r.revisado,
    criado_em: r.created_at,
  };
}

export function exportarJson(r: Relato): string {
  return JSON.stringify(base(r), null, 2);
}

export function exportarTexto(r: Relato): string {
  const b = base(r);
  const quando = b.quando ? `\nQuando: ${b.quando}` : "\nQuando: a confirmar";
  return [
    `Empresa: ${b.empresa}`,
    `Contato: ${b.contato}${b.cargo ? ` (${b.cargo})` : ""}${b.telefone ? ` · ${b.telefone}` : ""}`,
    `Temperatura: ${b.temperatura}`,
    `\nResumo:\n${b.resumo}`,
    `\nObjeção: ${b.objecao || "—"}`,
    `\nPróxima ação: ${b.proxima_acao || "—"}`,
    quando,
    b.concorrentes?.length ? `\nConcorrentes: ${b.concorrentes.join(", ")}` : "",
    b.numeros?.length ? `\nNúmeros: ${b.numeros.join(" | ")}` : "",
    b.tags?.length ? `\nTags: ${b.tags.join(", ")}` : "",
    b.followup ? `\nMensagem:\n${b.followup}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function exportarMarkdown(r: Relato): string {
  const b = base(r);
  const quando = b.quando ? b.quando : "_a confirmar_";
  const revisado = b.revisado ? "✅ sim" : "❌ não";
  return [
    `# ${b.empresa}`,
    "",
    `| Campo | Valor |`,
    `|---|---|`,
    `| Contato | ${b.contato}${b.cargo ? ` (${b.cargo})` : ""}${b.telefone ? ` · ${b.telefone}` : ""} |`,
    `| Temperatura | ${b.temperatura} |`,
    `| Quando | ${quando} |`,
    `| Revisado | ${revisado} |`,
    "",
    `## Resumo`,
    b.resumo || "_não informado_",
    "",
    b.objecao ? `## Objeção\n${b.objecao}` : "",
    "",
    `## Próxima ação\n${b.proxima_acao || "_não informada_"}`,
    "",
    b.concorrentes?.length ? `## Concorrentes\n${b.concorrentes.map((c) => `- ${c}`).join("\n")}` : "",
    b.numeros?.length ? `\n## Números\n${b.numeros.map((n) => `- ${n}`).join("\n")}` : "",
    b.tags?.length ? `\n## Tags\n${b.tags.map((t) => `- ${t}`).join("\n")}` : "",
    b.followup ? `\n## Mensagem pro cliente\n${b.followup}` : "",
    "",
    `> Gerado pelo Doniq em ${b.criado_em ? new Date(b.criado_em).toLocaleString("pt-BR") : "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type FormatoExport = "json" | "texto" | "markdown";

export function exportar(r: Relato, formato: FormatoExport): string {
  if (formato === "json") return exportarJson(r);
  if (formato === "texto") return exportarTexto(r);
  return exportarMarkdown(r);
}
