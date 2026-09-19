/**
 * Motor de Inteligência Determinística do Briefing Matinal de Vendas (Daily Field Briefing).
 *
 * Princípios de Engenharia:
 *  1. ZERO TOKENS & DETERMINÍSTICO: Execução instantânea no cliente (sub-milissegundo).
 *  2. CONSUMO EM 45 SEGUNDOS: Formatação concisa para leitura rápida ou reprodução em viva-voz no carro.
 *  3. ZERO AUDIO LEAKAGE: Opera estritamente com metadados estruturados (compromissos, empresas, contatos, SLA).
 *  4. LINGUAGEM NATURAL BRASILEIRA: Tom de parceiro comercial respeitoso, sem clichês burocráticos.
 */

import type { EventoAgenda } from "./api";
import { avaliarRiscoSilencio, type DiagnosticoSla } from "./sla-retomada";

export interface AlertaEsfriandoBriefing {
  evento: EventoAgenda;
  diag: DiagnosticoSla;
}

export interface CompromissoBriefing {
  id: string;
  hora: string;
  titulo: string;
  contato: string;
  telefone: string;
  detalhe: string;
  local: string;
  origem: "relato" | "compromisso";
  concluido: boolean;
  relatoId?: string;
  temperatura?: string;
  objecao?: string;
}

export interface EntradaBriefingMatinal {
  hojeIso: string;
  horaAtual?: string;
  usuarioNome?: string;
  eventosDoDia: EventoAgenda[];
  semData: EventoAgenda[];
  visitasSemana?: number;
}

