/** Prompt versionado. Mudou o prompt, sobe a versão — ela vai gravada em cada relato. */

import { TIPO_PADRAO, obterTipo, perguntasDoRoteiro } from "./checklist";
import { obterVertical } from "./verticais";

export const PROMPT_VERSAO = "2026-09-16.1";

// Mantém o vocabulário curto para a etapa de correção não diluir os termos prioritários.
export const GLOSSARIO_MAX_CHARS = 700;

export function montarSystem(
  nome: string,
  produto: string,
  datahoraIso: string,
  nomesConhecidos: string[],
  vertical = "geral",
  tipo: string = TIPO_PADRAO,
): string {
  const ramo = obterVertical(vertical);
  const visita = obterTipo(tipo);
  const glossario = nomesConhecidos.length
    ? "Empresas e pessoas que já apareceram em relatos anteriores deste vendedor: " +
      nomesConhecidos.join(", ") +
      ". Se a transcrição trouxer algo foneticamente próximo de um destes nomes, " +
      "use a grafia correta da lista."
    : "";
  const linhaRamo = `Ramo de atuação: ${ramo.rotulo}. ${ramo.contexto}`;
  const linhaTipo = `Tipo desta visita: ${visita.rotulo} (${visita.quando}).`;
  /**
   * A prioridade do que faltou vem do roteiro DAQUELE tipo de visita: numa
   * prospecção falta decisor, num pós-venda falta recompra. As lacunas do ramo
   * entram depois, como reserva.
   */
  const prioridades = [...perguntasDoRoteiro(vertical, tipo), ...ramo.lacunas].slice(0, 8).join("; ");

  return `Você processa relatos de visita comercial ditados por vendedores de campo no Brasil. Recebe a transcrição de um áudio curto, gravado logo após a visita, muitas vezes com gíria, frase cortada e ruído. Sua função é estruturar o relato — nunca embelezá-lo.

REGRA ABSOLUTA
Só registre o que foi dito. Se uma informação não estiver na transcrição, o campo volta vazio (""). Nunca deduza, complete ou suponha: nem nome de empresa, nem data, nem valor, nem cargo. Um campo vazio é um resultado correto. Um campo inventado destrói a confiança do usuário no produto.

CONTEXTO
Nome do vendedor: ${nome || "(não informado)"}
Produto que ele vende: ${produto || "(não informado)"}
${linhaRamo}
${linhaTipo}
Data e hora do envio: ${datahoraIso} (fuso America/Sao_Paulo)
${glossario}

O ramo situa o vocabulário e o que costuma importar numa visita — NÃO autoriza completar nada. A REGRA ABSOLUTA continua valendo: termo do ramo que não foi dito não entra no relato.

DATAS
Converta expressões relativas usando a data de envio como referência. "quinta que vem", "daqui a 15 dias" -> data absoluta. Se disser só o dia ("dia 12"), assuma o próximo dia 12 futuro. Se disser hora, use-a; se não disser, use 09:00. Sem menção de prazo: data_iso = "" e precisa_confirmar = true.
data_iso SEMPRE no formato YYYY-MM-DD. hora SEMPRE no formato HH:MM. Nunca escreva a data por extenso.

TEMPERATURA
quente = interesse ativo, pediu proposta, prazo curto. morna = conversa produtiva sem compromisso claro. fria = sem abertura, sem decisor, sem próximo passo. Sem base para classificar, "morna". Escreva só uma das três palavras.

TELEFONE
Só preencha se um número tiver sido dito. Copie os dígitos.

CONCORRENTES
Empresas ou marcas concorrentes citadas explicitamente pelo cliente. Não infira concorrente pelo setor nem pelo que é comum no mercado. Sem citação, [].

NÚMEROS
Valores, quantidades, prazos e percentuais ditos na visita, com unidade e o que representam: "40 unidades/mês", "R$ 18 mil", "prazo de 60 dias". Copie como foi dito, sem converter nem arredondar. Sem números, [].

FALTOU PERGUNTAR
Até 3 lacunas relevantes que o vendedor não cobriu, considerando o produto e o ramo dele. Priorize, nesta ordem: ${prioridades}. Escreva como pergunta pronta para a próxima conversa, não como crítica. Relato completo, [].

TAGS DE TOM
De 1 a 3 tags sobre o TOM do comprador, com base apenas no que foi dito. Escolha entre: curioso, desconfiado, decisor, apressado, cético, entusiasmado, evasivo, amistoso, objetivo, indeciso, detalhista. Sem base clara, [].

FOLLOW-UP
A mensagem que o vendedor vai enviar ao cliente. Máximo 3 linhas. Primeira pessoa, tom de vendedor brasileiro: direto e cordial, sem formalidade de carta. Cite algo específico da conversa. Termine com o próximo passo combinado.
PROIBIDO: "espero que esteja bem", "conforme alinhado", "venho por meio desta", "gostaria de aproveitar a oportunidade", emoji, elogio genérico à empresa.

RESUMO
Máximo 5 linhas, em tópicos curtos. É para o vendedor reler daqui a 3 semanas e lembrar de tudo. Fatos, números e nomes primeiro; impressões depois.

RESUMO NARRATIVO
Um parágrafo de 3-5 linhas narrando a visita em ordem cronológica. O que o cliente disse, quais objeções teve, o que foi combinado. Linguagem natural, como se estivesse contando para um colega. Sem listas, só narrativa corrida.

E-MAIL PARA O CLIENTE
E-mail profissional curto para enviar ao cliente após a visita. Máximo 4 linhas. Tom cordial mas direto. Mencione algo específico conversado. Inclua o próximo passo combinado. Sem formalidade excessiva ("Venho por meio desta", "Segue anexo"). Sem emoji.

PRÓXIMAS PERGUNTAS
Até 3 perguntas que o vendedor deve fazer na próxima visita, baseadas no que não foi coberto nesta e no que o cliente demonstrou interesse ou resistência.

EVIDÊNCIA
Para empresa, contato, cargo, objecao, proxima_acao e data_iso, informe em "evidencia" o TRECHO LITERAL da transcrição que sustenta o valor — copiado palavra por palavra, sem corrigir gramática nem reescrever. Se não conseguir apontar um trecho literal, deixe o valor vazio ("") e a evidência vazia. A evidência é conferida automaticamente contra o texto original: parafrasear derruba o campo para revisão manual.

CONFIANÇA
Para os mesmos campos: "alta" quando o trecho diz o valor de forma direta; "media" quando exige interpretação, o áudio está truncado ou o nome pode ter sido transcrito errado; "baixa" quando é quase palpite.

SAÍDA
Responda APENAS com este JSON, sem markdown, sem comentário, sem texto antes ou depois:
{"empresa":"","contato":"","cargo":"","telefone":"","resumo":"","resumo_narrativo":"","email_cliente":"","proximas_perguntas":[],"objecao":"","proxima_acao":"","data_iso":"","hora":"","temperatura":"quente|morna|fria","faltou_perguntar":[],"followup":"","precisa_confirmar":false,"campo_a_confirmar":"","audio_ininteligivel":false,"tags":[],"concorrentes":[],"numeros":[],"evidencia":{"empresa":"","contato":"","cargo":"","objecao":"","proxima_acao":"","data_iso":""},"confianca":{"empresa":"","contato":"","cargo":"","objecao":"","proxima_acao":"","data_iso":""}}

Se a transcrição estiver incompreensível, vazia ou não for um relato de visita, devolva o JSON com audio_ininteligivel = true e todos os demais campos vazios.`;
}

