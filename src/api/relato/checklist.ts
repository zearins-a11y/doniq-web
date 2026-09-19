/**
 * Roteiro da visita, por tipo de visita.
 *
 * Duas metades:
 *   1. ANTES — o vendedor escolhe o tipo (prospecção, retorno, fechamento,
 *      pós-venda) e vê o que não pode deixar escapar naquela conversa.
 *   2. DEPOIS — a ficha diz, item por item, o que ele cobriu e o que ficou em
 *      aberto. É o que separa "gravador que resume" de "roteiro que cobra".
 *
 * A cobertura é DETERMINÍSTICA: nenhuma chamada de modelo, custo zero por visita.
 * Um item conta como coberto de duas formas, nesta ordem:
 *   - o campo da ficha que responde a ele veio preenchido (prova forte: passou
 *     pelo portão anti-alucinação);
 *   - um sinal do item aparece na fala (prova de que o assunto foi tocado).
 * Sem nenhuma das duas, fica em aberto. Não existe "quase coberto" — dizer ao
 * vendedor que ele perguntou algo que não perguntou é pior que não dizer nada.
 *
 * O roteiro é dado, igual ao pacote de vertical: abrir tipo novo é acrescentar
 * uma entrada em TIPOS_VISITA, e item novo de ramo é uma entrada em `itens`
 * dentro de VERTICAIS. Nada aqui é código de nicho.
 */

import { obterVertical } from "./verticais";

export const TIPO_PADRAO = "prospeccao";

/**
 * Teto de itens mostrados. Checklist mais longo que isto não é lido em pé, na
 * porta do cliente — e checklist não lido não muda hábito nenhum.
 */
export const LIMITE_ROTEIRO = 7;

/**
 * Vagas garantidas para os itens do ramo. Sem cota, os itens horizontais enchem
 * o roteiro e o pacote de vertical vira enfeite — foi o que os testes pegaram.
 */
export const COTA_RAMO = 2;

/** Campos da ficha que podem provar que um item do roteiro foi coberto. */
export const CAMPOS_RESPOSTA = [
  "empresa",
  "contato",
  "cargo",
  "telefone",
  "objecao",
  "proxima_acao",
  "data_iso",
  "numeros",
  "concorrentes",
] as const;

export type CampoResposta = (typeof CAMPOS_RESPOSTA)[number];

export interface ItemRoteiro {
  /** Estável: vira chave do roteiro gravado no relato. Renomear id apaga histórico. */
  id: string;
  /** Pergunta pronta, do jeito que se fala com o cliente. */
  pergunta: string;
  /**
   * Em que tipos de visita o item é cobrado, e com que peso NAQUELE tipo:
   *   0 = essencial, nunca é cortado pelo teto;
   *   1 = núcleo da conversa;
   *   2 = importante;
   *   3 = bom ter, cai primeiro quando falta espaço.
   * O peso mora aqui e não numa segunda lista de ordem porque a mesma pergunta
   * tem importância diferente em cada tipo — objeção é o assunto do fechamento
   * e apenas um dos assuntos do retorno.
   */
  tipos: Record<string, number>;
  /** Campo da ficha que, preenchido, já responde ao item. */
  campo?: CampoResposta;
  /** Palavras ou trechos que, ditos na visita, provam que o assunto foi tocado. */
  sinais: string[];
}

export interface TipoVisita {
  id: string;
  rotulo: string;
  /** Uma linha dizendo quando escolher este tipo. Aparece no seletor. */
  quando: string;
}

export const TIPOS_VISITA: Record<string, TipoVisita> = {
  prospeccao: {
    id: "prospeccao",
    rotulo: "Prospecção",
    quando: "primeira conversa com esse cliente",
  },
  retorno: {
    id: "retorno",
    rotulo: "Retorno",
    quando: "já tinha conversa antes, ainda sem pedido",
  },
  fechamento: {
    id: "fechamento",
    rotulo: "Fechamento",
    quando: "proposta na mesa, acertando condição",
  },
  posvenda: {
    id: "posvenda",
    rotulo: "Pós-venda",
    quando: "já comprou; entrega, uso e recompra",
  },
};

/**
 * Itens horizontais — servem a qualquer vendedor externo B2B.
 * `proximo_passo` aparece nos quatro tipos de propósito: visita que termina sem
 * próximo passo é visita que não aconteceu.
 */