export interface BriefingMatinal {
  saudacao: string;
  dataPorExtenso: string;
  totalHoje: number;
  primeiroCompromisso: CompromissoBriefing | null;
  compromissosHoje: CompromissoBriefing[];
  leadsEsfriando: AlertaEsfriandoBriefing[];
  totalEsfriando: number;
  visitasSemana: number;
  scriptVoz: string;
  tempoEstimadoSegundos: number;
  resumoLinha: string;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

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

/**
 * Converte data ISO (YYYY-MM-DD) para string amigável por extenso (ex: "Segunda-feira, 14 de setembro").
 */
export function formatarDataPorExtenso(iso: string): string {
  if (!iso || !iso.includes("-")) return "Hoje";
  const [aStr, mStr, dStr] = iso.slice(0, 10).split("-");
  const ano = Number(aStr);
  const mes = Number(mStr);
  const dia = Number(dStr);
  if (!ano || !mes || !dia) return "Hoje";

  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = DIAS_SEMANA[dataUtc.getUTCDay()] || "Hoje";
  const nomeMes = MESES[mes - 1] || "";
  return `${diaSemana}, ${dia} de ${nomeMes}`;
}

/**
 * Extrai o primeiro nome limpo do usuário ou contato comercial.
 */
export function primeiroNome(nomeCompleto?: string): string {
  if (!nomeCompleto) return "";
  const limpo = nomeCompleto.trim().split(/\s+/)[0] || "";
  return limpo.charAt(0).toUpperCase() + limpo.slice(1).toLowerCase();
}

/**
 * Gera o Briefing Matinal diário determinístico para o vendedor de campo.
 */
export function gerarBriefingMatinal(entrada: EntradaBriefingMatinal): BriefingMatinal {
  const { hojeIso, horaAtual = "", usuarioNome = "", eventosDoDia, semData, visitasSemana = 0 } = entrada;

  // 1. Saudação contextual pela hora do dia
  const horaNum = horaAtual ? parseInt(horaAtual.split(":")[0] || "9", 10) : 9;
  let periodoSaudacao = "Bom dia";
  if (horaNum >= 12 && horaNum < 18) {
    periodoSaudacao = "Boa tarde";
  } else if (horaNum >= 18 || horaNum < 5) {
    periodoSaudacao = "Boa noite";
  }

  const pNome = primeiroNome(usuarioNome);
  const saudacao = pNome ? `${periodoSaudacao}, ${pNome}!` : `${periodoSaudacao}!`;
  const dataPorExtenso = formatarDataPorExtenso(hojeIso);

  // 2. Ordenação e normalização dos compromissos de hoje
  const compromissosHoje: CompromissoBriefing[] = [...eventosDoDia]
    .sort((a, b) => {
      // Eventos com hora definida vêm primeiro em ordem cronológica
      if (a.hora && !b.hora) return -1;
      if (!a.hora && b.hora) return 1;
      if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
      return (a.titulo || "").localeCompare(b.titulo || "");
    })
    .map((ev) => ({
      id: ev.id,
      hora: ev.hora || "",
      titulo: ev.titulo || "Cliente sem nome",
      contato: ev.contato || "",
      telefone: ev.telefone || "",
      detalhe: ev.detalhe || "",
      local: ev.local || "",
      origem: ev.origem,
      concluido: Boolean(ev.concluido),
      relatoId: ev.relato_id || undefined,
      temperatura: ev.temperatura,
      objecao: ev.objecao,
    }));

  const totalHoje = compromissosHoje.length;
  const primeiroCompromisso = compromissosHoje.find((c) => !c.concluido) || compromissosHoje[0] || null;

  // 3. Avaliação de Leads Esfriando (SLA de Retomada)
  const leadsEsfriando: AlertaEsfriandoBriefing[] = semData
    .map((ev) => ({
      evento: ev,
      diag: avaliarRiscoSilencio(
        {
          relato_id: ev.relato_id,
          empresa: ev.titulo,
          contato: ev.contato,
          temperatura: ev.temperatura,
          objecao: ev.objecao,
          proxima_acao: ev.detalhe,
          dia_visita: ev.dia,
        },
        hojeIso,
      ),
    }))
    .filter((item) => item.diag.gravidade === "critico" || item.diag.gravidade === "atencao")
    .sort((a, b) => {
      // "critico" antes de "atencao"
      if (a.diag.gravidade === "critico" && b.diag.gravidade !== "critico") return -1;
      if (a.diag.gravidade !== "critico" && b.diag.gravidade === "critico") return 1;
      return b.diag.dias_silencio - a.diag.dias_silencio;
    });

  const totalEsfriando = leadsEsfriando.length;

  // 4. Montagem do Script de Voz (TTS) em Português Fluente
  const frases: string[] = [];

  // Introdução
  frases.push(`${saudacao} Hoje é ${dataPorExtenso}.`);

  // Agenda do dia
  if (totalHoje === 0) {
    frases.push("Você não tem visitas marcadas na agenda para hoje. Excelente oportunidade para prospecção em campo e reativação da carteira.");
  } else if (totalHoje === 1 && primeiroCompromisso) {
    const horaTexto = primeiroCompromisso.hora ? `às ${primeiroCompromisso.hora}` : "hoje";
    const contatoTexto = primeiroCompromisso.contato ? ` com ${primeiroCompromisso.contato}` : "";
    const detalheTexto = primeiroCompromisso.detalhe ? `. Pauta: ${primeiroCompromisso.detalhe}` : "";
    const localTexto = primeiroCompromisso.local ? `. Endereço: ${primeiroCompromisso.local}` : "";
    frases.push(`Você tem 1 compromisso na sua rota: ${horaTexto} na ${primeiroCompromisso.titulo}${contatoTexto}${detalheTexto}${localTexto}.`);
  } else if (primeiroCompromisso) {
    const horaTexto = primeiroCompromisso.hora ? `às ${primeiroCompromisso.hora}` : "pela manhã";
    const contatoTexto = primeiroCompromisso.contato ? ` com ${primeiroCompromisso.contato}` : "";
    const outros = compromissosHoje.filter((c) => c.id !== primeiroCompromisso.id);
    const nomesOutros = outros.map((o) => o.titulo).slice(0, 3).join(", ");
    frases.push(`Você tem ${totalHoje} compromissos agendados para hoje.`);
    frases.push(`Seu primeiro compromisso é ${horaTexto} na ${primeiroCompromisso.titulo}${contatoTexto}.`);
    if (outros.length > 0) {
      frases.push(`Na sequência, você visita: ${nomesOutros}.`);
    }
  }

  // Alertas de Retomada (SLA)
  if (totalEsfriando === 0) {
    frases.push("Seu SLA comercial está em dia, sem oportunidades esfriando.");
  } else if (totalEsfriando === 1) {
    const lead = leadsEsfriando[0];
    frases.push(`Na fila de retomada, atenção para a ${lead.evento.titulo}: ${lead.diag.motivo.toLowerCase()}. Vale enviar um WhatsApp rápido antes do meio-dia.`);
  } else {
    const principal = leadsEsfriando[0];
    frases.push(`Você tem ${totalEsfriando} oportunidades que precisam de retorno para não esfriar.`);
    frases.push(`Prioridade para a ${principal.evento.titulo}, ${principal.diag.motivo.toLowerCase()}.`);
  }

  // Encerramento
  frases.push("Tenha um excelente dia e ótimas visitas de campo!");

  const scriptVoz = frases.join(" ");

  // Estimativa de tempo de leitura/voz: ~130 palavras por minuto (2.17 palavras/segundo)
  const totalPalavras = scriptVoz.split(/\s+/).filter(Boolean).length;
  const tempoEstimadoSegundos = Math.max(15, Math.round(totalPalavras / 2.17));

  // Resumo de 1 linha
  const resumoPartes = [
    `${totalHoje} compromisso${totalHoje === 1 ? "" : "s"} hoje`,
  ];
  if (totalEsfriando > 0) {
    resumoPartes.push(`${totalEsfriando} lead${totalEsfriando === 1 ? "" : "s"} esfriando`);
  }
  const resumoLinha = resumoPartes.join(" · ");

  return {
    saudacao,
    dataPorExtenso,
    totalHoje,
    primeiroCompromisso,
    compromissosHoje,
    leadsEsfriando,
    totalEsfriando,
    visitasSemana,
    scriptVoz,
    tempoEstimadoSegundos,
    resumoLinha,
  };
}
