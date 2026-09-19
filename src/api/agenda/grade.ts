/**
 * Grade de mês, pura: entra "2026-08" e sai a matriz de semanas que a tela
 * desenha. Nada de fuso aqui — o dia já chega como YYYY-MM-DD no fuso do
 * vendedor (quem converte é `relato/tempo.ts`). Se esta função tocasse `new
 * Date()` sem UTC, o vendedor no Acre veria a grade virar um dia antes.
 *
 * Por que a semana começa no domingo: é o que o brasileiro vê em papel, em banco
 * e no Google Calendar em pt-BR. Trocar isso é preferência de programador.
 */

import { somarDias } from "../relato/tempo";

export type DiaGrade = {
  /** YYYY-MM-DD */
  dia: string;
  /** Número do dia (1–31), já sem zero à esquerda. */
  numero: number;
  /** Falso para os dias de completar a semana, que vêm do mês vizinho. */
  doMes: boolean;
  /** Bate com o "hoje" recebido. */
  hoje: boolean;
  /** Sábado ou domingo. A tela apaga um pouco, não esconde. */
  fimDeSemana: boolean;
};

export type SemanaGrade = DiaGrade[];

export type MesGrade = {
  /** YYYY-MM */
  mes: string;
  ano: number;
  /** 1–12. */
  numeroMes: number;
  /** "agosto de 2026" — pronto para o cabeçalho. */
  rotulo: string;
  /** Primeiro e último dia do mês, para a consulta de faixa no banco. */
  primeiroDia: string;
  ultimoDia: string;
  /** Primeiro e último dia da grade, incluindo os dias vizinhos desenhados. */
  inicioGrade: string;
  fimGrade: string;
  semanas: SemanaGrade[];
};

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "dom" a "sáb", na ordem da grade. Cabeçalho da tela, sem depender de Intl. */
export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const p2 = (x: number) => String(x).padStart(2, "0");

/** Aceita "2026-08" ou "2026-08-12" e devolve sempre "2026-08". */
export function normalizarMes(entrada: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(entrada);
  if (!m) throw new Error(`mês inválido: ${entrada}`);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new Error(`mês inválido: ${entrada}`);
  return `${m[1]}-${m[2]}`;
}

/** Quantos dias tem o mês. Dia 0 do mês seguinte = último dia deste. */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** 0 = domingo. Calculado em UTC de propósito. */
export function diaDaSemana(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Soma meses a "2026-08" cuidando da virada de ano nos dois sentidos. */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = normalizarMes(mes).split("-").map(Number);
  const total = (a ?? 0) * 12 + ((m ?? 1) - 1) + n;
  return `${Math.floor(total / 12)}-${p2((total % 12) + 1)}`;
}

/**
 * Monta a grade. `hoje` entra por parâmetro (e não de `new Date()`) para o teste
 * não depender do calendário da máquina e para o servidor poder passar o "hoje"
 * do fuso do vendedor.
 */
export function gradeDoMes(mes: string, hoje: string): MesGrade {
  const alvo = normalizarMes(mes);
  const [ano, numeroMes] = alvo.split("-").map(Number);
  const total = diasNoMes(ano ?? 1970, numeroMes ?? 1);
  const primeiroDia = `${alvo}-01`;
  const ultimoDia = `${alvo}-${p2(total)}`;

  // Volta até o domingo anterior (ou fica, se o dia 1 já é domingo) e avança em
  // blocos de 7 até cobrir o mês. Sem "6 semanas fixas": mês que cabe em 5
  // linhas não ganha uma linha vazia só para a grade ter altura constante.
  const inicioGrade = somarDias(primeiroDia, -diaDaSemana(primeiroDia));
  const semanas: SemanaGrade[] = [];
  let cursor = inicioGrade;
  do {
    const semana: SemanaGrade = [];
    for (let i = 0; i < 7; i++) {
      const dia = somarDias(cursor, i);
      const dow = diaDaSemana(dia);
      semana.push({
        dia,
        numero: Number(dia.slice(8, 10)),
        doMes: dia.startsWith(`${alvo}-`),
        hoje: dia === hoje,
        fimDeSemana: dow === 0 || dow === 6,
      });
    }
    semanas.push(semana);
    cursor = somarDias(cursor, 7);
  } while (cursor <= ultimoDia);

  const ultimaSemana = semanas[semanas.length - 1];
  return {
    mes: alvo,
    ano: ano ?? 1970,
    numeroMes: numeroMes ?? 1,
    rotulo: `${MESES[(numeroMes ?? 1) - 1]} de ${ano}`,
    primeiroDia,
    ultimoDia,
    inicioGrade,
    fimGrade: ultimaSemana?.[6]?.dia ?? ultimoDia,
    semanas,
  };
}

/**
 * Faixa de 7 dias começando no domingo da semana do dia dado. É o que o celular
 * mostra: grade de mês em 430px de largura vira confete.
 */
export function semanaDe(dia: string, hoje: string): SemanaGrade {
  const domingo = somarDias(dia, -diaDaSemana(dia));
  return Array.from({ length: 7 }, (_, i) => {
    const d = somarDias(domingo, i);
    const dow = diaDaSemana(d);
    return {
      dia: d,
      numero: Number(d.slice(8, 10)),
      doMes: true,
      hoje: d === hoje,
      fimDeSemana: dow === 0 || dow === 6,
    };
  });
}

/** Agrupa qualquer coisa que tenha `dia` num dicionário YYYY-MM-DD -> itens. */
export function agruparPorDia<T extends { dia: string }>(itens: T[]): Record<string, T[]> {
  const mapa: Record<string, T[]> = {};
  for (const item of itens) {
    if (!item.dia) continue;
    (mapa[item.dia] ??= []).push(item);
  }
  return mapa;
}

/**
 * Dias úteis do mês sem nenhum compromisso, a partir de `desde` (normalmente
 * hoje). É o número que faz o vendedor agir: agenda vazia em dia útil é dinheiro
 * que não vai entrar. Fim de semana não conta — cobrar visita no sábado é fazer
 * o produto parecer um chefe ruim.
 */
export function diasVazios(grade: MesGrade, ocupados: string[], desde: string): string[] {
  const cheio = new Set(ocupados);
  const vazios: string[] = [];
  for (const semana of grade.semanas) {
    for (const d of semana) {
      if (!d.doMes || d.fimDeSemana) continue;
      if (d.dia < desde) continue;
      if (!cheio.has(d.dia)) vazios.push(d.dia);
    }
  }
  return vazios;
}
