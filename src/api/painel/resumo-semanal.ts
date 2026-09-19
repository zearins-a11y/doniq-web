/**
 * Resumo semanal da equipe, em texto, para o gestor ler no e-mail.
 *
 * Função pura: recebe o painel já calculado e devolve assunto e corpo. Sem banco,
 * sem `new Date()` escondido, sem envio — quem envia é a rota. Assim o teste
 * consegue provar o que o gestor vai ler, sem subir servidor nem mandar e-mail.
 *
 * A régua do que entra: o resumo existe para o gestor agir na segunda de manhã,
 * não para ele admirar número. Por isso a ordem é silêncio primeiro (quem não
 * registrou visita), depois volume, depois o que os clientes estão dizendo. E por
 * isso ele é curto: relatório longo em e-mail não é lido, é arquivado.
 *
 * Privacidade: o resumo é feito a partir do painel, que já passou pela allowlist
 * do gestor. Nenhuma frase da gravação chega aqui — nem por engano, porque
 * transcrição não é campo do tipo Painel.
 */

import type { Painel } from "./indicadores";

/** Quantas objeções e lacunas cabem no corpo antes de virar relatório. */
export const LIMITE_LISTA = 5;

export type ResumoSemanal = {
  assunto: string;
  texto: string;
  /** Verdadeiro quando não houve nenhuma visita na semana: muda o tom da mensagem. */
  semana_vazia: boolean;
};

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/** "2026-08-11" -> "11/08". Data curta porque assunto de e-mail é cortado no celular. */
export function diaCurto(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}` : iso || "";
}

function listar(titulo: string, itens: { texto: string; vezes: number }[]): string[] {
  if (itens.length === 0) return [];
  return [
    titulo,
    ...itens.slice(0, LIMITE_LISTA).map((i) => `  - ${i.texto} (${plural(i.vezes, "vez", "vezes")})`),
    "",
  ];
}

/**
 * Bloco de quem está em silêncio.
 *
 * Nomear quem não registrou é o ponto do resumo inteiro: o gargalo declarado do
 * produto é hábito, e hábito só muda quando a falta aparece com nome. Mas nomear
 * quem trabalhou muito também importa — resumo que só cobra vira e-mail que o
 * gestor filtra.
 */
function blocoVendedores(p: Painel): string[] {
  if (p.vendedores.length === 0) {
    return ["Você ainda não tem vendedor na equipe. Convide pela página Equipe.", ""];
  }
  const parados = p.vendedores.filter((v) => v.semana === 0);
  const ativos = p.vendedores.filter((v) => v.semana > 0);
  const linhas: string[] = [];

  if (ativos.length > 0) {
    linhas.push("Registraram visita:");
    for (const v of ativos) linhas.push(`  - ${v.nome}: ${plural(v.semana, "visita", "visitas")}`);
    linhas.push("");
  }
  if (parados.length > 0) {
    linhas.push("Sem nenhuma visita registrada nos últimos 7 dias:");
    for (const v of parados) {
      linhas.push(`  - ${v.nome}${v.ultima_visita ? ` (última em ${diaCurto(v.ultima_visita)})` : " (nenhuma até hoje)"}`);
    }
    linhas.push("");
  }
  return linhas;
}

export function montarResumoSemanal(params: {
  painel: Painel;
  nomeEquipe: string;
  linkPainel: string;
}): ResumoSemanal {
  const p = params.painel;
  const equipe = params.nomeEquipe || "sua equipe";
  const semanaVazia = p.equipe.semana === 0;

  const corpo: string[] = [
    `Resumo da semana — ${equipe} (até ${diaCurto(p.hoje)})`,
    "",
    semanaVazia
      ? "Nenhuma visita foi registrada nos últimos 7 dias."
      : `${plural(p.equipe.semana, "visita registrada", "visitas registradas")} nos últimos 7 dias. No mês: ${p.equipe.mes}.`,
    "",
    ...blocoVendedores(p),
    ...listar("O que os clientes mais alegaram:", p.objecoes),
    ...listar("O que mais faltou perguntar na visita:", p.lacunas),
  ];

  if (params.linkPainel) {
    corpo.push(`Painel completo: ${params.linkPainel}`, "");
  }
  corpo.push(
    "Você recebe a ficha de cada visita — empresa, objeção, próximo passo.",
    "A gravação e as frases ditas pelo vendedor não aparecem para você, nem neste resumo.",
    "",
    "⚡ Doniq · Inteligência de visitas em conformidade com o Pacto de Privacidade",
  );

  return {
    assunto: semanaVazia
      ? `${equipe}: nenhuma visita registrada esta semana`
      : `${equipe}: ${plural(p.equipe.semana, "visita", "visitas")} na semana`,
    texto: corpo.join("\n"),
    semana_vazia: semanaVazia,
  };
}
