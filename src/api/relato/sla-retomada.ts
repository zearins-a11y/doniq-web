/**
 * Motor de SLA de Retomada Comercial & Prevenção de Churn no Pipeline (Pipeline Churn Prevention).
 *
 * Princípios de Engenharia:
 *  1. DETERMINÍSTICO E SEM CUSTO: Execução instantânea (sub-milissegundo) sem consumo de LLM.
 *  2. CONTEXTUAL POR TEMPERATURA: Leads quentes exigem contato em até 5 dias;
 *     leads mornos toleram até 10-12 dias; objeções ativas pedem destravamento em até 7 dias.
 *  3. ZERO AUDIO LEAKAGE: Opera estritamente com metadados estruturados aprovados.
 */

import { hojeBr } from "./tempo";
import { extrairPrimeiroNome } from "./followup";

export type GravidadeSla = "critico" | "atencao" | "reativacao" | "em_dia";

export interface DiagnosticoSla {
  gravidade: GravidadeSla;
  dias_silencio: number;
  dias_atraso_prazo: number;
  esta_atrasado: boolean;
  motivo: string;
  rotulo_curto: string;
  mensagem_reativacao: string;
}

export interface RelatoSlaReferencia {
  relato_id?: string;
  empresa?: string;
  contato?: string;
  temperatura?: string;
  objecao?: string;
  proxima_acao?: string;
  data_iso?: string;
  created_at?: string;
  dia_visita?: string;
}

/**
 * Calcula a diferença em dias entre duas datas no formato YYYY-MM-DD.
 * Retorna positivo se dataA for posterior a dataB.
 */
export function diferencaDias(dataA: string, dataB: string): number {
  if (!dataA || !dataB) return 0;
  const parteA = dataA.slice(0, 10).split("-").map(Number);
  const parteB = dataB.slice(0, 10).split("-").map(Number);
  if (parteA.length !== 3 || parteB.length !== 3) return 0;
  const [aY, aM, aD] = parteA;
  const [bY, bM, bD] = parteB;
  if (!aY || !aM || !aD || !bY || !bM || !bD) return 0;
  const msA = Date.UTC(aY, aM - 1, aD);
  const msB = Date.UTC(bY, bM - 1, bD);
  return Math.round((msA - msB) / (1000 * 60 * 60 * 24));
}

/**
 * Gera mensagem ágil de reativação via WhatsApp calibrada para o nível de silêncio e contexto do relato.
 */
export function gerarMensagemReativacao(relato: RelatoSlaReferencia): string {
  const nome = extrairPrimeiroNome(relato.contato || "");
  const saudacao = nome ? `Oi ${nome}!` : "Olá!";
  const empresa = relato.empresa?.trim();
  const temObjecao = Boolean(relato.objecao?.trim());
  const temProximo = Boolean(relato.proxima_acao?.trim());

  if (temObjecao) {
    return `${saudacao} Passando para retomar nossa conversa${empresa ? ` na ${empresa}` : ""}. Estive analisando o ponto que você pontuou e temos uma forma prática de resolver isso sem burocracia. Como está sua agenda hoje ou amanhã para um alinhamento rápido de 5 minutos?`;
  }

  if (temProximo) {
    const acaoLimpa = relato.proxima_acao!.trim().replace(/\.$/, "");
    return `${saudacao} Para não deixar esfriar nosso alinhamento sobre ${acaoLimpa.toLowerCase()}, como está sua disponibilidade nesta semana para darmos andamento?`;
  }

  if (empresa) {
    return `${saudacao} Como estão os projetos por aí na ${empresa}? Queria retomar nosso contato para ver o melhor momento de avançarmos. Consegue falar esta semana?`;
  }

  return `${saudacao} Passando para retomar nosso contato e entender como está o momento para avançarmos. Como está sua disponibilidade esta semana?`;
}

/**
 * Avalia a situação do relato perante os SLAs comerciais de vendas de campo B2B.
 */
