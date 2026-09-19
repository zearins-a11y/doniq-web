/**
 * Landing pages por ramo.
 *
 * Produto continua horizontal; estas páginas só mudam a porta de entrada e o
 * vocabulário. Nada aqui altera schema, prompt ou regra de negócio.
 */

export type RamoLanding = {
  id: "opme" | "agro" | "imoveis" | "consorcio" | "seguros";
  /** Rótulo curto do menu — o nav mostra todos os ramos que têm página. */
  menu: string;
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  rotaCadastro: string;
  problema: string[];
  provaProduto: { titulo: string; texto: string }[];
  roteiro: string[];
  objecoes: { pergunta: string; resposta: string }[];
  termos: string[];
  status: string;
  /** Prévia do relatório mostrada no hero. Exemplo de vitrine, não dado real. */
  ficha: { empresa: string; proximaAcao: string; faltouPerguntar: string };
};

export const LANDINGS_RAMOS: Record<RamoLanding["id"], RamoLanding> = {
  opme: {
    id: "opme",
    menu: "Saúde",
    eyebrow: "doniq para OPME",
    titulo: "A visita hospitalar vira relatório antes do próximo corredor.",
    subtitulo:
      "Grave depois da conversa com cirurgião, CME, suprimentos ou distribuidor. O doniq transforma o áudio em resumo, pendências, próxima ação e campos a revisar — sem inventar o que não foi dito.",
    cta: "Testar em uma visita de OPME",
    rotaCadastro: "/?ramo=opme",
    status: "ramo pronto no app",
    problema: [
      "O vendedor sai do hospital com três nomes, duas objeções e um detalhe de consignado que some até chegar no carro.",
      "CRM tradicional pede tela, campo e disciplina justamente na hora em que o representante está sem mesa e sem tempo.",
      "Em OPME, uma palavra errada muda tudo: marca padronizada, glosa, consignado, comissão e prazo de pagamento.",
    ],
    provaProduto: [
      {
        titulo: "Vocabulário do ramo",
        texto:
          "O glossário de transcrição já inclui OPME, CME, consignado, registro ANVISA, SIMPRO, Brasíndice, caixa de instrumental e termos cirúrgicos comuns.",
      },
      {
        titulo: "Portão anti-alucinação",
        texto:
          "Empresa, contato e cargo só entram se estiverem ancorados na gravação. Se não foi dito, o campo fica vazio e vai para revisão.",
      },
      {
        titulo: "Checklist antes da visita",
        texto:
          "O app lembra perguntas que costumam faltar: volume de cirurgias, comissão de padronização, consignado em posse, prazo de pagamento e marca concorrente.",
      },
    ],
    roteiro: [
      "Grave um áudio curto depois da visita.",
      "Revise o relatório: empresa, contato, objeção, próxima ação e data.",
      "Envie para o CRM quando fizer sentido — sem copiar e colar.",
    ],
    objecoes: [
      {
        pergunta: "O áudio fica guardado?",
        resposta:
          "Não no servidor. O áudio bruto fica no aparelho e só passa pelo servidor durante a transcrição. O que fica salvo é texto e relatório.",
      },
      {
        pergunta: "Isso substitui o CRM?",
        resposta:
          "Não. O doniq é a captura de campo: transforma a fala do vendedor em dados para o CRM continuar sendo o sistema oficial.",
      },
      {
        pergunta: "Serve só para hospital?",
        resposta:
          "Não. O produto é para vendedor externo B2B. Esta página só usa a linguagem de OPME para aquisição.",
      },
    ],
    termos: ["OPME", "CME", "consignado", "ANVISA", "glosa", "SIMPRO", "Brasíndice"],
    ficha: {
      empresa: "Hospital Santa Clara",
      proximaAcao: "Enviar cotação do consignado até quinta",
      faltouPerguntar: "Qual o prazo de pagamento praticado hoje?",
    },
  },
  agro: {
    id: "agro",
    menu: "Agro",
    eyebrow: "doniq para agro",
    titulo: "A visita na fazenda vira próximo passo claro.",
    subtitulo:
      "Para RTV, revenda e insumos: grave a conversa depois da visita e saia com cultura, hectares, janela de plantio, forma de pagamento e pendências organizadas.",
    cta: "Validar em uma visita agro",
    rotaCadastro: "/?ramo=agro",
    status: "ramo em validação",
    problema: [
      "A conversa acontece no pátio, na lavoura ou na caminhonete — não na frente de um CRM.",
      "Detalhe técnico vira venda: talhão, pressão de praga, janela, barter, recomendação e quem assina o receituário.",
      "Quando o follow-up atrasa, a revenda concorrente chega antes.",
    ],
    provaProduto: [
      {
        titulo: "Glossário de campo",
        texto:
          "O pacote agro reconhece termos como RTV, talhão, safrinha, barter, receituário agronômico, análise de solo, MAPA e defensivos.",
      },
      {
        titulo: "Perguntas que faltam",
        texto:
          "O relatório aponta lacunas típicas: hectares, cultura, janela de plantio, forma de pagamento e revenda atual.",
      },
      {
        titulo: "Mesmo motor B2B",
        texto:
          "Não é outro produto. É a mesma captura por voz, com vocabulário e checklist adaptados à rotina do vendedor agro.",
      },
    ],
    roteiro: [
      "Fale o resumo da visita ao sair da fazenda ou revenda.",
      "Confira os campos extraídos e as perguntas que faltaram.",
      "Use a próxima ação para não perder a janela da safra.",
    ],
    objecoes: [
      {
        pergunta: "Funciona sem internet no campo?",
        resposta:
          "A gravação fica enfileirada no aparelho. Quando a conexão volta, o app envia e monta o relatório.",
      },
      {
        pergunta: "O agro já está fechado?",
        resposta:
          "Não. O vocabulário do agro já está no app para quem quiser testar antes.",
      },
      {
        pergunta: "Dá para usar com qualquer CRM?",
        resposta:
          "Hoje há conectores iniciais. O relatório também pode ser revisado no app enquanto novos CRMs entram na fila.",
      },
    ],
    termos: ["RTV", "talhão", "safrinha", "barter", "receituário", "MAPA", "hectares"],
    ficha: {
      empresa: "Fazenda Boa Vista",
      proximaAcao: "Mandar proposta para a safrinha",
      faltouPerguntar: "Quantos hectares entram no barter desta safra?",
    },
  },
  imoveis: {
    id: "imoveis",
    menu: "Imóveis",
    eyebrow: "doniq para corretor de imóveis",
    titulo: "Saiu do plantão com quatro atendimentos. Sai com quatro relatórios.",
    subtitulo:
      "Depois da visita, do plantão no estande ou da captação, fale o que aconteceu. O doniq devolve perfil do imóvel, crédito, entrada, prazo de mudança e a próxima ação com data — sem inventar o que o cliente não disse.",
    cta: "Testar em um plantão",
    rotaCadastro: "/?ramo=imoveis",
    status: "ramo pronto no app",
    problema: [
      "Em dia de plantão são cinco, seis atendimentos. À noite, na hora de registrar, o corretor lembra do primeiro e do último — o meio virou 'cliente do 2 quartos'.",
      "O que decide a venda é detalhe de número: crédito aprovado, quanto tem de FGTS, se precisa vender o atual antes, para quando quer a chave.",
      "Quem responde primeiro leva. O follow-up que fica para amanhã encontra o cliente já visitando com outro corretor.",
    ],
    provaProduto: [
      {
        titulo: "Vocabulário de cartório e crédito",
        texto:
          "O glossário de transcrição já entende ITBI, matrícula, averbação, habite-se, alienação fiduciária, SBPE, FGTS, INCC, permuta, distrato e carta de crédito. Termo escrito certo é campo aproveitável.",
      },
      {
        titulo: "As perguntas que fecham a venda",
        texto:
          "O checklist da visita cobra crédito aprovado e em qual banco, entrada contando FGTS, imóvel para permuta, prazo de mudança e quem mais decide junto.",
      },
      {
        titulo: "Portão anti-alucinação",
        texto:
          "Valor, banco e prazo só entram no relatório se estiverem na gravação. O que não foi dito fica em branco e vai para revisão — proposta não se monta em cima de chute.",
      },
    ],
    roteiro: [
      "Grave um áudio curto ao sair do imóvel ou entre dois atendimentos do plantão.",
      "Revise: perfil, crédito, entrada, prazo e o que faltou perguntar.",
      "Use a próxima ação com data para responder antes do concorrente.",
    ],
    objecoes: [
      {
        pergunta: "Já uso o CRM da imobiliária. Isso é mais um sistema?",
        resposta:
          "Não. O doniq é a captura de campo: você fala, ele organiza. Kenlo, Jetimob, Vista, CV CRM e afins continuam sendo o sistema oficial da imobiliária — o relatório existe para alimentar isso sem digitar no celular.",
      },
      {
        pergunta: "Preciso gravar o cliente?",
        resposta:
          "Não. Você grava a sua própria fala depois do atendimento, contando o que aconteceu. Não é gravação de conversa e nada é publicado — o áudio fica no aparelho e só passa pelo servidor durante a transcrição.",
      },
      {
        pergunta: "Sou corretor autônomo, não tenho equipe. Serve?",
        resposta:
          "Serve. O plano mínimo aceita um vendedor só, e o painel do gestor simplesmente não é usado. Se depois você virar equipe ou imobiliária, a mesma conta cresce.",
      },
      {
        pergunta: "Meu gerente vai ouvir o que eu falo do cliente?",
        resposta:
          "Não. O gestor vê o relatório, nunca o áudio. Isso é regra do produto, não configuração que alguém muda depois.",
      },
    ],
    termos: ["ITBI", "matrícula", "habite-se", "SBPE", "FGTS", "INCC", "permuta", "distrato", "carta de crédito"],
    ficha: {
      empresa: "Residencial Alto da Serra — unidade town 42",
      proximaAcao: "Enviar simulação SBPE com R$ 90 mil de FGTS até sexta",
      faltouPerguntar: "O crédito já está aprovado em qual banco e por quanto?",
    },
  },
  consorcio: {
    id: "consorcio",
    menu: "Consórcios",
    eyebrow: "doniq para consórcios",
    titulo: "A visita do consórcio vira parcela, lance e prazo no papel.",
    subtitulo:
      "Para corretor e representante de administradora: grave depois do atendimento e saia com objetivo do bem, parcela que cabe no mês, reserva para lance, prazo e a próxima ação — em vocabulário de consórcio, não em resumo genérico.",
    cta: "Testar em um atendimento",
    rotaCadastro: "/?ramo=consorcio",
    status: "ramo pronto no app",
    problema: [
      "A venda de consórcio se ganha em número falado: valor de carta, parcela, taxa de administração, fundo de reserva, estratégia de lance. Anotado de memória, três horas depois, tudo isso vira 'ele quer uns 300 mil'.",
      "O ciclo é longo e a decisão volta semanas depois. Sem registro do que foi combinado, o retorno começa do zero e o cliente percebe.",
      "É mercado regulado pela Lei 11.795 e fiscalizado pelo Banco Central: o que foi explicado ao consorciado importa, e ninguém quer depender de lembrança.",
    ],
    provaProduto: [
      {
        titulo: "Glossário do sistema de consórcios",
        texto:
          "A transcrição já reconhece carta de crédito, cota, grupo, assembleia, contemplação, lance livre, lance embutido, fundo comum, fundo de reserva, taxa de administração, valor categoria e transferência de cota.",
      },
      {
        titulo: "Perguntas que evitam desistência",
        texto:
          "O checklist cobra parcela que cabe no mês sem aperto, se tem reserva para lance ou vai esperar sorteio, em quanto tempo precisa do bem e se já tem cota em outra administradora.",
      },
      {
        titulo: "Registro do que foi explicado",
        texto:
          "O relatório guarda em texto o que o vendedor diz ter combinado — prazo, parcela, condição de lance. Serve de memória de atendimento para o retorno e para a conferência interna.",
      },
    ],
    roteiro: [
      "Grave o resumo assim que o atendimento acabar, ainda no carro.",
      "Confira carta, parcela, lance e prazo, e veja o que faltou perguntar.",
      "Volte no retorno com o combinado na mão, não com a memória da semana passada.",
    ],
    objecoes: [
      {
        pergunta: "Isso é peça de venda para mandar ao cliente?",
        resposta:
          "Não. O relatório é interno, do vendedor e do gestor. Ele não simula grupo, não promete contemplação e não substitui o material oficial da administradora, que é o que vai ao consorciado.",
      },
      {
        pergunta: "Grande parte do meu atendimento é por telefone e WhatsApp. Ajuda?",
        resposta:
          "Ajuda igual. O que o doniq captura é a sua fala depois do atendimento, presencial ou não. Quem faz muitos contatos por dia é justamente quem mais perde detalhe.",
      },
      {
        pergunta: "A administradora exige registro no sistema dela. Vou digitar duas vezes?",
        resposta:
          "A ideia é o contrário: você fala uma vez e sai com o texto pronto para colar ou enviar. Conectores de CRM estão na fila; até lá, o relatório revisado é copiável em um toque.",
      },
      {
        pergunta: "E a privacidade do que eu falo?",
        resposta:
          "O áudio bruto fica no aparelho e só passa pelo servidor durante a transcrição. O que fica salvo é texto e relatório, e o gestor vê o relatório — nunca a gravação.",
      },
    ],
    termos: [
      "carta de crédito",
      "lance embutido",
      "valor categoria",
      "fundo de reserva",
      "taxa de administração",
      "assembleia",
      "contemplação",
      "transferência de cota",
    ],
    ficha: {
      empresa: "Transportes Vale Verde — frota",
      proximaAcao: "Levar simulação de carta de R$ 420 mil com lance embutido na terça",
      faltouPerguntar: "Que parcela cabe no mês sem apertar o caixa da frota?",
    },
  },
  seguros: {
    id: "seguros",
    menu: "Seguros",
    eyebrow: "doniq para seguros",
    titulo: "A renovação do plano vira próximo passo, não esquecimento.",
    subtitulo:
      "Fale a conversa com RH, financeiro ou corretor parceiro depois do atendimento. Vidas, vigência, sinistralidade e próxima ação ficam registrados.",
    cta: "Testar em uma conversa de renovação",
    rotaCadastro: "/?ramo=seguros",
    status: "ramo pronto no app",
    problema: [
      "A renovação de plano corporativo se perde entre o ano que passou e o e-mail de cobrança do concorrente.",
      "Detalhes que mudam o preço — sinistralidade, rede credenciada, faixa etária — somem entre uma reunião e outra.",
      "Se o follow-up atrasa, o corretor que ligou primeiro ganha a conta.",
    ],
    provaProduto: [
      {
        titulo: "Vocabulário do setor",
        texto:
          "O glossário de transcrição já entende apólice, endosso, sinistralidade, coparticipação, vidas, vigência, franquia, ANS, SUSEP e rede credenciada.",
      },
      {
        titulo: "Checklist de renovação",
        texto:
          "O relatório cobra vidas, vigência da apólice atual, sinistralidade dos últimos 12 meses e quem assina a decisão — as perguntas que o RH esquece de levar.",
      },
      {
        titulo: "Registro do que foi explicado",
        texto:
          "O relatório guarda em texto o que o vendedor combinou com o cliente — prazo, condição de endosso, cobertura. Serve de memória para o retorno e para a conferência interna.",
      },
    ],
    roteiro: [
      "Fale o resumo da conversa com RH ou financeiro ao sair da reunião.",
      "Confira vigência, vidas e sinistralidade extraídos, e veja o que faltou perguntar.",
      "Use a próxima ação para retomar antes do concorrente.",
    ],
    objecoes: [
      {
        pergunta: "Preciso gravar a conversa com o RH?",
        resposta:
          "Não. Você grava a sua própria fala depois do atendimento, contando o que aconteceu. Não é gravação de conversa e nada é publicado — o áudio fica no aparelho e só passa pelo servidor durante a transcrição.",
      },
      {
        pergunta: "Já uso o sistema da corretora. Isso é mais um sistema?",
        resposta:
          "Não. O doniq é a captura de campo: você fala, ele organiza. O relatório existe para alimentar o sistema da corretora sem que ninguém precise digitar no celular.",
      },
      {
        pergunta: "A seguradora exige registro no sistema dela. Vou digitar duas vezes?",
        resposta:
          "A ideia é o contrário: você fala uma vez e sai com o texto pronto para colar. Conectores de CRM estão na fila; até lá, o relatório revisado é copiável em um toque.",
      },
    ],
    termos: [
      "apólice",
      "sinistralidade",
      "coparticipação",
      "vidas",
      "vigência",
      "franquia",
      "ANS",
      "SUSEP",
      "rede credenciada",
    ],
    ficha: {
      empresa: "Grupo Vertex RH",
      proximaAcao: "Retomar proposta de renovação 60 dias antes da vigência",
      faltouPerguntar: "Quantas vidas e qual a sinistralidade do último ano?",
    },
  },
};

export function obterLandingRamo(id: unknown): RamoLanding | null {
  const s = String(id ?? "").trim().toLowerCase();
  return Object.hasOwn(LANDINGS_RAMOS, s) ? (LANDINGS_RAMOS[s as RamoLanding["id"]] as RamoLanding) : null;
}
