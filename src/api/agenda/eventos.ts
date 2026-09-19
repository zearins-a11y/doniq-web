/**
 * Evento canônico da agenda. Existe porque a grade tem duas origens de dado que
 * não podem virar uma tabela só:
 *
 *  - **relato**: prova do que aconteceu (ou do que está marcado e já foi
 *    gravado). Passa pelo portão anti-alucinação, conta no painel do gestor.
 *  - **compromisso**: intenção. O vendedor marcou na mão, ainda não visitou.
 *
 * Misturar os dois na tabela `relatos` corromperia "visitas por vendedor" (o
 * gestor passaria a contar intenção como visita feita), o histórico e a
 * exportação. Então são duas tabelas — e este arquivo é o único lugar que sabe
 * transformar as duas na mesma coisa. Grade, lista do dia e `.ics` consomem daqui;
 * ninguém lê linha de banco direto para montar agenda.
 */

import type { EventoIcs } from "./ics";

export type OrigemEvento = "relato" | "compromisso";

export type EventoAgenda = {
  /** Único na agenda inteira: prefixo da origem + id da linha. */
  id: string;
  origem: OrigemEvento;
  /** YYYY-MM-DD no fuso do vendedor. Vazio = "sem data combinada". */
  dia: string;
  /** HH:MM ou vazio (aí é evento de dia inteiro). */
  hora: string;
  minutos: number;
  /** Primeira linha do cartão: normalmente a empresa. */
  titulo: string;
  /** Segunda linha: próxima ação do relato, ou o objetivo do compromisso. */
  detalhe: string;
  contato: string;
  telefone: string;
  local: string;
  /** Só existe quando a origem é relato — a tela linka para o relatório. */
  relatoId: string;
  /** Compromisso que já virou visita gravada, ou que o vendedor deu baixa. */
  concluido: boolean;
  cancelado: boolean;
  atualizadoEm: string;
  temperatura?: string;
  objecao?: string;
};

/** O que este módulo precisa de uma linha de `relatos`. Nada além disso. */
export type LinhaRelato = {
  relatoId: string;
  empresa: string;
  contato: string;
  telefone: string;
  proximaAcao: string;
  resumo: string;
  dataIso: string;
  hora: string;
  createdAt: string;
  temperatura?: string;
  objecao?: string;
};

/** O que este módulo precisa de uma linha de `compromissos`. */
export type LinhaCompromisso = {
  compromissoId: string;
  empresa: string;
  contato: string;
  telefone: string;
  objetivo: string;
  endereco: string;
  dataIso: string;
  hora: string;
  minutos: number;
  status: string;
  relatoId: string;
  atualizadoEm: string;
};

/** Duração padrão de uma visita. Uma hora é o que o vendedor bloqueia na prática. */
export const MINUTOS_PADRAO = 60;

export function deRelato(r: LinhaRelato): EventoAgenda {
  return {
    id: `relato:${r.relatoId}`,
    origem: "relato",
    dia: r.dataIso || "",
    hora: r.hora || "",
    minutos: MINUTOS_PADRAO,
    titulo: r.empresa || r.contato || "Visita sem empresa",
    // A próxima ação é o que importa na agenda; o resumo é reserva para relato
    // antigo que não trouxe próxima ação.
    detalhe: r.proximaAcao || r.resumo || "",
    contato: r.contato || "",
    telefone: r.telefone || "",
    local: "",
    relatoId: r.relatoId,
    concluido: true,
    cancelado: false,
    atualizadoEm: r.createdAt || "",
    temperatura: r.temperatura || "morna",
    objecao: r.objecao || "",
  };
}

export function deCompromisso(c: LinhaCompromisso): EventoAgenda {
  return {
    id: `compromisso:${c.compromissoId}`,
    origem: "compromisso",
    dia: c.dataIso || "",
    hora: c.hora || "",
    minutos: c.minutos > 0 ? c.minutos : MINUTOS_PADRAO,
    titulo: c.empresa || c.contato || "Visita a marcar",
    detalhe: c.objetivo || "",
    contato: c.contato || "",
    telefone: c.telefone || "",
    local: c.endereco || "",
    relatoId: c.relatoId || "",
    concluido: c.status === "feito",
    cancelado: c.status === "cancelado",
    atualizadoEm: c.atualizadoEm || "",
  };
}