export function avaliarRiscoSilencio(
  relato: RelatoSlaReferencia,
  dataHojeIso?: string,
): DiagnosticoSla {
  const hoje = dataHojeIso ? dataHojeIso.slice(0, 10) : hojeBr();
  const dataReferenciaVisita = (relato.dia_visita || relato.created_at || "").slice(0, 10);
  const diasSilencio = dataReferenciaVisita ? Math.max(0, diferencaDias(hoje, dataReferenciaVisita)) : 0;

  const dataPrazo = (relato.data_iso || "").slice(0, 10);
  const temPrazo = Boolean(dataPrazo);
  const atrasoPrazo = temPrazo ? diferencaDias(hoje, dataPrazo) : 0;
  const estaAtrasado = temPrazo && atrasoPrazo > 0;

  const temp = (relato.temperatura || "morna").toLowerCase();
  const temObjecao = Boolean(relato.objecao?.trim());
  const mensagemReativacao = gerarMensagemReativacao(relato);

  // 1. Cenário de Prazo Combinado Vencido
  if (estaAtrasado) {
    if (atrasoPrazo >= 3) {
      return {
        gravidade: "critico",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: atrasoPrazo,
        esta_atrasado: true,
        motivo: `Próximo passo atrasado há ${atrasoPrazo} dia${atrasoPrazo > 1 ? "s" : ""}`,
        rotulo_curto: `Atrasado ${atrasoPrazo}d`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
    return {
      gravidade: "atencao",
      dias_silencio: diasSilencio,
      dias_atraso_prazo: atrasoPrazo,
      esta_atrasado: true,
      motivo: `Próximo passo venceu há ${atrasoPrazo} dia${atrasoPrazo > 1 ? "s" : ""}`,
      rotulo_curto: `Venceu ${atrasoPrazo}d`,
      mensagem_reativacao: mensagemReativacao,
    };
  }

  // 2. Se o prazo está no futuro, a oportunidade está em dia e agendada
  if (temPrazo && atrasoPrazo <= 0) {
    const rotulo = atrasoPrazo === 0 ? "Hoje" : `Em ${Math.abs(atrasoPrazo)}d`;
    return {
      gravidade: "em_dia",
      dias_silencio: diasSilencio,
      dias_atraso_prazo: 0,
      esta_atrasado: false,
      motivo: atrasoPrazo === 0 ? "Próximo passo agendado para hoje" : "Próximo passo agendado",
      rotulo_curto: rotulo,
      mensagem_reativacao: mensagemReativacao,
    };
  }

  // 3. Oportunidades Sem Data Combinada: Avaliação por Temperatura e Silêncio
  if (temp === "quente") {
    if (diasSilencio >= 5) {
      return {
        gravidade: "critico",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Lead quente sem contato há ${diasSilencio} dias`,
        rotulo_curto: `🔥 ${diasSilencio}d sem contato`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
    if (diasSilencio >= 3) {
      return {
        gravidade: "atencao",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Lead quente esfriando (${diasSilencio} dias sem contato)`,
        rotulo_curto: `Esfriando ${diasSilencio}d`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
  }

  if (temObjecao) {
    if (diasSilencio >= 7) {
      return {
        gravidade: "critico",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Objeção travada sem retorno há ${diasSilencio} dias`,
        rotulo_curto: `🎯 ${diasSilencio}d travada`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
    if (diasSilencio >= 4) {
      return {
        gravidade: "atencao",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Objeção pendente há ${diasSilencio} dias`,
        rotulo_curto: `🎯 ${diasSilencio}d sem retorno`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
  }

  if (temp === "morna") {
    if (diasSilencio >= 12) {
      return {
        gravidade: "critico",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Lead morno parado há ${diasSilencio} dias`,
        rotulo_curto: `${diasSilencio}d sem contato`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
    if (diasSilencio >= 8) {
      return {
        gravidade: "atencao",
        dias_silencio: diasSilencio,
        dias_atraso_prazo: 0,
        esta_atrasado: false,
        motivo: `Lead morno esfriando (${diasSilencio} dias)`,
        rotulo_curto: `Esfriando ${diasSilencio}d`,
        mensagem_reativacao: mensagemReativacao,
      };
    }
  }

  if (diasSilencio >= 25) {
    return {
      gravidade: "reativacao",
      dias_silencio: diasSilencio,
      dias_atraso_prazo: 0,
      esta_atrasado: false,
      motivo: `Sem interação há ${diasSilencio} dias (oportunidade de reativação)`,
      rotulo_curto: `Reativar ${diasSilencio}d`,
      mensagem_reativacao: mensagemReativacao,
    };
  }

  return {
    gravidade: "em_dia",
    dias_silencio: diasSilencio,
    dias_atraso_prazo: 0,
    esta_atrasado: false,
    motivo: "Contato recente em dia",
    rotulo_curto: "Em dia",
    mensagem_reativacao: mensagemReativacao,
  };
}