export const ITENS_BASE: ItemRoteiro[] = [
  {
    id: "quem_decide",
    pergunta: "Quem decide junto com você?",
    tipos: { prospeccao: 1, retorno: 3 },
    sinais: ["quem decide", "decisor", "quem aprova", "aprovação", "comitê", "comite", "diretor", "sócio", "socio", "comprador"],
  },
  {
    id: "situacao_hoje",
    pergunta: "O que vocês usam hoje e o que incomoda nisso?",
    tipos: { prospeccao: 1 },
    campo: "concorrentes",
    sinais: ["usam hoje", "usa hoje", "fornecedor atual", "hoje eles", "reclamou", "incomoda", "trabalha com"],
  },
  {
    id: "volume",
    pergunta: "Que volume vocês movimentam?",
    tipos: { prospeccao: 2, retorno: 3 },
    campo: "numeros",
    sinais: ["por mês", "por mes", "volume", "quantidade", "unidades"],
  },
  {
    id: "orcamento",
    pergunta: "Existe verba aprovada pra isso este ano?",
    tipos: { prospeccao: 3, retorno: 3 },
    sinais: ["verba", "orçamento", "orcamento", "budget", "aprovado pra", "investimento"],
  },
  {
    id: "o_que_mudou",
    pergunta: "O que mudou desde a nossa última conversa?",
    tipos: { retorno: 1, posvenda: 2 },
    sinais: ["desde a última", "desde a ultima", "mudou", "novidade", "da outra vez", "conversamos"],
  },
  {
    id: "proposta_andou",
    pergunta: "A proposta chegou a quem decide?",
    tipos: { retorno: 1 },
    sinais: ["proposta", "cotação", "cotacao", "orçamento", "orcamento", "analisando", "avaliando"],
  },
  {
    id: "objecao_aberta",
    pergunta: "O que ainda pesa contra fechar com a gente?",
    tipos: { retorno: 1, fechamento: 1 },
    campo: "objecao",
    sinais: ["caro", "preço", "preco", "não gostou", "nao gostou", "dúvida", "duvida", "receio", "problema"],
  },
  {
    id: "prazo_decisao",
    pergunta: "Quando vocês pretendem decidir?",
    tipos: { retorno: 2, fechamento: 1 },
    campo: "data_iso",
    sinais: ["decide", "decisão", "decisao", "até dia", "ate dia", "semana que vem", "prazo", "mês que vem", "mes que vem"],
  },
  {
    id: "condicao_comercial",
    pergunta: "Que condição comercial falta acertar?",
    tipos: { fechamento: 1 },
    sinais: ["desconto", "condição", "condicao", "pagamento", "parcel", "à vista", "a vista", "faturamento"],
  },
  {
    id: "como_sai_o_pedido",
    pergunta: "Como sai o pedido: ordem de compra, contrato, pregão?",
    tipos: { fechamento: 1 },
    sinais: ["ordem de compra", "pedido", "contrato", "assinatura", "pregão", "pregao", "empenho", "nota"],
  },
  {
    id: "entrega_e_uso",
    pergunta: "A entrega e o uso saíram como a gente prometeu?",
    tipos: { posvenda: 1 },
    sinais: ["entregou", "entrega", "chegou", "recebeu", "instalou", "usando", "funcionou"],
  },
  {
    id: "recompra",
    pergunta: "Quando entra o próximo pedido?",
    tipos: { posvenda: 1 },
    sinais: ["próximo pedido", "proximo pedido", "recompra", "repor", "reposição", "reposicao", "novo pedido"],
  },
  {
    id: "indicacao",
    pergunta: "Quem mais aí dentro usaria isso?",
    tipos: { posvenda: 2 },
    sinais: ["indicar", "indicação", "indicacao", "outra unidade", "outro setor", "apresentar pra"],
  },
  {
    id: "proximo_passo",
    pergunta: "O que ficou combinado, com data?",
    tipos: { prospeccao: 0, retorno: 0, fechamento: 0, posvenda: 0 },
    campo: "proxima_acao",
    sinais: ["ficou de", "combinamos", "vou mandar", "vou levar", "marcamos", "volto", "retorno"],
  },
];

export function tipoValido(id: unknown): string {
  const s = String(id ?? "").trim().toLowerCase();
  return Object.hasOwn(TIPOS_VISITA, s) ? s : TIPO_PADRAO;
}

export function obterTipo(id: unknown): TipoVisita {
  return TIPOS_VISITA[tipoValido(id)] as TipoVisita;
}

