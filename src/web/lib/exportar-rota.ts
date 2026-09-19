/**
 * Módulo de Exportação e Compartilhamento de Rota do Dia de Campo.
 *
 * Funcionalidades:
 *  1. Geração de texto limpo e profissional para compartilhamento via WhatsApp com gestores ou equipe.
 *  2. Link direto wa.me para despacho rápido do cronograma de visitas com 1 toque.
 *  3. Cópia rápida para a área de transferência.
 *  4. Acionamento de impressão / exportação de PDF de prancheta de campo.
 */

import type { EventoAgenda } from "./api";

function formatarDataLegivel(iso: string): string {
  if (!iso) return "";
  const partes = iso.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return iso;
}

/**
 * Ordena eventos cronologicamente por hora (sem hora fica no início ou fim).
 */
export function ordenarEventosCronologicamente(eventos: EventoAgenda[]): EventoAgenda[] {
  return [...eventos].sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  });
}

/**
 * Gera o texto formatado para envio no WhatsApp.
 */
export function gerarTextoWhatsAppRota(
  eventosDoDia: EventoAgenda[],
  hojeIso: string,
  nomeVendedor?: string,
): string {
  const dataFormatada = formatarDataLegivel(hojeIso);
  const ordenados = ordenarEventosCronologicamente(eventosDoDia);

  if (ordenados.length === 0) {
    return `🚗 *ROTA DE CAMPO — ${dataFormatada}*\n\nNenhum compromisso agendado para hoje. Dia livre para prospecção ativa e reativação de clientes.\n\n⚡ Doniq`;
  }

  const linhas: string[] = [
    `🚗 *ROTA DE VISITAS — ${dataFormatada}*`,
    nomeVendedor ? `👤 Vendedor: ${nomeVendedor}` : "",
    `📊 Total: ${ordenados.length} ${ordenados.length === 1 ? "atendimento" : "atendimentos"} agendado(s)`,
    "",
    "───────────────",
  ].filter(Boolean);

  ordenados.forEach((ev, i) => {
    const horario = ev.hora ? `⏰ *${ev.hora}*` : "⏰ *Horário flexível*";
    const empresa = ev.titulo ? `🏢 *${ev.titulo}*` : "🏢 *Cliente sem nome*";
    const contato = [ev.contato, ev.telefone].filter(Boolean).join(" · ");
    const endereco = ev.local ? `📍 ${ev.local}` : "📍 Endereço a confirmar";
    const pauta = ev.detalhe || ev.selo || "Visita comercial";

    linhas.push(`*${i + 1}.* ${horario} — ${empresa}`);
    if (contato) linhas.push(`   👤 Contato: ${contato}`);
    linhas.push(`   ${endereco}`);
    linhas.push(`   🎯 Pauta: ${pauta}`);
    linhas.push("");
  });

  linhas.push("───────────────");
  linhas.push("⚡ Rota gerada pelo Doniq");

  return linhas.join("\n");
}

/**
 * Gera link universal wa.me com a rota codificada.
 */
export function gerarLinkWhatsAppRota(
  eventosDoDia: EventoAgenda[],
  hojeIso: string,
  telefoneDestino = "",
  nomeVendedor?: string,
): string {
  const texto = gerarTextoWhatsAppRota(eventosDoDia, hojeIso, nomeVendedor);
  const telLimpo = telefoneDestino.replace(/\D/g, "");
  const base = telLimpo ? `https://wa.me/55${telLimpo}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

/**
 * Aciona a impressão do navegador para gerar PDF de viagem ou imprimir em prancheta.
 */
export function imprimirRoteiroDia(): void {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}
