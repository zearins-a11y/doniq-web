/**
 * Normalização e portão anti-alucinação.
 *
 * Princípio: o modelo sugere, este módulo decide. Nada entra no banco sem passar
 * por aqui. Sem dependência externa de propósito — este é o arquivo que precisa
 * ser testável e estável.
 */

import { somarDias } from "./tempo";

export const CAMPOS_FATO = ["empresa", "contato", "cargo", "objecao", "proxima_acao", "data_iso"] as const;

/**
 * Campos cujo VALOR precisa aparecer dentro da própria evidência.
 * Nome próprio o modelo não pode reescrever: ou saiu da boca do vendedor, ou não existe.
 * Campos de interpretação (objecao, proxima_acao, resumo) ficam de fora de propósito —
 * ali resumir é o trabalho.
 */
export const CAMPOS_LITERAIS = ["empresa", "contato", "cargo"] as const;
export const CAMPOS_TEXTO = [
  "empresa",
  "contato",
  "cargo",
  "resumo",
  "resumo_narrativo",
  "email_cliente",
  "objecao",
  "proxima_acao",
  "campo_a_confirmar",
] as const;

export const TEMPERATURAS = new Set(["quente", "morna", "fria"]);

export const TAGS_VALIDAS = new Set([
  "curioso",
  "desconfiado",
  "decisor",
  "apressado",
  "cético",
  "cetico",
  "entusiasmado",
  "evasivo",
  "amistoso",
  "objetivo",
  "indeciso",
  "detalhista",
]);

// formas que o modelo usa para dizer "não sei" — equivalem a campo vazio
const LIXO = new Set([
  "null",
  "none",
  "n/a",
  "na",
  "-",
  "--",
  "?",
  "não informado",
  "nao informado",
  "não mencionado",
  "nao mencionado",
  "não citado",
  "nao citado",
  "desconhecido",
  "não identificado",
  "nao identificado",
  "sem informação",
  "sem informacao",
  "quente|morna|fria",
  "não se aplica",
  "nao se aplica",
  "vazio",
  "string",
]);

export interface Relato {
  empresa: string;
  contato: string;
  cargo: string;
  telefone: string;
  resumo: string;
  resumo_narrativo: string;
  email_cliente: string;
  proximas_perguntas: string[];
  objecao: string;
  proxima_acao: string;
  data_iso: string;
  hora: string;
  temperatura: string;
  faltou_perguntar: string[];
  followup: string;
  precisa_confirmar: boolean;
  campo_a_confirmar: string;
  audio_ininteligivel: boolean;
  tags: string[];
  concorrentes: string[];
  numeros: string[];
  evidencia: Record<string, string>;
  confianca: Record<string, string>;
  revisado: boolean;
  prompt_versao?: string;
  modelo?: string;
  tokens_input?: number;
  tokens_output?: number;
  duracao_ms?: number;
  cache_key?: string;
}

export function novoVazio(): Relato {
  return {
    empresa: "",
    contato: "",
    cargo: "",
    telefone: "",
    resumo: "",
    resumo_narrativo: "",
    email_cliente: "",
    proximas_perguntas: [],
    objecao: "",
    proxima_acao: "",
    data_iso: "",
    hora: "",
    temperatura: "morna",
    faltou_perguntar: [],
    followup: "",
    precisa_confirmar: false,
    campo_a_confirmar: "",
    audio_ininteligivel: false,
    tags: [],
    concorrentes: [],
    numeros: [],
    evidencia: {},
    confianca: {},
    revisado: false,
    tokens_input: 0,
    tokens_output: 0,
    duracao_ms: 0,
    cache_key: "",
  };
}

/* ---------------------------------------------------------------- texto */

export function limpar(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return LIXO.has(s.toLowerCase()) ? "" : s;
}

/** Aceita lista, string única ou string com ; — devolve lista limpa e sem repetição. */
export function lista(v: unknown, maximo: number): string[] {
  if (v === null || v === undefined) return [];
  let itens: unknown[];
  if (typeof v === "string") itens = v.split(/[;\n]/);
  else if (Array.isArray(v)) itens = v;
  else return [];

  const saida: string[] = [];
  const vistos = new Set<string>();
  for (const item of itens) {
    const s = limpar(item);
    if (s && !vistos.has(s.toLowerCase())) {
      vistos.add(s.toLowerCase());
      saida.push(s);
    }
  }
  return saida.slice(0, maximo);
}

