/**
 * Construtor de iCalendar (RFC 5545). Puro: entra evento, sai texto.
 *
 * As regras do formato que mais quebram cliente de calendário, e que estão
 * implementadas aqui de propósito:
 *  - a quebra de linha é **CRLF**, não LF. Outlook rejeita arquivo com LF;
 *  - linha de conteúdo não passa de **75 octetos** — octeto, não caractere. Como
 *    o texto do vendedor tem acento (2 bytes em UTF-8), contar caractere geraria
 *    linha longa demais e cliente engasgando em nome de empresa comprido;
 *  - dentro de texto, `\`, `;`, `,` e quebra de linha são escapados. Dois-pontos
 *    **não** é escapado (é erro comum: escapar `:` estraga a hora dentro da
 *    descrição);
 *  - hora com fuso exige `TZID` + um bloco `VTIMEZONE` no arquivo. Google aceita
 *    só o TZID, mas Apple Calendar e Outlook querem o bloco. Como o Brasil não
 *    tem horário de verão desde 2019, o bloco é estático de -03:00.
 *
 * O que o feed **não** leva: transcrição e áudio. Agenda é lugar de compromisso,
 * não de prova da conversa — e a URL do feed, por natureza, é pública para quem
 * tiver o link.
 */

/** Fuso do vendedor. Sem horário de verão desde 2019, então offset é constante. */
export const TZID = "America/Sao_Paulo";

const CRLF = "\r\n";
const LIMITE_OCTETOS = 75;

export type EventoIcs = {
  /** Identificador estável — o mesmo evento tem que ter o mesmo UID sempre. */
  uid: string;
  /** YYYY-MM-DD no fuso do vendedor. */
  dia: string;
  /** HH:MM. Vazio vira evento de dia inteiro. */
  hora: string;
  /** Duração em minutos. Ignorado em evento de dia inteiro. */
  minutos?: number;
  titulo: string;
  descricao?: string;
  local?: string;
  /** Minutos antes para o alarme. 0 ou ausente = sem alarme. */
  alarmeMin?: number;
  /** Quando o registro mudou pela última vez (ISO). Vira LAST-MODIFIED. */
  atualizadoEm?: string;
  /** Evento cancelado continua no feed com STATUS:CANCELLED para sumir da agenda. */
  cancelado?: boolean;
};

/** Escapa texto de propriedade. Dois-pontos fica como está, de propósito. */
export function escaparTexto(valor: string): string {
  return valor
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Dobra a linha em 75 octetos, contando bytes de UTF-8 e nunca partindo um
 * caractere no meio. A continuação começa com um espaço, que o leitor descarta.
 */
export function dobrarLinha(linha: string): string {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(linha) <= LIMITE_OCTETOS) return linha;

  const partes: string[] = [];
  let atual = "";
  let atualBytes = 0;
  let primeira = true;

  // Intl.Segmenter separaria grafema; para o nosso texto o code point basta e
  // `for...of` já itera por code point (não parte emoji ao meio).
  for (const ch of linha) {
    const b = bytes(ch);
    // A partir da segunda linha, o espaço inicial também conta no limite.
    const teto = primeira ? LIMITE_OCTETOS : LIMITE_OCTETOS - 1;
    if (atualBytes + b > teto) {
      partes.push(atual);
      primeira = false;
      atual = ch;
      atualBytes = b;
    } else {
      atual += ch;
      atualBytes += b;
    }
  }
  partes.push(atual);
  return partes.map((p, i) => (i === 0 ? p : ` ${p}`)).join(CRLF);
}

/** "2026-08-12" -> "20260812". */
export function dataCompacta(dia: string): string {
  return dia.replace(/-/g, "");
}

/** Instante em UTC no formato do formato: "20260811T173000Z". */
export function carimboUtc(quando: Date): string {
  return `${quando.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "")}Z`;
}

/** Soma minutos a (dia, hora) sem passar por fuso. Devolve YYYYMMDDTHHMMSS. */
export function fimLocal(dia: string, hora: string, minutos: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const t = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0));
  t.setUTCMinutes(t.getUTCMinutes() + minutos);
  const p = (x: number) => String(x).padStart(2, "0");
  return (
    `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}` +
    `T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`
  );
}

