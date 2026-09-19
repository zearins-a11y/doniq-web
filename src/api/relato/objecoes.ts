/**
 * Inteligência de Objeções Comerciais B2B & Sugestões de Contorno Tático.
 *
 * Princípios de Engenharia:
 *  1. DETERMINÍSTICO E SEM CUSTO: Não consome tokens de LLM nem introduz latência.
 *     Executa em sub-milissegundo no servidor e no cliente.
 *  2. CONTEXTUAL POR VERTICAL: Um argumento de preço na indústria (TCO, custo por minuto
 *     de máquina parada) é diferente de um argumento no Agro (relação de troca em sacas)
 *     ou no SaaS (economia de horas manuais de equipe).
 *  3. ZERO AUDIO LEAKAGE: A análise opera estritamente sobre a string normalizada do campo
 *     `objecao` (aprovado pelo portão anti-alucinação), nunca sobre áudios brutos ou transcrições.
 */

import { obterVertical } from "./verticais";

export type CategoriaObjecao =
  | "preco"
  | "concorrente"
  | "timing"
  | "decisor"
  | "risco"
  | "indefinida";

export interface PlaybookObjecao {
  categoria: CategoriaObjecao;
  rotulo_categoria: string;
  cor: "amber" | "violet" | "sky" | "rose" | "emerald" | "slate";
  diagnostico: string;
  contra_argumentos: string[];
  perguntas_destravamento: string[];
  orientacao_gestor: string;
}

export interface AnaliseObjecao extends PlaybookObjecao {
  texto_original: string;
}