/** Lista para o seletor da interface. */
export function listarTiposVisita(): TipoVisita[] {
  return Object.values(TIPOS_VISITA);
}

/** Ordena por peso, mantendo a ordem de declaração no empate. */
function porPeso(itens: ItemRoteiro[], tipo: string): ItemRoteiro[] {
  return itens
    .map((item, n) => ({ item, n, peso: item.tipos[tipo] ?? 99 }))
    .sort((a, b) => a.peso - b.peso || a.n - b.n)
    .map((x) => x.item);
}

/**
 * Roteiro da visita: o horizontal primeiro, o do ramo depois, o essencial no fim.
 *
 * Três regras, nesta ordem de força:
 *   1. item de peso 0 nunca é cortado (hoje: o próximo passo combinado);
 *   2. o ramo tem cota garantida — senão o pacote de vertical nunca aparece;
 *   3. o que sobra do teto vai para o horizontal, do mais importante ao menos.
 */
export function montarRoteiro(vertical: unknown, tipo: unknown): ItemRoteiro[] {
  const t = tipoValido(tipo);
  const cabe = (i: ItemRoteiro) => Object.hasOwn(i.tipos, t);
  const base = porPeso(ITENS_BASE.filter(cabe), t);
  const doRamo = porPeso(obterVertical(vertical).itens.filter(cabe), t);

  const essenciais = base.filter((i) => i.tipos[t] === 0);
  const reservaRamo = Math.min(doRamo.length, COTA_RAMO);
  const vagasBase = Math.max(0, LIMITE_ROTEIRO - essenciais.length - reservaRamo);

  const escolhidos = base.filter((i) => i.tipos[t] !== 0).slice(0, vagasBase);
  const vagasRamo = Math.max(0, LIMITE_ROTEIRO - essenciais.length - escolhidos.length);
  return [...escolhidos, ...doRamo.slice(0, vagasRamo), ...essenciais];
}

/** Só as perguntas, para a tela e para o payload do catálogo. */
export function perguntasDoRoteiro(vertical: unknown, tipo: unknown): string[] {
  return montarRoteiro(vertical, tipo).map((i) => i.pergunta);
}

export interface PontoRoteiro {
  id: string;
  pergunta: string;
  coberto: boolean;
  /** Como se soube: "ficha" (campo preenchido), "fala" (assunto citado) ou "" (em aberto). */
  como: "ficha" | "fala" | "";
}

function achatar(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "")).join(" ");
  return String(v ?? "");
}

/** Sem caixa, sem acento, sem pontuação: a fala do vendedor não é texto formatado. */
export function normalizar(v: string): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Confere o roteiro contra o que sobrou da visita.
 * `ficha` é a ficha já normalizada pelo portão — usar o valor bruto do modelo
 * aqui marcaria como coberto um campo que foi reprovado por falta de evidência.
 */
export function avaliarRoteiro(
  itens: ItemRoteiro[],
  // `ficha` entra como objeto solto de propósito: quem chama passa o Relato
  // tipado, e obrigar Record<string, unknown> exigiria cast na rota.
  entrada: { transcricao?: string; ficha?: object },
): PontoRoteiro[] {
  const fala = normalizar(entrada.transcricao ?? "");
  const ficha = (entrada.ficha ?? {}) as Record<string, unknown>;
  return itens.map((item) => {
    const valor = item.campo ? achatar(ficha[item.campo]).trim() : "";
    if (valor) return { id: item.id, pergunta: item.pergunta, coberto: true, como: "ficha" };
    const citado = fala ? item.sinais.some((s) => normalizar(s) && fala.includes(normalizar(s))) : false;
    return {
      id: item.id,
      pergunta: item.pergunta,
      coberto: citado,
      como: citado ? "fala" : "",
    };
  });
}

export interface Cobertura {
  cobertos: number;
  total: number;
  /** Percentual inteiro, para o painel. Roteiro vazio é 0, nunca divisão por zero. */
  percentual: number;
  /** Só as perguntas que ficaram em aberto — é o que o vendedor leva pra próxima. */
  em_aberto: string[];
}

export function cobertura(pontos: PontoRoteiro[]): Cobertura {
  const cobertos = pontos.filter((p) => p.coberto).length;
  const total = pontos.length;
  return {
    cobertos,
    total,
    percentual: total ? Math.round((cobertos / total) * 100) : 0,
    em_aberto: pontos.filter((p) => !p.coberto).map((p) => p.pergunta),
  };
}