/* ---------------------------------------------------------------- telefone */

export function normalizarTelefone(v: unknown): string {
  let d = limpar(v).replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return "";
}

/** Formato que o link do WhatsApp espera. */
export function telefoneE164(v: string): string {
  const d = (v || "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : "55" + d;
}

/* ---------------------------------------------------------------- data e hora */

function dataValida(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${ano}-${p(mes)}-${p(dia)}`;
}

/**
 * Devolve YYYY-MM-DD ou "". Aceita o que o modelo costuma errar:
 * 2026-06-12 | 12/06/2026 | 12-06-26 | 12/06 (assume o próximo futuro).
 * Rejeita data implausível para visita comercial.
 *
 * `hoje` é YYYY-MM-DD no fuso do vendedor.
 */
export function normalizarData(v: unknown, hoje: string): string {
  const s = limpar(v);
  if (!s) return "";

  let d: string | null = null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    d = dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
    if (!d) return "";
  }

  if (d === null) {
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
    if (m) {
      let ano = Number(m[3]);
      if (ano < 100) ano += 2000;
      d = dataValida(ano, Number(m[2]), Number(m[1]));
      if (!d) return "";
    }
  }

  if (d === null) {
    m = /^(\d{1,2})[/-](\d{1,2})$/.exec(s); // "12/06", sem ano
    if (m) {
      const anoHoje = Number(hoje.slice(0, 4));
      for (const ano of [anoHoje, anoHoje + 1]) {
        const cand = dataValida(ano, Number(m[2]), Number(m[1]));
        if (!cand) return "";
        if (cand >= hoje) {
          d = cand;
          break;
        }
      }
    }
  }

  if (d === null) return "";
  if (d < somarDias(hoje, -3) || d > somarDias(hoje, 730)) return "";
  return d;
}

export function normalizarHora(v: unknown): string {
  const s = limpar(v);
  if (!s) return "";
  const m = /^(\d{1,2})\s*[:hH]?\s*(\d{2})?/.exec(s);
  if (!m) return "";
  const h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  if (h > 23 || mi > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- evidência */

function chave(s: string): string {
  const semAcento = (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return semAcento
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O trecho citado pelo modelo existe no que o vendedor falou?
 * Tolerância de 80% das palavras porque o modelo às vezes corrige a gramática
 * sem querer — mas paráfrase inteira não passa.
 */
export function evidenciaConfere(trecho: string, transcricao: string): boolean {
  const t = chave(trecho);
  if (t.length < 4) return false;
  const base = chave(transcricao);
  if (base.includes(t)) return true;
  const palavras = t.split(" ").filter((p) => p.length > 2);
  if (!palavras.length) return false;
  const acertos = palavras.reduce((n, p) => n + (base.includes(p) ? 1 : 0), 0);
  return acertos / palavras.length >= 0.8;
}

/**
 * Camada 2: o valor extraído está ancorado na evidência citada?
 *
 * A camada 1 só pergunta "esse trecho foi dito?". O modelo pode citar um trecho
 * verdadeiro e escrever ao lado dele um nome que nunca foi dito — e passava.
 * Aqui a exigência é de cobertura TOTAL: toda palavra significativa do valor
 * precisa estar na evidência. Sem média, sem 80%.
 */
export function valorAncorado(valor: string, trecho: string): boolean {
  const v = chave(valor);
  if (!v) return true; // campo vazio não é alucinação, é ausência
  const base = chave(trecho);
  if (!base) return false;

  // comparação por palavra inteira: "Lucas" não vale como presente em "lucasville"
  const tokens = new Set(base.split(" "));
  return v.split(" ").every((p) => tokens.has(p));
}

export function aplicarConfianca(
  relato: Relato,
  bruto: Record<string, unknown>,
  transcricao: string,
): Relato {
  const ev = (bruto.evidencia && typeof bruto.evidencia === "object" && !Array.isArray(bruto.evidencia)
    ? bruto.evidencia
    : {}) as Record<string, unknown>;
  const cf = (bruto.confianca && typeof bruto.confianca === "object" && !Array.isArray(bruto.confianca)
    ? bruto.confianca
    : {}) as Record<string, unknown>;

  const evid: Record<string, string> = {};
  const conf: Record<string, string> = {};
  const zerados: string[] = [];
  const literais = new Set<string>(CAMPOS_LITERAIS);

  for (const c of CAMPOS_FATO) {
    if (!relato[c]) {
      evid[c] = "";
      conf[c] = "vazio";
      continue;
    }
    const trecho = limpar(ev[c]);
    evid[c] = trecho;

    // camada 1 — o trecho citado foi mesmo dito?
    if (!trecho || !evidenciaConfere(trecho, transcricao)) {
      conf[c] = "baixa";
      continue;
    }

    // camada 2 — o valor extraído está dentro do trecho?
    if (literais.has(c) && !valorAncorado(relato[c], trecho)) {
      relato[c] = ""; // valor sem lastro não fica no banco nem por um instante
      evid[c] = "";
      conf[c] = "vazio";
      zerados.push(c);
      continue;
    }

    const n = String(cf[c] ?? "").toLowerCase();
    conf[c] = ["alta", "media", "baixa"].includes(n) ? n : "media";
  }

  // o motivo vai para o campo que a ficha já mostra ao vendedor
  if (zerados.length) {
    relato.precisa_confirmar = true;
    const atual = relato.campo_a_confirmar ? relato.campo_a_confirmar + "; " : "";
    relato.campo_a_confirmar = atual + zerados.join(", ") + " (não foi dito na gravação)";
  }

  relato.evidencia = evid;
  relato.confianca = conf;
  return relato;
}

export function camposParaRevisar(relato: { confianca?: Record<string, string> }): string[] {
  return CAMPOS_FATO.filter((c) => (relato.confianca ?? {})[c] === "baixa");
}

/* ---------------------------------------------------------------- principal */

/** Dict cru do LLM -> objeto com o contrato do Relato, tipado e com invariantes. */
export function normalizarRelato(bruto: unknown, hoje: string, transcricao = ""): Relato {
  const out = novoVazio();
  if (bruto === null || typeof bruto !== "object" || Array.isArray(bruto)) {
    out.audio_ininteligivel = true;
    return out;
  }
  const b = bruto as Record<string, unknown>;

  // áudio ruim vence tudo: nada de dado pela metade no banco
  if (b.audio_ininteligivel === true) {
    out.audio_ininteligivel = true;
    return out;
  }

  for (const c of CAMPOS_TEXTO) out[c] = limpar(b[c]);
  out.followup = limpar(b.followup);
  out.resumo_narrativo = limpar(b.resumo_narrativo);
  out.email_cliente = limpar(b.email_cliente);
  out.telefone = normalizarTelefone(b.telefone);

  const t = limpar(b.temperatura).toLowerCase();
  out.temperatura = TEMPERATURAS.has(t) ? t : "morna";

  out.data_iso = normalizarData(b.data_iso, hoje);
  out.hora = normalizarHora(b.hora);

  out.faltou_perguntar = lista(b.faltou_perguntar, 3);
  out.proximas_perguntas = lista(b.proximas_perguntas, 3);
  out.concorrentes = lista(b.concorrentes, 5);
  out.numeros = lista(b.numeros, 6);
  out.tags = lista(b.tags, 3).filter((x) => TAGS_VALIDAS.has(x.toLowerCase()));

  // invariantes — não dependem de o modelo ter obedecido ao prompt
  out.precisa_confirmar = Boolean(b.precisa_confirmar) || !out.data_iso;
  if (out.data_iso && !out.hora) out.hora = "09:00";
  if (!out.data_iso) {
    out.hora = "";
    if (!out.campo_a_confirmar) out.campo_a_confirmar = "data";
  }

  // sem empresa, sem contato e sem resumo não é relato de visita
  if (!out.empresa && !out.contato && !out.resumo) {
    out.audio_ininteligivel = true;
    return out;
  }

  return aplicarConfianca(out, b, transcricao);
}
