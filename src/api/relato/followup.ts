/**
 * Motor Determinístico de Variantes de Follow-up Comercial B2B.
 *
 * Princípios de Engenharia:
 *  1. ZERO LATÊNCIA & DETERMINÍSTICO: Executa em sub-milissegundo sem chamadas a LLM.
 *  2. CONTEXTUALIZADO: Conecta a objeção identificada à pergunta de ouro do playbook por vertical.
 *  3. ZERO AUDIO LEAKAGE: Opera estritamente com os dados estruturados da ficha (contato, empresa,
 *     ação, prazo, objeção), nunca com trechos de áudio ou transcrições literais.
 *  4. LINGUAGEM NATURAL BRASILEIRA: Sem clichês corporativos vazios ("venho por meio desta",
 *     "espero que esteja bem", "conforme alinhado").
 */

import { analisarObjecao, type AnaliseObjecao } from "./objecoes";

export interface ContextoFollowup {
  contato?: string;
  empresa?: string;
  proxima_acao?: string;
  data_iso?: string;
  hora?: string;
  objecao?: string;
  analise_objecao?: AnaliseObjecao | null;
  followup_original?: string;
}

export type TipoTomFollowup = "proximo_passo" | "destravar_objecao" | "formal";

export interface MetricasTexto {
  palavras: number;
  caracteres: number;
  tempo_leitura_segundos: number;
}

export interface VarianteFollowup extends MetricasTexto {
  id: TipoTomFollowup;
  titulo: string;
  subtitulo: string;
  icone: "handshake" | "shield-alert" | "briefcase";
  texto: string;
  disponivel: boolean;
  motivo_indisponivel?: string;
}

export interface ResultadoVariantesFollowup {
  variantes: Record<TipoTomFollowup, VarianteFollowup>;
  recomendada: TipoTomFollowup;
  tem_objecao: boolean;
}

const PREFIXOS_TITULOS = new Set([
  "dr.",
  "dr",
  "dra.",
  "dra",
  "sr.",
  "sr",
  "sra.",
  "sra",
  "eng.",
  "eng",
  "engenheiro",
  "engenheira",
  "prof.",
  "prof",
  "professor",
  "professora",
  "diretor",
  "diretora",
  "gerente",
]);

/** Extrai o primeiro nome de um contato, ignorando pronomes de tratamento e títulos. */
export function extrairPrimeiroNome(contato?: string): string {
  if (!contato) return "";
  const partes = contato
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "";

  let i = 0;
  while (i < partes.length && PREFIXOS_TITULOS.has(partes[i].toLowerCase())) {
    i++;
  }
  const nome = partes[i] || partes[0];
  // Remove pontuações residuais (ex: "Roberto," -> "Roberto")
  return nome.replace(/[^\p{L}\p{N}]/gu, "");
}

const DIAS_SEMANA_NOMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Formata data ISO (YYYY-MM-DD) e hora em formato amigável brasileiro. */
export function formatarPrazoAmigavel(dataIso?: string, hora?: string): string {
  if (!dataIso) return "";
  const partes = dataIso.split("-");
  if (partes.length !== 3) return "";

  const [a, m, d] = partes;
  const diaNum = Number(d);
  const mesNum = Number(m);
  const anoNum = Number(a);
  if (!diaNum || !mesNum || !anoNum) return "";

  const dataUtc = new Date(Date.UTC(anoNum, mesNum - 1, diaNum));
  const diaSemana = DIAS_SEMANA_NOMES[dataUtc.getUTCDay()] || "";

  let horaFormatada = "";
  if (hora && hora.trim()) {
    const [h, min] = hora.trim().split(":");
    if (h) {
      horaFormatada = min && min !== "00" ? ` às ${h}:${min}` : ` às ${Number(h)}h`;
    }
  }

  return `até ${diaSemana} (${d}/${m})${horaFormatada}`;
}

