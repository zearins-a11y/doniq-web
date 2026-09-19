/**
 * Copy da primeira tela do app — a landing que roda dentro do celular.
 *
 * Por que mora em `shared/` e não dentro do pacote móvel: é a mesma promessa que
 * a web faz. Promessa escrita duas vezes é promessa que desanda em duas versões
 * diferentes na primeira correção de preço. Aqui o celular importa por
 * `@template/web/landing-app`, do mesmo jeito que já importa os tokens de cor.
 *
 * REGRA: nada aqui pode prometer o que o app não faz hoje. Esta é a peça de
 * aquisição mais próxima do produto — se ela exagerar, o cliente descobre em
 * dois minutos, não em dois meses.
 *
 * Horizontal no código, vertical na entrada: o ramo troca vocabulário, exemplo e
 * pergunta esquecida. Nunca troca regra de negócio.
 */

import { ANUAL, DIAS_TESTE, MENSAL } from "./planos";

/** Ids de ramo aceitos na landing. São os mesmos de `api/relato/verticais.ts`. */
export const RAMOS_LANDING = ["geral", "opme", "imoveis", "consorcio", "agro", "seguros"] as const;

export type RamoApp = (typeof RAMOS_LANDING)[number];

export type CopyLanding = {
  id: RamoApp;
  /** Rótulo curto do seletor — cabe num chip de celular. */
  chip: string;
  /** Manchete. Uma frase, no tempo do vendedor, sem "solução" e sem "plataforma". */
  titulo: string;
  /** O que o app faz, em uma frase. */
  sub: string;
  /** A dor concreta do ramo. Uma frase que a pessoa reconhece como o dia dela. */
  dor: string;
  /** Exemplo de relatório mostrado na tela. Vitrine, não dado real. */
  exemplo: { empresa: string; objecao: string; proximaAcao: string; faltou: string };
  /** Palavras do ramo que a transcrição já reconhece. Prova concreta. */
  termos: string[];
};

const COPY: Record<RamoApp, CopyLanding> = {
  geral: {
    id: "geral",
    chip: "Vendas B2B",
    titulo: "Conte a visita falando. O relatório sai pronto.",
    sub: "Você fala um minuto ao voltar para o carro. O doniq escreve o resumo, a objeção, a próxima ação e o follow-up.",
    dor: "A visita boa é esquecida no trânsito. À noite, cansado, ninguém preenche CRM.",
    exemplo: {
      empresa: "Metalúrgica Bandeirantes",
      objecao: "Preço acima do concorrente",
      proximaAcao: "Enviar proposta revisada até quinta",
      faltou: "Qual o prazo de pagamento praticado hoje?",
    },
    termos: ["proposta", "prazo de pagamento", "quem assina", "concorrente"],
  },
  opme: {
    id: "opme",
    chip: "Saúde",
    titulo: "A visita no hospital vira relatório antes do próximo corredor.",
    sub: "Fale depois da conversa com cirurgião, CME ou suprimentos. Sai resumo, objeção, próxima ação e o que faltou perguntar.",
    dor: "Você sai com três nomes, duas objeções e um detalhe de consignado que some até chegar no carro.",
    exemplo: {
      empresa: "Hospital Santa Clara",
      objecao: "Marca já padronizada pela comissão",
      proximaAcao: "Enviar cotação do consignado até quinta",
      faltou: "Quantas cirurgias por mês nessa especialidade?",
    },
    termos: ["OPME", "CME", "consignado", "ANVISA", "glosa", "padronização"],
  },
  imoveis: {
    id: "imoveis",
    chip: "Imóveis",
    titulo: "Saiu do plantão com quatro atendimentos. Sai com quatro relatórios.",
    sub: "Fale ao sair do imóvel ou entre dois atendimentos. Perfil, crédito, entrada e prazo de mudança saem escritos.",
    dor: "À noite você lembra do primeiro cliente e do último. O do meio virou \"o do dois quartos\".",
    exemplo: {
      empresa: "Residencial Alto da Serra",
      objecao: "Quer vender o apartamento atual antes",
      proximaAcao: "Enviar simulação SBPE com FGTS até sexta",
      faltou: "O crédito já está aprovado em qual banco?",
    },
    termos: ["ITBI", "matrícula", "habite-se", "SBPE", "FGTS", "permuta"],
  },
  consorcio: {
    id: "consorcio",
    chip: "Consórcios",
    titulo: "O atendimento de consórcio vira parcela, lance e prazo no papel.",
    sub: "Fale depois da conversa. Valor de carta, parcela que cabe, estratégia de lance e prazo ficam registrados.",
    dor: "Três horas depois, o número exato que ele falou virou \"uns 300 mil\".",
    exemplo: {
      empresa: "Transportes Vale Verde",
      objecao: "Quer garantia de contemplação rápida",
      proximaAcao: "Levar simulação com lance embutido na terça",
      faltou: "Que parcela cabe no mês sem apertar o caixa?",
    },
    termos: ["carta de crédito", "lance embutido", "valor categoria", "assembleia", "fundo de reserva"],
  },
  agro: {
    id: "agro",
    chip: "Agro",
    titulo: "A visita na fazenda vira próximo passo claro.",
    sub: "RTV e revenda: fale ao sair do pátio. Cultura, área, janela e pagamento ficam organizados sozinhos.",
    dor: "A conversa acontece na lavoura, não na frente de um computador — e a revenda concorrente liga primeiro.",
    exemplo: {
      empresa: "Fazenda Três Lagoas",
      objecao: "Quer esperar a análise de solo",
      proximaAcao: "Levar recomendação antes da janela de plantio",
      faltou: "Quantos hectares e qual cultura nesta safra?",
    },
    termos: ["RTV", "talhão", "barter", "safrinha", "receituário", "defensivo"],
  },
  seguros: {
    id: "seguros",
    chip: "Seguros",
    titulo: "A reunião com o RH vira relatório e follow-up no mesmo dia.",
    sub: "Fale a conversa com RH, financeiro ou corretor parceiro. Vidas, vigência e pendências saem escritas.",
    dor: "Renovação se perde por follow-up atrasado, não por preço alto.",
    exemplo: {
      empresa: "Grupo Vertex RH",
      objecao: "Contrato atual vence só em dezembro",
      proximaAcao: "Retomar 60 dias antes da vigência",
      faltou: "Quantas vidas e qual a sinistralidade do último ano?",
    },
    termos: ["vidas", "vigência", "sinistralidade", "coparticipação", "rede credenciada"],
  },
};