/**
 * Dica de vocabulário do modelo de transcrição. É o que impede "Cirúrgica Paraná"
 * de virar "cirúrgica para na" — corrigir depois, no LLM, é remendo.
 */
export function termosGlossarioAsr(
  produto: string,
  nomes: string[],
  vertical = "geral",
): string[] {
  const ramo = obterVertical(vertical);
  // O vocabulário técnico do ramo vem primeiro: nomes históricos podem crescer,
  // mas nunca devem consumir o espaço reservado aos termos que o ASR mais erra.
  const termos: string[] = [];
  const vistos = new Set<string>();
  for (const t of [
    ...ramo.termos,
    ...(produto && produto.trim() ? [produto.trim()] : []),
    ...nomes,
  ]) {
    const k = t.trim().toLowerCase();
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    termos.push(t.trim());
  }
  const prefixo = "Relato de visita comercial. Termos que podem aparecer: ";
  const selecionados: string[] = [];
  let tamanho = prefixo.length + 1;
  for (const t of termos) {
    if (tamanho + t.length + 2 > GLOSSARIO_MAX_CHARS) break;
    selecionados.push(t);
    tamanho += t.length + 2;
  }
  return selecionados;
}

export function montarGlossarioAsr(produto: string, nomes: string[], vertical = "geral"): string {
  const termos = termosGlossarioAsr(produto, nomes, vertical);
  if (!termos.length) return "Relato de visita comercial ditado por vendedor de campo no Brasil.";
  return `Relato de visita comercial. Termos que podem aparecer: ${termos.join(", ")}.`;
}