/**
 * VTIMEZONE estático de America/Sao_Paulo. O Brasil abandonou o horário de verão
 * em 2019, então não há regra de transição para declarar — e um bloco fixo é
 * mais confiável que uma tabela que ninguém vai manter.
 */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "X-LIC-LOCATION:America/Sao_Paulo",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZNAME:-03",
  "TZOFFSETFROM:-0300",
  "TZOFFSETTO:-0300",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Linhas de um VEVENT. Recebe o "agora" para o DTSTAMP ser testável. */
export function linhasEvento(ev: EventoIcs, agora: Date): string[] {
  const temHora = /^\d{2}:\d{2}$/.test(ev.hora || "");
  const linhas: string[] = ["BEGIN:VEVENT", `UID:${ev.uid}`, `DTSTAMP:${carimboUtc(agora)}`];

  if (temHora) {
    const inicio = `${dataCompacta(ev.dia)}T${ev.hora.replace(":", "")}00`;
    linhas.push(`DTSTART;TZID=${TZID}:${inicio}`);
    linhas.push(`DTEND;TZID=${TZID}:${fimLocal(ev.dia, ev.hora, ev.minutos ?? 60)}`);
  } else {
    // Dia inteiro: DTEND é exclusivo, então aponta para o dia seguinte.
    const [a, m, d] = ev.dia.split("-").map(Number);
    const t = new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1));
    t.setUTCDate(t.getUTCDate() + 1);
    const p = (x: number) => String(x).padStart(2, "0");
    linhas.push(`DTSTART;VALUE=DATE:${dataCompacta(ev.dia)}`);
    linhas.push(
      `DTEND;VALUE=DATE:${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`,
    );
  }

  linhas.push(`SUMMARY:${escaparTexto(ev.titulo)}`);
  if (ev.descricao) linhas.push(`DESCRIPTION:${escaparTexto(ev.descricao)}`);
  if (ev.local) linhas.push(`LOCATION:${escaparTexto(ev.local)}`);
  if (ev.atualizadoEm) {
    const quando = new Date(ev.atualizadoEm);
    if (!Number.isNaN(quando.getTime())) linhas.push(`LAST-MODIFIED:${carimboUtc(quando)}`);
  }
  linhas.push(`STATUS:${ev.cancelado ? "CANCELLED" : "CONFIRMED"}`);
  linhas.push("TRANSP:OPAQUE");

  if (ev.alarmeMin && ev.alarmeMin > 0 && temHora) {
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-PT${Math.round(ev.alarmeMin)}M`,
      `DESCRIPTION:${escaparTexto(ev.titulo)}`,
      "END:VALARM",
    );
  }

  linhas.push("END:VEVENT");
  return linhas;
}

export type OpcoesCalendario = {
  /** Nome que aparece na lista de calendários do cliente. */
  nome: string;
  /** Dica de atualização. Google ignora; Outlook e Apple respeitam. */
  ttlHoras?: number;
  agora?: Date;
};

/**
 * Monta o arquivo inteiro. Um `.ics` de um evento só (para "adicionar à agenda")
 * é o mesmo construtor com um evento na lista — não existe caminho separado.
 */
export function calendarioIcs(eventos: EventoIcs[], opcoes: OpcoesCalendario): string {
  const agora = opcoes.agora ?? new Date();
  const ttl = Math.max(1, Math.round(opcoes.ttlHoras ?? 4));
  const linhas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//doniq//Relato de Visita//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTexto(opcoes.nome)}`,
    `X-WR-TIMEZONE:${TZID}`,
    // Os dois dizem a mesma coisa para clientes diferentes.
    `X-PUBLISHED-TTL:PT${ttl}H`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${ttl}H`,
    ...VTIMEZONE,
  ];
  for (const ev of eventos) linhas.push(...linhasEvento(ev, agora));
  linhas.push("END:VCALENDAR");

  // Dobra por último: a dobra é do formato de arquivo, não de cada propriedade.
  return `${linhas.map(dobrarLinha).join(CRLF)}${CRLF}`;
}