/** Ramo pedido, ou `geral` quando vier lixo, `undefined` ou id que não existe. */
export function copyDaLanding(id?: unknown): CopyLanding {
  const chave = String(id ?? "") as RamoApp;
  return COPY[chave] ?? COPY.geral;
}

/** Todos os ramos, com `geral` primeiro — a ordem dos chips na tela. */
export function ramosDaLanding(): CopyLanding[] {
  return RAMOS_LANDING.map((id) => COPY[id]);
}

/**
 * As três etapas do produto. Curtas de propósito: é a primeira tela, não o
 * manual.
 */
export const ETAPAS_LANDING = [
  { titulo: "Você fala", texto: "Um minuto de áudio, do jeito que sair. Sem formulário na rua." },
  { titulo: "Vira relatório", texto: "Empresa, contato, objeção, próxima ação e o que faltou perguntar." },
  { titulo: "Vira funil", texto: "Histórico, agenda do próximo passo e follow-up pronto para enviar." },
] as const;

/**
 * O que a landing pode dizer sobre privacidade — cada linha é uma regra que o
 * código já cumpre hoje. Não acrescente linha aqui antes de a regra existir.
 */
export const PRIVACIDADE_LANDING = [
  "O áudio não fica guardado no servidor: ele passa pela transcrição e o que sobra é texto.",
  "Campo que você não falou fica vazio. O app não inventa nome, empresa nem número.",
  "Se você tem gestor, ele lê o relatório — nunca a sua gravação.",
] as const;

/**
 * Qual ramo o onboarding deve mostrar selecionado.
 *
 * Regra: "geral" vindo do servidor não é escolha, é ausência de escolha — todo
 * usuário nasce assim. Então, enquanto o cadastro não terminou (sem `produto`),
 * quem manda é o ramo que a pessoa tocou na landing. Depois de terminado, quem
 * manda é sempre o servidor, ou o vendedor nunca conseguiria trocar de ramo.
 */
export function ramoInicial(args: {
  produto?: string | null;
  verticalDoServidor?: string | null;
  daLanding?: string | null;
}): string {
  const doServidor = args.verticalDoServidor || "";
  if (args.produto) return doServidor || "geral";
  return args.daLanding || doServidor || "geral";
}

/** Linha de preço da landing. Nasce de `planos.ts`, nunca escrita à mão. */
export function linhaDePreco(): string {
  return `R$ ${MENSAL} por vendedor/mês — R$ ${ANUAL} no anual. ${DIAS_TESTE} dias de teste, sem cartão.`;
}

/** Texto do botão principal. O teste é o produto inteiro, não uma amostra. */
export function chamadaDoBotao(): string {
  return `Testar ${DIAS_TESTE} dias — sem cartão`;
}