/** Calcula métricas de leitura e tamanho do texto. */
export function calcularMetricasTexto(texto: string): MetricasTexto {
  const limpo = texto.trim();
  if (!limpo) {
    return { palavras: 0, caracteres: 0, tempo_leitura_segundos: 0 };
  }
  const palavras = limpo.split(/\s+/).filter(Boolean).length;
  // Média de leitura rápida no WhatsApp: ~3.5 palavras por segundo (~210 palavras/min)
  const tempo_leitura_segundos = Math.max(3, Math.ceil(palavras / 3.5));
  return {
    palavras,
    caracteres: limpo.length,
    tempo_leitura_segundos,
  };
}

/** Suaviza o início da próxima ação para encaixe na frase ("Enviar proposta" -> "enviar a proposta"). */
function normalizarAcaoParaFrase(acao: string): string {
  const s = acao.trim();
  if (!s) return "dar andamento ao que combinamos";
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Gera as 3 variantes especializadas de follow-up a partir dos dados do relato.
 */
export function gerarVariantesFollowup(
  contexto: ContextoFollowup,
  vertical = "geral",
): ResultadoVariantesFollowup {
  const nome = extrairPrimeiroNome(contexto.contato);
  const empresa = contexto.empresa?.trim() || "";
  const acao = contexto.proxima_acao?.trim() || "";
  const prazo = formatarPrazoAmigavel(contexto.data_iso, contexto.hora);
  const temObjecao = Boolean(contexto.objecao && contexto.objecao.trim().length > 2);

  // 1. Variante: Próximo Passo
  let textoProximoPasso = "";
  if (contexto.followup_original && contexto.followup_original.trim().length >= 20) {
    textoProximoPasso = contexto.followup_original.trim();
  } else {
    const saudacao = nome
      ? `Oi ${nome}, tudo bem? Obrigado pelo papo hoje${empresa ? ` na ${empresa}` : ""}.`
      : `Olá, tudo bem? Obrigado pela recepção hoje${empresa ? ` na ${empresa}` : ""}.`;

    const corpo = acao
      ? `Ficou combinado de eu ${normalizarAcaoParaFrase(acao)}${prazo ? ` ${prazo}` : ""}.`
      : `Conforme conversamos, sigo avançando por aqui nos pontos que alinhamos.`;

    const fechamento = `Qualquer dúvida antes disso, é só me chamar por aqui. Um abraço!`;
    textoProximoPasso = `${saudacao} ${corpo} ${fechamento}`;
  }

  const metricasProximoPasso = calcularMetricasTexto(textoProximoPasso);
  const varianteProximoPasso: VarianteFollowup = {
    id: "proximo_passo",
    titulo: "Próximo Passo",
    subtitulo: "Foco no combinado, prazo e cordialidade direta",
    icone: "handshake",
    texto: textoProximoPasso,
    disponivel: true,
    ...metricasProximoPasso,
  };

  // 2. Variante: Destravar Objeção
  let varianteObjecao: VarianteFollowup;
  if (temObjecao && contexto.objecao) {
    const analise = contexto.analise_objecao || analisarObjecao(contexto.objecao, vertical);
    const pergunta =
      analise.perguntas_destravamento[0] ||
      "Qual seria o principal critério para avançarmos com segurança?";

    let abertura = "";
    switch (analise.categoria) {
      case "preco":
        abertura = nome
          ? `Oi ${nome}, valeu pela reunião hoje. Pensando no ponto que conversamos sobre o investimento e o orçamento:`
          : `Olá, obrigado pela reunião de hoje. Pensando no ponto que conversamos sobre o investimento e o orçamento:`;
        break;
      case "concorrente":
        abertura = nome
          ? `Oi ${nome}, obrigado pelo papo hoje${empresa ? ` na ${empresa}` : ""}. Sobre o contrato que vocês já têm rodando com o fornecedor atual:`
          : `Olá, obrigado pela conversa de hoje${empresa ? ` na ${empresa}` : ""}. Sobre o contrato vigente com o parceiro atual:`;
        break;
      case "timing":
        abertura = nome
          ? `Oi ${nome}, valeu pelo tempo hoje. Entendo perfeitamente o momento e as prioridades atuais da ${empresa || "empresa"}. Só para eu calibrar o nosso cronograma de cá:`
          : `Olá, obrigado pela conversa. Entendo perfeitamente o momento de prioridades da empresa. Só para eu calibrar nosso cronograma:`;
        break;
      case "decisor":
        abertura = nome
          ? `Oi ${nome}, valeu pelo alinhamento hoje. Para te apoiar a levar essa pauta para a diretoria sem sobrecarregar sua rotina:`
          : `Olá, obrigado pelo alinhamento hoje. Para apoiar a apresentação deste tema para o comitê sem sobrecarregar sua agenda:`;
        break;
      case "risco":
        abertura = nome
          ? `Oi ${nome}, obrigado pela conversa${empresa ? ` na ${empresa}` : ""}. Pensando na preocupação que você colocou sobre a estabilidade da operação e a transição:`
          : `Olá, obrigado pelo tempo hoje. Pensando na preocupação levantada sobre a estabilidade da operação e o processo de transição:`;
        break;
      default:
        abertura = nome
          ? `Oi ${nome}, obrigado pela reunião hoje${empresa ? ` na ${empresa}` : ""}. Refletindo sobre o ponto que você colocou:`
          : `Olá, obrigado pela reunião hoje. Refletindo sobre a questão que conversamos:`;
        break;
    }

    const fechamento = "Fico no seu aguardo para continuarmos e te desejo uma ótima semana!";
    const textoObjecao = `${abertura} ${pergunta} ${fechamento}`;
    const metricasObjecao = calcularMetricasTexto(textoObjecao);

    varianteObjecao = {
      id: "destravar_objecao",
      titulo: `Destravar ${analise.rotulo_categoria.split(" ")[0]}`,
      subtitulo: "Ancora a objeção acolhendo a dúvida com a pergunta de ouro",
      icone: "shield-alert",
      texto: textoObjecao,
      disponivel: true,
      ...metricasObjecao,
    };
  } else {
    varianteObjecao = {
      id: "destravar_objecao",
      titulo: "Destravar Objeção",
      subtitulo: "Disponível quando o cliente manifesta alguma barreira na reunião",
      icone: "shield-alert",
      texto: "",
      disponivel: false,
      motivo_indisponivel: "Nenhuma objeção comercial foi registrada nesta visita.",
      palavras: 0,
      caracteres: 0,
      tempo_leitura_segundos: 0,
    };
  }

  // 3. Variante: Formal / Executivo
  const saudacaoFormal = nome
    ? `Prezado(a) ${nome},`
    : `Prezado(a) cliente${empresa ? ` da ${empresa}` : ""},`;

  const corpoFormal = acao
    ? `Agradeço a recepção e a oportunidade da reunião de hoje${empresa ? ` na ${empresa}` : ""}. Registrei como nosso próximo alinhamento: ${normalizarAcaoParaFrase(acao)}${prazo ? ` (${prazo})` : ""}.`
    : `Agradeço a atenção e a disponibilidade durante nossa conversa de hoje${empresa ? ` na ${empresa}` : ""}. Registrei os pontos tratados para darmos andamento conjunto.`;

  const fechamentoFormal = `Permaneço à disposição para esclarecer qualquer ponto adicional ou compartilhar documentação complementar.`;
  const textoFormal = `${saudacaoFormal} ${corpoFormal} ${fechamentoFormal}`;
  const metricasFormal = calcularMetricasTexto(textoFormal);

  const varianteFormal: VarianteFollowup = {
    id: "formal",
    titulo: "Executivo / Formal",
    subtitulo: "Tom polido para e-mail corporativo ou comitês executivos",
    icone: "briefcase",
    texto: textoFormal,
    disponivel: true,
    ...metricasFormal,
  };

  return {
    variantes: {
      proximo_passo: varianteProximoPasso,
      destravar_objecao: varianteObjecao,
      formal: varianteFormal,
    },
    recomendada: temObjecao ? "destravar_objecao" : "proximo_passo",
    tem_objecao: temObjecao,
  };
}
