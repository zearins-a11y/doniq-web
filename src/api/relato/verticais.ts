/**
 * Pacotes de vertical.
 *
 * O produto é horizontal: qualquer vendedor externo B2B usa o mesmo motor.
 * O que muda por ramo é configuração — vocabulário do ASR, o que perguntar
 * quando o vendedor esquece, e os itens de roteiro do ramo. Nada aqui é código
 * específico de nicho: é dado.
 *
 * Para abrir um ramo novo, acrescente uma entrada em VERTICAIS. Nada mais.
 *
 * Os termos vêm ordenados por utilidade: o glossário do ASR tem teto de
 * caracteres e corta o fim da lista, então o que erra mais fica primeiro.
 */

import type { ItemRoteiro } from "./checklist";

export interface Vertical {
  id: string;
  rotulo: string;
  /**
   * Nome curto do ramo, para o chip do celular. O rótulo inteiro explica o ramo
   * numa lista; no chip ele vira parede de seis linhas em tela de 430px.
   */
  curto: string;
  /** Uma linha no prompt do LLM situando o contexto da visita. */
  contexto: string;
  /** Vocabulário que o Whisper erra sem ajuda. Mais provável de errar primeiro. */
  termos: string[];
  /** O que costuma faltar numa visita deste ramo, para o campo faltou_perguntar. */
  lacunas: string[];
  /**
   * Itens de roteiro específicos deste ramo. Entram DEPOIS dos itens horizontais
   * (ITENS_BASE em checklist.ts) e só nos tipos de visita que cada um declara.
   * O ramo `geral` não tem nenhum de propósito: o roteiro dele é o base.
   */
  itens: ItemRoteiro[];
}

export const VERTICAL_PADRAO = "geral";