/**
 * Ordena o dia: quem tem hora vem antes, na hora; quem não tem cai no fim. Sem
 * hora no meio da lista faz o vendedor perder o próximo horário de vista.
 */
export function ordenarEventos(eventos: EventoAgenda[]): EventoAgenda[] {
  return [...eventos].sort((a, b) => {
    if (a.dia !== b.dia) return a.dia < b.dia ? -1 : 1;
    if (!a.hora && !b.hora) return a.titulo.localeCompare(b.titulo, "pt-BR");
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    if (a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}

/**
 * Junta relatos e compromissos. Compromisso que já virou relato gravado sai:
 * senão o vendedor vê a mesma visita duas vezes no mesmo dia — o erro clássico
 * de agenda sincronizada.
 */
export function unirEventos(relatos: LinhaRelato[], compromissos: LinhaCompromisso[]): EventoAgenda[] {
  const jaGravados = new Set(relatos.map((r) => r.relatoId));
  const deIntencao = compromissos
    .filter((c) => !(c.relatoId && jaGravados.has(c.relatoId)))
    .map(deCompromisso);
  return ordenarEventos([...relatos.map(deRelato), ...deIntencao]);
}

/** Rótulo curto de status para a tela. Vazio quando não há nada a dizer. */
export function selo(ev: EventoAgenda): string {
  if (ev.cancelado) return "cancelada";
  if (ev.origem === "relato") return "gravada";
  if (ev.concluido) return "feita";
  return "a fazer";
}

/**
 * Texto que vai para o corpo do evento no calendário. Traz o que ajuda na porta
 * do cliente — contato, telefone, próxima ação — e **nunca** a transcrição: o
 * feed é URL pública para quem tem o link, e a fala do cliente não sai daqui.
 */
export function descricaoEvento(ev: EventoAgenda): string {
  const partes: string[] = [];
  if (ev.detalhe) partes.push(ev.detalhe);
  if (ev.contato) partes.push(`Contato: ${ev.contato}${ev.telefone ? ` — ${ev.telefone}` : ""}`);
  else if (ev.telefone) partes.push(`Telefone: ${ev.telefone}`);
  partes.push(ev.origem === "relato" ? "Visita já gravada no doniq." : "Visita marcada no doniq.");
  return partes.join("\n");
}

/**
 * Converte para o evento do `.ics`. O UID é estável e carrega o domínio do
 * produto: o mesmo compromisso editado atualiza o evento no Google em vez de
 * criar um segundo.
 */
export function paraIcs(ev: EventoAgenda, alarmeMin = 60): EventoIcs {
  return {
    uid: `${ev.id.replace(":", "-")}@doniq.com.br`,
    dia: ev.dia,
    hora: ev.hora,
    minutos: ev.minutos,
    titulo: ev.hora ? ev.titulo : `${ev.titulo} (sem hora combinada)`,
    descricao: descricaoEvento(ev),
    local: ev.local,
    alarmeMin,
    atualizadoEm: ev.atualizadoEm,
    cancelado: ev.cancelado,
  };
}

/**
 * Link "adicionar ao Google Calendar" — o caminho de mão única que entra na hora,
 * sem esperar as 8 a 24 horas do feed assinado. Não atualiza depois: é cópia.
 */
export function linkGoogle(ev: EventoAgenda): string {
  const dt = ev.dia.replace(/-/g, "");
  const inicio = ev.hora ? `${dt}T${ev.hora.replace(":", "")}00` : dt;
  const fim = ev.hora ? `${dt}T${fimHhmm(ev.hora, ev.minutos)}00` : dt;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titulo,
    dates: `${inicio}/${fim}`,
    details: descricaoEvento(ev),
    ctz: "America/Sao_Paulo",
  });
  if (ev.local) q.set("location", ev.local);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** HH:MM + minutos -> "HHMM", virando o dia se precisar (raro, mas acontece). */
function fimHhmm(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = ((h ?? 0) * 60 + (m ?? 0) + (minutos || MINUTOS_PADRAO)) % 1440;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(Math.floor(total / 60))}${p(total % 60)}`;
}