/** Expressões características em português brasileiro para cada família de objeção. */
const SINAIS_CATEGORIAS: Record<Exclude<CategoriaObjecao, "indefinida">, string[]> = {
  preco: [
    "preco",
    "caro",
    "salgado",
    "valor",
    "orcamento",
    "budget",
    "verba",
    "investimento",
    "desconto",
    "custo",
    "condicao",
    "parcela",
    "caixa",
    "fluxo de caixa",
    "dinheiro",
    "pagamento",
    "mensalidade",
    "tabela",
    "reajuste",
    "margem",
    "caro demais",
    "fora do orcamento",
    "nao cabe no orcamento",
  ],
  concorrente: [
    "concorrente",
    "outro fornecedor",
    "ja usa",
    "ja temos",
    "ja tenho",
    "ja usamos",
    "contrato",
    "fidelidade",
    "renovacao",
    "parceiro",
    "atendido",
    "fornecedor atual",
    "marca x",
    "totvs",
    "sap",
    "senior",
    "linx",
    "omie",
    "conta azul",
    "rd station",
    "hubspot",
    "pipedrive",
    "salesforce",
    "stara",
    "jacto",
    "john deere",
    "weg",
    "skf",
    "bosch",
    "medstar",
    "outra solucao",
  ],
  timing: [
    "timing",
    "momento",
    "ano que vem",
    "proximo ano",
    "mes que vem",
    "depois",
    "segundo semestre",
    "proximo trimestre",
    "sem tempo",
    "apressado",
    "esperar",
    "adiar",
    "postergou",
    "congelado",
    "stand by",
    "standby",
    "prioridade",
    "nao e prioridade",
    "agora nao",
    "mais pra frente",
    "apos o fechamento",
    "apos a safra",
    "parada de fim de ano",
  ],
  decisor: [
    "decisor",
    "diretoria",
    "diretor",
    "socio",
    "gerente",
    "comite",
    "conselho",
    "matriz",
    "dono",
    "presidente",
    "superior",
    "aprovar",
    "aprovacao",
    "levar para",
    "reuniao de diretoria",
    "nao decido",
    "nao tenho autonomia",
    "autonomia",
    "fechar sozinho",
    "decidir sozinho",
    "compras",
    "suprimentos",
    "compliance",
    "ti precisa aprovar",
    "seguranca da informacao",
    "engenharia",
  ],
  risco: [
    "risco",
    "medo",
    "receio",
    "inseguro",
    "inseguranca",
    "estabilidade",
    "parar a fabrica",
    "parada",
    "travar",
    "migracao",
    "complexo",
    "complicado",
    "dificil",
    "resistencia",
    "equipe nao vai usar",
    "suporte",
    "garantia",
    "pos venda",
    "nao conheco",
    "nunca ouvi falar",
    "confianca",
    "lgpd",
    "falhar",
    "instavel",
  ],
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Classifica a categoria predominante da objeção com pontuação determinística.
 */
export function classificarCategoriaObjecao(texto: string): CategoriaObjecao {
  const norm = normalizar(texto);
  if (!norm) return "indefinida";

  let melhorCategoria: CategoriaObjecao = "indefinida";
  let maiorPontuacao = 0;

  const ordemCategorias: Exclude<CategoriaObjecao, "indefinida">[] = [
    "concorrente",
    "preco",
    "timing",
    "decisor",
    "risco",
  ];

  for (const cat of ordemCategorias) {
    let pontos = 0;
    for (const sinal of SINAIS_CATEGORIAS[cat]) {
      if (norm.includes(sinal)) {
        pontos += sinal.includes(" ") ? 3 : 1;
      }
    }
    if (pontos > maiorPontuacao) {
      maiorPontuacao = pontos;
      melhorCategoria = cat;
    }
  }

  return melhorCategoria;
}

/**
 * Gera o Playbook de destravamento adaptado à vertical do cliente.
 */
export function obterPlaybookObjecao(
  categoria: CategoriaObjecao,
  verticalId = "geral",
): PlaybookObjecao {
  const normalId = verticalId === "saude" ? "opme" : verticalId;
  const vertical = obterVertical(normalId);

  switch (categoria) {
    case "preco": {
      if (vertical.id === "industria") {
        return {
          categoria: "preco",
          rotulo_categoria: "Preço, TCO & Custo de Parada",
          cor: "amber",
          diagnostico:
            "O cliente achou o investimento elevado ou alegou restrição de verba de manutenção industrial.",
          contra_argumentos: [
            "Demonstrar que o custo de uma única hora de parada não programada (MTBF/OEE) é superior à diferença de preço da solução.",
            "Evidenciar a durabilidade e garantia mecânica estendida, reduzindo intervenções corretivas e custos de reposição.",
            "Propor início com um lote ou máquina piloto crítica com homologação assistida pela engenharia.",
          ],
          perguntas_destravamento: [
            "Quanto custou a última parada não programada nessa linha e quanto tempo a manutenção levou para restabelecer o turno?",
            "Se nós garantirmos um tempo médio entre falhas maior com reposição rápida, como isso impacta sua meta de OEE?",
          ],
          orientacao_gestor:
            "Oriente o vendedor a levantar a planilha de custos de manutenção com o PCM/Engenharia para comprovar o Custo Total de Propriedade (TCO).",
        };
      }

      if (vertical.id === "servicos") {
        return {
          categoria: "preco",
          rotulo_categoria: "Preço, ROI & Horas Operacionais",
          cor: "amber",
          diagnostico:
            "O cliente questionou o custo das licenças, implantação ou alegou orçamento congelado.",
          contra_argumentos: [
            "Quantificar o volume de horas de retrabalho manual que a automação elimina na rotina dos analistas.",
            "Propor implantação modular em fases para gerar valor rápido no primeiro mês sem exigir todo o budget anual.",
            "Apresentar estimativa de payback detalhada baseada em redução de horas extras e erros de processos.",
          ],
          perguntas_destravamento: [
            "Quantas horas por semana a sua equipe perde hoje consolidando dados manuais ou corrigindo falhas de integração?",
            "Se iniciarmos com um escopo piloto reduzido para validar o ganho de tempo, qual marco de sucesso destravaria a expansão?",
          ],
          orientacao_gestor:
            "Ajude o vendedor a estruturar um business case conciso para o CFO demonstrando ganho direto de produtividade da equipe.",
        };
      }

      if (vertical.id === "agro") {
        return {
          categoria: "preco",
          rotulo_categoria: "Preço & Relação de Troca",
          cor: "amber",
          diagnostico:
            "O produtor ou revenda achou o valor alto frente ao momento do mercado de commodities.",
          contra_argumentos: [
            "Traduzir o investimento na relação de troca (sacas por hectare ou arrobas), demonstrando o ganho líquido de produtividade.",
            "Oferecer condição de pagamento estruturada para liquidação na safra ou safrinha (barter/cédula de produto).",
            "Mostrar comparativo de rentabilidade histórica por talhão com o manejo completo.",
          ],
          perguntas_destravamento: [
            "Quantas sacas a mais por hectare você precisa colher para esse investimento se pagar com sobra na próxima safra?",
            "Se estruturarmos o vencimento casado com a entrega dos grãos, conseguimos garantir o lote para esta janela?",
          ],
          orientacao_gestor:
            "Monitore a relação de troca atual da cultura do cliente para municiar o vendedor com a conta pronta em sacas.",
        };
      }

      if (vertical.id === "opme") {
        return {
          categoria: "preco",
          rotulo_categoria: "Preço, Custo por Procedimento & Glosas",
          cor: "amber",
          diagnostico:
            "O hospital, clínica ou comitê de compras apontou tabela acima do orçamento do setor.",
          contra_argumentos: [
            "Demonstrar a redução do tempo cirúrgico/procedimento e a diminuição do risco de reinternação do paciente.",
            "Comprovar histórico de aprovação sem glosa junto às operadoras e convênios parceiros.",
            "Apresentar pacote fechado por procedimento com previsibilidade orçamentária total.",
          ],
          perguntas_destravamento: [
            "Qual é o índice de glosa ou retrabalho documental que vocês enfrentam hoje com o material da linha atual?",
            "Se demonstrarmos que o tempo de sala cirúrgica cai em 20 minutos por caso, o que isso representa na agenda do centro médico?",
          ],
          orientacao_gestor:
            "Capacite o vendedor a negociar demonstrando o impacto financeiro das glosas e da rotatividade de leitos.",
        };
      }

      // Geral
      return {
        categoria: "preco",
        rotulo_categoria: "Preço, Orçamento & ROI",
        cor: "amber",
        diagnostico:
          "O cliente sinalizou restrição orçamentária ou considerou a proposta acima do investimento planejado.",
        contra_argumentos: [
          "Deslocar a conversa do custo inicial para o custo de inação (quanto custa para a empresa continuar com o problema atual).",
          "Fracionar a entrega ou adequar as condições de pagamento ao fluxo de caixa do cliente.",
          "Demonstrar o retorno financeiro com base em métricas reais de clientes com perfil idêntico.",
        ],
        perguntas_destravamento: [
          "Se o investimento não fosse um obstáculo hoje, o que mais da nossa solução geraria impacto imediato no seu negócio?",
          "Qual marco ou resultado você precisaria atingir nos primeiros 90 dias para considerar este investimento um sucesso?",
        ],
        orientacao_gestor:
          "Verifique se o vendedor explorou a gravidade da dor do cliente antes de enviar a proposta. Proponha condições de entrada sem queimar margem.",
      };
    }

    case "concorrente": {
      if (vertical.id === "industria") {
        return {
          categoria: "concorrente",
          rotulo_categoria: "Concorrente & Peças de Reposição",
          cor: "violet",
          diagnostico:
            "O cliente já tem máquinas ou suprimentos de outra marca padronizados na fábrica.",
          contra_argumentos: [
            "Propor um teste comparativo em bancada ou máquina secundária sem mexer no contrato da linha principal.",
            "Destacar disponibilidade imediata de assistência técnica e peças a pronta-entrega no mercado nacional.",
            "Mapear gargalos de manutenção e custos de frete internacional que o fornecedor atual impõe.",
          ],
          perguntas_destravamento: [
            "Qual foi o maior tempo de espera por peças sobressalentes que vocês tiveram com o fornecedor atual no último ano?",
            "Se rodarmos um teste piloto em um torno por 15 dias sem parar a fábrica, quais métricas seriam determinantes para vocês?",
          ],
          orientacao_gestor:
            "Estimule o vendedor a não tentar virar a fábrica inteira de início: uma máquina piloto que comprova desempenho abre a porta para o restante.",
        };
      }

      if (vertical.id === "servicos") {
        return {
          categoria: "concorrente",
          rotulo_categoria: "Concorrente & Integração sem Ruptura",
          cor: "violet",
          diagnostico:
            "O cliente utiliza outro software/serviço e tem receio de substituir a ferramenta atual.",
          contra_argumentos: [
            "Posicionar a solução como camada complementar integrada via API, sem obrigar a rasgar o sistema legado.",
            "Oferecer migração assistida de dados para neutralizar o receio de transição traumática.",
            "Focar nos pontos em que o concorrente atual gera chamados de suporte não atendidos ou lentidão.",
          ],
          perguntas_destravamento: [
            "Quando vence a próxima renovação contratual do sistema atual e o que hoje mais gera frustração na rotina dos usuários?",
            "Se demonstrarmos que conseguimos nos conectar ao seu sistema em 48 horas sem perder nenhum dado histórico, vale uma demonstração?",
          ],
          orientacao_gestor:
            "Oriente o vendedor a mapear o calendário de renovação de contratos de software para iniciar a abordagem 90 dias antes do vencimento.",
        };
      }

      // Geral
      return {
        categoria: "concorrente",
        rotulo_categoria: "Concorrente & Contrato Vigente",
        cor: "violet",
        diagnostico:
          "O cliente já possui fornecedor ativo ou contrato vigente e hesita frente aos custos de troca.",
        contra_argumentos: [
          "Não confrontar o fornecedor atual diretamente; identificar lacunas de suporte, prazo e atendimento que ele deixa abertas.",
          "Propor contratação complementar para demandas excedentes ou projetos especiais onde o concorrente falha.",
          "Construir relacionamento para posicionar a empresa como primeira opção na próxima janela de renovação contratual.",
        ],
        perguntas_destravamento: [
          "Em uma escala de 0 a 10, quão satisfeito você está com o tempo de resposta e flexibilidade do seu parceiro atual?",
          "O que precisaria acontecer de diferente no atendimento para fazer você considerar uma alternativa na próxima renovação?",
        ],
        orientacao_gestor:
          "Instrua o vendedor a registrar a data de vencimento do contrato do concorrente para criar um gatilho de retorno automático na agenda.",
      };
    }

    case "timing": {
      return {
        categoria: "timing",
        rotulo_categoria: "Timing & Prioridade",
        cor: "sky",
        diagnostico:
          "O cliente reconhece o valor, mas adia o fechamento alegando outras prioridades ou preferência por falar mais adiante.",
        contra_argumentos: [
          "Quantificar as perdas acumuladas a cada mês de adiamento (custo da inação).",
          "Oferecer condição de reserva de lote, tabela com desconto garantido ou slot de implantação mediante assinatura antecipada.",
          "Apresentar cronograma de implantação suave que inicia o planejamento agora sem sobrecarregar a equipe no curto prazo.",
        ],
        perguntas_destravamento: [
          "O que especificamente precisa acontecer na empresa entre hoje e essa data futura para que esse projeto seja prioridade?",
          "Se congelarmos as condições comerciais atuais para garantir o início planejado, conseguimos formalizar o acordo esta semana?",
        ],
        orientacao_gestor:
          "Treine o vendedor para não aceitar um 'me procure ano que vem' sem um compromisso agendado com pauta clara e critérios de reativação.",
      };
    }

    case "decisor": {
      return {
        categoria: "decisor",
        rotulo_categoria: "Decisor, Governança & Comitê",
        cor: "rose",
        diagnostico:
          "O interlocutor não decide sozinho e precisa de aval da diretoria, sócios, comitê de compras ou validação técnica.",
        contra_argumentos: [
          "Municiar o interlocutor atual com um sumário executivo em 1 página preparado para a diretoria, com números e payback claros.",
          "Colocar-se à disposição para uma apresentação executiva conjunta de 15 minutos focada nas dores da alta gestão.",
          "Levantar antecipadamente todas as exigências contratuais, de segurança e compliance para evitar travas burocráticas.",
        ],
        perguntas_destravamento: [
          "Qual critério ou questionamento você prevê que o seu sócio/diretoria levantará ao analisar este projeto?",
          "Faz sentido montarmos uma breve apresentação técnica em conjunto para que você não precise defender o projeto sozinho?",
        ],
        orientacao_gestor:
          "Acompanhe o vendedor nas reuniões com comitês ou decisores executivos para transmitir solidez institucional e agilizar a deliberação.",
      };
    }

    case "risco": {
      return {
        categoria: "risco",
        rotulo_categoria: "Risco, Segurança & Transição",
        cor: "emerald",
        diagnostico:
          "O cliente tem receio de paralisar a operação, enfrentar resistência dos funcionários ou sofrer com instabilidade.",
        contra_argumentos: [
          "Oferecer período de garantia com suporte prioritário e plano de contingência para reversão se necessário.",
          "Apresentar casos de sucesso em clientes do mesmo porte demonstrando que a transição ocorreu sem sustos.",
          "Comprometer-se com treinamento completo da equipe operacional antes da virada definitiva de chave.",
        ],
        perguntas_destravamento: [
          "Se nós desenharmos um plano de implantação faseado com acompanhamento diário no primeiro mês, isso resolve o receio da equipe?",
          "Qual teste ou evidência prática traria total segurança para a sua equipe operacional antes de irmos para produção?",
        ],
        orientacao_gestor:
          "Disponibilize depoimentos em vídeo ou contatos de referência de outros clientes do mesmo segmento para que o cliente converse de igual para igual.",
      };
    }

    default: {
      return {
        categoria: "indefinida",
        rotulo_categoria: "Objeção Comercial",
        cor: "slate",
        diagnostico:
          "O cliente manifestou uma ressalva específica que requer isolamento e aprofundamento na próxima conversa.",
        contra_argumentos: [
          "Isolar a objeção: confirmar se este ponto é a única pendência para o fechamento.",
          "Demonstrar flexibilidade consultiva para adaptar a proposta à realidade operacional do cliente.",
        ],
        perguntas_destravamento: [
          "Além deste ponto que conversamos, existe algum outro detalhe que nos impede de avançar nesta parceria?",
          "Como nós podemos construir uma solução a quatro mãos que atenda exatamente a este requisito?",
        ],
        orientacao_gestor:
          "Oriente o vendedor a ouvir ativamente e fazer perguntas de confirmação para entender a causa raiz da ressalva.",
      };
    }
  }
}

/**
 * Ponto de entrada: analisa um texto de objeção e devolve a estratégia completa.
 */
export function analisarObjecao(texto: string, verticalId = "geral"): AnaliseObjecao {
  const textoLimpo = (texto || "").trim();
  const categoria = classificarCategoriaObjecao(textoLimpo);
  const playbook = obterPlaybookObjecao(categoria, verticalId);

  return {
    ...playbook,
    texto_original: textoLimpo,
  };
}