export const VERTICAIS: Record<string, Vertical> = {
  geral: {
    id: "geral",
    curto: "Geral B2B",
    rotulo: "Vendas externas B2B (geral)",
    contexto: "Visita comercial B2B presencial.",
    termos: [],
    lacunas: [
      "quem mais participa da decisão",
      "orçamento disponível",
      "prazo de decisão",
      "concorrente atual",
      "volume",
    ],
    itens: [],
  },

  opme: {
    id: "opme",
    curto: "Saúde",
    rotulo: "Saúde — dispositivos médicos",
    contexto:
      "Visita a hospital, clínica ou distribuidor de OPME (órteses, próteses e materiais especiais). " +
      "O interlocutor costuma ser cirurgião, instrumentador, enfermeiro do CME, comprador ou gestor de suprimentos.",
    termos: [
      "OPME",
      "CME",
      "consignado",
      "instrumentador",
      "haste femoral",
      "placa bloqueada",
      "parafuso pedicular",
      "parafuso canulado",
      "fio de Kirschner",
      "cimento ósseo",
      "enxerto ósseo",
      "artroplastia",
      "artrodese",
      "osteossíntese",
      "videolaparoscopia",
      "stent",
      "cateter",
      "introdutor",
      "grampeador cirúrgico",
      "sutura mecânica",
      "malha cirúrgica",
      "prótese de quadril",
      "prótese de joelho",
      "caixa de instrumental",
      "esterilização",
      "autoclave",
      "rastreabilidade",
      "registro ANVISA",
      "cotação",
      "pregão",
      "glosa",
      "auditoria de conta",
      "convênio",
      "tabela Brasíndice",
      "tabela SIMPRO",
      "CBHPM",
      "nota de consignação",
      "reposição de consignado",
      "centro cirúrgico",
      "sala híbrida",
      "agenda cirúrgica",
    ],
    lacunas: [
      "quem aprova a compra além do cirurgião (suprimentos, comissão de padronização)",
      "volume de cirurgias por mês",
      "situação do consignado em posse do hospital",
      "prazo de pagamento e histórico de glosa",
      "quais marcas concorrentes estão padronizadas",
    ],
    itens: [
      {
        id: "opme_volume_cirurgico",
        pergunta: "Quantas cirurgias desse tipo vocês fazem por mês?",
        tipos: { prospeccao: 1, retorno: 3 },
        campo: "numeros",
        sinais: ["cirurgia", "procedimento", "caso por mes", "casos por mes", "agenda cirurgica"],
      },
      {
        id: "opme_padronizacao",
        pergunta: "Quem participa da comissão de padronização?",
        tipos: { prospeccao: 1, retorno: 3, fechamento: 2 },
        sinais: ["padronização", "padronizacao", "comissão", "comissao", "suprimentos", "compras"],
      },
      {
        id: "opme_consignado",
        pergunta: "Como está o consignado que já está aqui?",
        tipos: { retorno: 1, posvenda: 1 },
        sinais: ["consignado", "consignação", "consignacao", "caixa", "reposição", "reposicao", "inventário", "inventario"],
      },
      {
        id: "opme_pagamento",
        pergunta: "Qual o prazo de pagamento praticado, e tem histórico de glosa?",
        tipos: { retorno: 2, fechamento: 1 },
        sinais: ["prazo de pagamento", "glosa", "faturamento", "auditoria", "convênio", "convenio"],
      },
      {
        id: "opme_treinamento",
        pergunta: "O instrumentador precisa de treinamento na caixa?",
        tipos: { fechamento: 1, posvenda: 2 },
        sinais: ["instrumentador", "treinamento", "treinar", "acompanhar a cirurgia", "sala"],
      },
    ],
  },

  agro: {
    id: "agro",
    curto: "Agro",
    rotulo: "Agro — insumos e revenda",
    contexto:
      "Visita a fazenda, revenda ou cooperativa. O interlocutor costuma ser produtor, " +
      "agrônomo, RTV (revendedor técnico de vendas) ou gerente de compras da revenda.",
    termos: [
      "RTV",
      "talhão",
      "hectare",
      "saca por hectare",
      "cultivar",
      "híbrido",
      "defensivo",
      "herbicida",
      "fungicida",
      "inseticida",
      "adjuvante",
      "fertilizante foliar",
      "NPK",
      "calagem",
      "gessagem",
      "dessecação",
      "plantio direto",
      "safrinha",
      "segunda safra",
      "janela de plantio",
      "estande de plantas",
      "população de plantas",
      "ferrugem asiática",
      "percevejo",
      "lagarta do cartucho",
      "nematoide",
      "mancha alvo",
      "pulverizador autopropelido",
      "barra de pulverização",
      "vazão",
      "receituário agronômico",
      "MAPA",
      "barter",
      "troca-troca",
      "CPR",
      "cédula de produto rural",
      "armazém",
      "colheitadeira",
      "plantadeira",
      "análise de solo",
    ],
    lacunas: [
      "área plantada em hectares",
      "cultura e janela de plantio",
      "quem assina o receituário agronômico",
      "forma de pagamento (barter, safra, à vista)",
      "qual revenda atende hoje",
    ],
    itens: [
      {
        id: "agro_area_cultura",
        pergunta: "Quantos hectares e qual cultura nesta safra?",
        tipos: { prospeccao: 1, retorno: 2 },
        campo: "numeros",
        sinais: ["hectare", "alqueire", "talhão", "talhao", "soja", "milho", "algodão", "algodao", "safra"],
      },
      {
        id: "agro_janela_plantio",
        pergunta: "Qual a janela de plantio de vocês?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 2 },
        sinais: ["janela", "plantio", "plantar", "semear", "safrinha", "segunda safra"],
      },
      {
        id: "agro_recomendacao",
        pergunta: "Quem faz a recomendação técnica aqui?",
        tipos: { prospeccao: 1, retorno: 2 },
        sinais: ["agrônomo", "agronomo", "rtv", "receituário", "receituario", "consultor", "recomendação", "recomendacao"],
      },
      {
        id: "agro_pagamento_barter",
        pergunta: "O pagamento seria em barter, em safra ou à vista?",
        tipos: { fechamento: 1 },
        sinais: ["barter", "troca troca", "em safra", "cpr", "à vista", "a vista", "financiamento"],
      },
      {
        id: "agro_problema_safra",
        pergunta: "Qual foi o maior problema fitossanitário da última safra?",
        tipos: { prospeccao: 3, posvenda: 1 },
        sinais: ["ferrugem", "percevejo", "lagarta", "nematoide", "mancha", "praga", "daninha", "perda"],
      },
    ],
  },

  seguros: {
    id: "seguros",
    curto: "Seguros",
    rotulo: "Seguros e benefícios corporativos",
    contexto:
      "Visita a empresa cliente ou prospect de corretora. O interlocutor costuma ser " +
      "RH, financeiro, sócio ou gestor de facilities.",
    termos: [
      "apólice",
      "endosso",
      "sinistralidade",
      "sinistro",
      "prêmio",
      "franquia",
      "carência",
      "coparticipação",
      "vidas",
      "aditivo",
      "reajuste técnico",
      "faixa etária",
      "rede credenciada",
      "reembolso",
      "estipulante",
      "beneficiário",
      "dependente",
      "corretora",
      "seguradora",
      "operadora",
      "ANS",
      "SUSEP",
      "PME",
      "adesão",
      "movimentação cadastral",
      "vigência",
      "renovação",
      "cosseguro",
      "resseguro",
      "responsabilidade civil",
      "D&O",
      "seguro garantia",
      "vida em grupo",
      "auxílio funeral",
    ],
    lacunas: [
      "número de vidas e composição (titulares e dependentes)",
      "data de vigência e renovação da apólice atual",
      "sinistralidade dos últimos 12 meses",
      "qual corretora atende hoje",
      "quem assina a decisão (RH, financeiro ou sócio)",
    ],
    itens: [
      {
        id: "seguros_vidas",
        pergunta: "Quantas vidas, entre titulares e dependentes?",
        tipos: { prospeccao: 1, retorno: 2 },
        campo: "numeros",
        sinais: ["vidas", "titular", "dependente", "funcionários", "funcionarios", "colaboradores"],
      },
      {
        id: "seguros_vigencia",
        pergunta: "Quando vence a apólice atual?",
        tipos: { prospeccao: 1, retorno: 1, fechamento: 2 },
        campo: "data_iso",
        sinais: ["apólice", "apolice", "vigência", "vigencia", "renovação", "renovacao", "vence"],
      },
      {
        id: "seguros_sinistralidade",
        pergunta: "Como está a sinistralidade do último ano?",
        tipos: { prospeccao: 2, retorno: 1 },
        sinais: ["sinistralidade", "sinistro", "uso do plano", "reajuste", "utilização", "utilizacao"],
      },
      {
        id: "seguros_movimentacao",
        pergunta: "Quem cuida da movimentação cadastral do dia a dia?",
        tipos: { fechamento: 1, posvenda: 1 },
        sinais: ["movimentação", "movimentacao", "cadastral", "inclusão", "inclusao", "exclusão", "exclusao", "rh"],
      },
      {
        id: "seguros_rede",
        pergunta: "A rede credenciada atende onde eles realmente estão?",
        tipos: { prospeccao: 3, fechamento: 2, posvenda: 1 },
        sinais: ["rede", "credenciada", "hospital", "reembolso", "atendimento", "cidade"],
      },
    ],
  },

  imoveis: {
    id: "imoveis",
    curto: "Imóveis",
    rotulo: "Imóveis — corretor e incorporadora",
    contexto:
      "Visita de corretor de imóveis: cliente comprador, proprietário para captação, " +
      "incorporadora, imobiliária parceira ou plantão de vendas no estande. " +
      "A conversa gira em torno de perfil do imóvel, crédito e prazo de mudança.",
    termos: [
      "ITBI",
      "matrícula",
      "averbação",
      "escritura",
      "habite-se",
      "alienação fiduciária",
      "SBPE",
      "FGTS",
      "MCMV",
      "Minha Casa Minha Vida",
      "INCC",
      "VGV",
      "permuta",
      "distrato",
      "sinal",
      "área privativa",
      "fração ideal",
      "IPTU",
      "condomínio",
      "CRECI",
      "laudêmio",
      "usufruto",
      "inventário",
      "contrato de gaveta",
      "na planta",
      "chave na mão",
      "tabela de vendas",
      "unidade",
      "metragem",
      "captação",
      "exclusividade",
      "corretagem",
      "repasse",
      "avaliação",
      "certidão negativa",
      "financiamento aprovado",
      "carta de crédito",
      "entrada",
    ],
    lacunas: [
      "valor de crédito já aprovado e em qual banco",
      "quanto tem de entrada, contando FGTS",
      "prazo em que precisa se mudar",
      "quem mais decide junto (cônjuge, família, sócio)",
      "se tem imóvel para vender ou dar em permuta",
    ],
    itens: [
      {
        id: "imoveis_perfil",
        pergunta: "Que imóvel resolve: quantos quartos, qual bairro e até quanto?",
        tipos: { prospeccao: 1, retorno: 2 },
        campo: "numeros",
        sinais: ["quarto", "dormitório", "dormitorio", "bairro", "metros", "m²", "suíte", "suite", "vaga", "planta"],
      },
      {
        id: "imoveis_credito",
        pergunta: "O crédito já está aprovado? Em qual banco e por quanto?",
        tipos: { prospeccao: 1, retorno: 1, fechamento: 0 },
        campo: "numeros",
        sinais: ["financiamento", "aprovado", "aprovação", "aprovacao", "caixa", "banco", "sbpe", "carta de crédito", "carta de credito", "à vista", "a vista"],
      },
      {
        id: "imoveis_entrada",
        pergunta: "Quanto entra de entrada, contando FGTS?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        sinais: ["entrada", "fgts", "sinal", "poupança", "poupanca", "recursos próprios", "recursos proprios"],
      },
      {
        id: "imoveis_permuta",
        pergunta: "Tem imóvel para vender ou dar em permuta antes de comprar?",
        tipos: { prospeccao: 3, retorno: 2, fechamento: 2 },
        sinais: ["permuta", "vender o atual", "meu apartamento", "minha casa", "imóvel atual", "imovel atual", "aluguel"],
      },
      {
        id: "imoveis_mudanca",
        pergunta: "Para quando precisa da chave na mão?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        campo: "data_iso",
        sinais: ["mudança", "mudanca", "entrega", "habite-se", "obra", "pronto", "prazo"],
      },
      {
        id: "imoveis_documentos",
        pergunta: "Matrícula, certidões e ITBI estão encaminhados?",
        tipos: { fechamento: 1, posvenda: 1 },
        sinais: ["matrícula", "matricula", "certidão", "certidao", "itbi", "escritura", "cartório", "cartorio", "averbação", "averbacao"],
      },
      {
        id: "imoveis_entrega",
        pergunta: "Vistoria e entrega de chaves: ficou pendência com a obra ou o banco?",
        tipos: { posvenda: 1 },
        sinais: ["vistoria", "chave", "chaves", "assistência técnica", "assistencia tecnica", "repasse", "obra", "síndico", "sindico", "condomínio", "condominio"],
      },
    ],
  },

  consorcio: {
    id: "consorcio",
    curto: "Consórcios",
    rotulo: "Consórcios — imóvel, veículo e serviços",
    contexto:
      "Visita de corretor ou representante de administradora de consórcio. " +
      "O cliente pode ser pessoa física, frota ou empresa, e a conversa gira em torno " +
      "de valor da carta, parcela que cabe no mês, prazo do grupo e estratégia de lance.",
    termos: [
      "carta de crédito",
      "cota",
      "grupo",
      "assembleia",
      "contemplação",
      "lance livre",
      "lance embutido",
      "lance fixo",
      "sorteio",
      "taxa de administração",
      "fundo comum",
      "fundo de reserva",
      "valor categoria",
      "seguro prestamista",
      "reajuste do bem",
      "prazo do grupo",
      "transferência de cota",
      "cessão de cota",
      "desistente",
      "quitação",
      "amortização",
      "aporte",
      "alienação fiduciária",
      "administradora",
      "consorciado",
      "ABAC",
      "BACEN",
      "parcela",
      "diluição",
      "adesão",
      "bem móvel",
      "bem imóvel",
    ],
    lacunas: [
      "valor de carta que resolve o objetivo dele",
      "parcela que cabe no mês, sem aperto",
      "em quanto tempo ele precisa do bem",
      "se tem dinheiro guardado para lance ou vai esperar sorteio",
      "se já tem cota em outra administradora",
    ],
    itens: [
      {
        id: "consorcio_objetivo",
        pergunta: "O consórcio é para qual bem: imóvel, veículo ou serviço?",
        tipos: { prospeccao: 1, retorno: 2 },
        sinais: ["imóvel", "imovel", "apartamento", "terreno", "carro", "caminhão", "caminhao", "moto", "reforma", "serviço", "servico"],
      },
      {
        id: "consorcio_parcela",
        pergunta: "Que parcela cabe no mês, sem aperto?",
        tipos: { prospeccao: 1, retorno: 1, fechamento: 0 },
        campo: "numeros",
        sinais: ["parcela", "mensalidade", "por mês", "por mes", "cabe", "orçamento", "orcamento", "renda"],
      },
      {
        id: "consorcio_lance",
        pergunta: "Tem reserva para dar lance ou vai esperar o sorteio?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        sinais: ["lance", "embutido", "livre", "sorteio", "contemplação", "contemplacao", "fgts", "reserva", "guardado"],
      },
      {
        id: "consorcio_prazo",
        pergunta: "Em quanto tempo ele precisa do bem na mão?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        campo: "data_iso",
        sinais: ["prazo", "quando", "urgência", "urgencia", "meses", "ano", "pressa"],
      },
      {
        id: "consorcio_cota_atual",
        pergunta: "Já tem cota em outra administradora ou financiamento em andamento?",
        tipos: { prospeccao: 3, retorno: 2, posvenda: 1 },
        campo: "concorrentes",
        sinais: ["outra administradora", "já tenho", "ja tenho", "consórcio", "consorcio", "financiamento", "banco", "cota"],
      },
      {
        id: "consorcio_pos_contemplacao",
        pergunta: "Depois de contemplado, ele sabe como usa a carta?",
        tipos: { fechamento: 2, posvenda: 1 },
        sinais: ["contemplado", "usar a carta", "liberação", "liberacao", "documentação", "documentacao", "avaliação", "avaliacao"],
      },
    ],
  },

  industria: {
    id: "industria",
    curto: "Indústria",
    rotulo: "Indústria — máquinas e manutenção",
    contexto:
      "Visita a fábrica, planta industrial ou distribuidor técnico. " +
      "O interlocutor costuma ser gerente de manutenção (PCM), engenheiro de produção, compras técnicas ou diretor industrial.",
    termos: [
      "CLP",
      "inversor de frequência",
      "redutor",
      "servomotor",
      "esteira transportadora",
      "pneumática",
      "hidráulica",
      "usinagem",
      "CNC",
      "caldeiraria",
      "manutenção preditiva",
      "tempo de parada",
      "MTBF",
      "MTTR",
      "OEE",
      "setup de máquina",
      "chapa galvanizada",
      "aço inox",
      "norma NR-12",
      "comissionamento",
      "lead time",
    ],
    lacunas: [
      "se a compra é para parada programada ou emergência",
      "tensão e capacidade nominal da linha",
      "quem valida o parecer técnico (engenharia ou manutenção)",
      "se tem contrato anual ou cotação avulsa",
      "qual fabricante ou fornecedor atende a planta hoje",
    ],
    itens: [
      {
        id: "industria_capacidade",
        pergunta: "Qual é a capacidade da linha e onde o equipamento/peça vai operar?",
        tipos: { prospeccao: 1, retorno: 2 },
        campo: "numeros",
        sinais: ["capacidade", "linha", "produção", "producao", "tonelada", "hora", "tensão", "tensao", "volts", "potência", "potencia", "máquina", "maquina"],
      },
      {
        id: "industria_parada_urgencia",
        pergunta: "A compra é para parada programada de manutenção ou emergência?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        campo: "data_iso",
        sinais: ["parada", "programada", "emergência", "emergencia", "urgente", "manutenção", "manutencao", "quebrou", "prazo"],
      },
      {
        id: "industria_decisor_tecnico",
        pergunta: "Quem valida o parecer técnico na fábrica antes de compras liberar o pedido?",
        tipos: { prospeccao: 1, retorno: 2, fechamento: 2 },
        campo: "cargo",
        sinais: ["engenharia", "engenheiro", "manutenção", "manutencao", "pcm", "produção", "producao", "técnico", "tecnico"],
      },
      {
        id: "industria_concorrente",
        pergunta: "Qual marca ou fornecedor está instalado na planta hoje?",
        tipos: { prospeccao: 2, retorno: 2, fechamento: 3 },
        campo: "concorrentes",
        sinais: ["marca", "concorrente", "fabricante", "instalado", "fornecedor atual", "peça original"],
      },
      {
        id: "industria_comissionamento",
        pergunta: "O fornecimento inclui instalação, comissionamento ou treinamento da equipe?",
        tipos: { fechamento: 1, posvenda: 1 },
        sinais: ["instalação", "instalacao", "comissionamento", "start-up", "startup", "treinamento", "garantia", "assistência", "assistencia"],
      },
    ],
  },

  servicos: {
    id: "servicos",
    curto: "Serviços B2B",
    rotulo: "Serviços B2B — software e consultoria",
    contexto:
      "Visita comercial ou reunião presencial de tecnologia, software corporativo (SaaS), consultoria ou serviços B2B. " +
      "O interlocutor costuma ser CTO, CIO, CFO, gestor de TI, diretor de operações ou RH.",
    termos: [
      "SaaS",
      "ERP",
      "CRM",
      "API",
      "integração",
      "nuvem",
      "cloud",
      "AWS",
      "Azure",
      "on-premise",
      "banco de dados",
      "LGPD",
      "SLA",
      "onboarding",
      "customização",
      "licenciamento",
      "usuários concorrentes",
      "mensalidade",
      "MRR",
      "ARR",
      "implantação",
      "POC",
      "go-live",
    ],
    lacunas: [
      "quantos usuários ou licenças ativas serão necessárias",
      "qual sistema ou ERP legado precisa de integração",
      "quem valida a conformidade de segurança e aprova o contrato",
      "orçamento disponível e prazo de início da implantação",
      "quais plataformas concorrentes foram avaliadas",
    ],
    itens: [
      {
        id: "servicos_usuarios_escopo",
        pergunta: "Quantos usuários ou acessos simultâneos a empresa precisa atender?",
        tipos: { prospeccao: 1, retorno: 2 },
        campo: "numeros",
        sinais: ["usuários", "usuarios", "licenças", "licencas", "acessos", "contas", "volume", "posições", "posicoes"],
      },
      {
        id: "servicos_integracao_sistemas",
        pergunta: "Quais sistemas e bancos de dados atuais precisam ser integrados?",
        tipos: { prospeccao: 1, retorno: 1, fechamento: 2 },
        campo: "concorrentes",
        sinais: ["sistema atual", "erp", "crm", "integração", "integracao", "api", "legado", "migração", "migracao"],
      },
      {
        id: "servicos_prazo_implantacao",
        pergunta: "Qual a data prevista para início do projeto e go-live em produção?",
        tipos: { prospeccao: 2, retorno: 1, fechamento: 1 },
        campo: "data_iso",
        sinais: ["prazo", "data", "go-live", "golive", "implantação", "implantacao", "início", "inicio", "virada"],
      },
      {
        id: "servicos_decisor_compliance",
        pergunta: "Quem valida segurança da informação (TI/LGPD) e aprova o orçamento?",
        tipos: { prospeccao: 1, retorno: 2, fechamento: 1 },
        campo: "cargo",
        sinais: ["ti", "segurança", "seguranca", "infosec", "lgpd", "jurídico", "juridico", "cfo", "financeiro", "cto", "cio"],
      },
      {
        id: "servicos_sla_suporte",
        pergunta: "Ficou alinhado o nível de SLA de atendimento e treinamento da equipe?",
        tipos: { fechamento: 1, posvenda: 1 },
        sinais: ["sla", "suporte", "chamado", "atendimento", "treinamento", "onboarding", "garantia", "manutenção", "manutencao"],
      },
    ],
  },
};

export function verticalValida(id: unknown): string {
  const s = String(id ?? "").trim().toLowerCase();
  return Object.hasOwn(VERTICAIS, s) ? s : VERTICAL_PADRAO;
}

export function obterVertical(id: unknown): Vertical {
  return VERTICAIS[verticalValida(id)] as Vertical;
}

/**
 * Lista para o seletor da interface.
 * Não devolve roteiro: quem monta o roteiro é `montarRoteiro(ramo, tipo)`, porque
 * o que se pergunta depende também do tipo da visita. Duas fontes de verdade para
 * "o que perguntar" divergiriam na primeira mudança.
 */
export function listarVerticais(): { id: string; rotulo: string; curto: string }[] {
  return Object.values(VERTICAIS).map((v) => ({ id: v.id, rotulo: v.rotulo, curto: v.curto }));
}
