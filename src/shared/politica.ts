/**
 * Fatos da política de privacidade em um lugar só.
 *
 * Regra desta tela: só entra aqui o que é verdade no código de hoje. Se um
 * item deixar de ser verdade, ele sai daqui antes de sair do produto.
 *
 * ENCARREGADO e CONTROLADOR atualizados em 2026-09-16 (CNPJ: ZM LABS TECNOLOGIA LTDA).
 */

export const POLITICA_VERSAO = "1.2";
export const POLITICA_ATUALIZADA_EM = "16 de setembro de 2026";

export const CONTROLADOR = {
  nome: "ZM LABS TECNOLOGIA LTDA",
  cnpj: "69.033.383/0001-09",
  natureza: "Sociedade Empresária Limitada",
  endereco:
    "R. Sanito Rocha, nº 225, APT 1005 ANDAR 10 COND HANNOVER ED — Cristo Rei, Curitiba/PR, 80.050-380",
  contato: "contato@doniq.com.br",
  descricao:
    "ZM LABS TECNOLOGIA LTDA (CNPJ 69.033.383/0001-09), Sociedade Empresária Limitada, com sede na R. Sanito Rocha, nº 225, APT 1005 ANDAR 10 COND HANNOVER ED, Cristo Rei, Curitiba/PR (CEP 80.050-380), opera o produto Doniq, aplicativo de campo para registro de relatos de visita, e figura como controladora dos dados pessoais tratados por este produto. Os pedidos de titulares previstos na LGPD são atendidos pelo canal do encarregado indicado nesta política; demais assuntos podem ser encaminhados para contato@doniq.com.br.",
};

export const ENCARREGADO = {
  email: "oi@doniq.com.br",
  observacao: "Canal de contato para pedidos de acesso, correção, exclusão e portabilidade.",
};

export const PRAZOS = {
  respostaPedido: "15 dias corridos",
  exclusaoConta: "30 dias",
  sessao: "180 dias",
};

/** O que o produto guarda, onde, e por quanto tempo. */
export const DADOS: { titulo: string; onde: string; quanto: string }[] = [
  {
    titulo: "Áudio da visita",
    onde:
      "Fica no seu aparelho (armazenamento local do navegador ou do app). Vai ao servidor e aos " +
      "subprocessadores de IA apenas durante a transcrição; o doniq não o grava em disco nem no banco de dados.",
    quanto: "Apagado do aparelho quando a transcrição é concluída.",
  },
  {
    titulo: "Transcrição e relatório da visita",
    onde:
      "Banco de dados da aplicação, isolado por conta: cada consulta filtra pelo seu usuário, " +
      "sem tela de acesso cruzado entre clientes.",
    quanto: "Enquanto a conta existir. Você apaga qualquer relato quando quiser, e ele sai do banco na hora.",
  },
  {
    titulo: "Dados do contato visitado",
    onde:
      "Nome, cargo e telefone que você citou na gravação, dentro do relatório. Campo que você não " +
      "falou fica vazio: o app não completa contato com dado de fora.",
    quanto: "O mesmo prazo do relato a que pertencem.",
  },
  {
    titulo: "Credencial do seu CRM",
    onde: "Cifrada em repouso com AES-256-GCM. O token nunca volta para a tela — só os quatro últimos caracteres.",
    quanto: "Até você desconectar a integração.",
  },
  {
    titulo: "Conta e sessão",
    onde:
      "E-mail, nome e ramo de atuação. Não há senha guardada: o acesso é por link de e-mail ou " +
      "login com Google, e o token de sessão fica no banco em hash.",
    quanto: `Sessão expira em ${PRAZOS.sessao}.`,
  },
  {
    titulo: "Métricas técnicas e falhas",
    onde:
      "O serviço de métricas recebe a rota generalizada visitada e dados técnicos de rede e dispositivo. " +
      "Quando o monitoramento de erros está habilitado, recebe a falha e a pilha técnica com URL sem parâmetros. " +
      "Áudio, transcrição, cookies, cabeçalhos e corpos de requisição são excluídos dessa telemetria.",
    quanto:
      "Pelo prazo operacional da conta em cada provedor. O doniq não mantém uma cópia adicional dessas métricas.",
  },
];

/** Terceiros que tocam no dado. Transparência exigida pelo art. 9º da LGPD. */
export const SUBPROCESSADORES: { nome: string; papel: string }[] = [
  {
    nome: "Vercel AI Gateway",
    papel:
      "Intermedeia e direciona as chamadas aos modelos de IA. O doniq exige rotas que não usem " +
      "o conteúdo enviado para treinamento; nas chamadas de texto, também exige retenção zero.",
  },
  {
    nome: "OpenAI, Google, Anthropic e Groq",
    papel:
      "Podem receber o áudio para transcrever ou o texto para corrigir e montar o relatório, conforme " +
      "a disponibilidade e a ordem de fallback. O uso para treinamento é proibido. Os modelos de texto " +
      "usam retenção zero; os transcritores atuais ainda não oferecem essa garantia pelo gateway.",
  },
  {
    nome: "Hospedagem da aplicação e do banco",
    papel: "Roda o servidor e guarda os relatos, com acesso restrito por credencial.",
  },
  {
    nome: "Runable e OneDollarStats",
    papel:
      "Medem uso técnico por rota generalizada. O serviço deriva visitantes e sessões de um hash de IP, " +
      "navegador e chave diária; não recebe áudio nem transcrição.",
  },
  {
    nome: "Sentry (quando configurado)",
    papel:
      "Recebe erros e pilhas técnicas para diagnóstico. A integração desativa dados de usuário, cookies, " +
      "cabeçalhos, parâmetros de URL, corpos de requisição, conteúdo de IA e variáveis locais.",
  },
  {
    nome: "CRM que você conectar (Agendor, RD Station CRM, Ollow)",
    papel: "Recebe os campos do relatório que você mandar sincronizar. Sem integração ativa, nada sai do doniq.",
  },
];

/** Base legal por finalidade — LGPD art. 7º. */
export const BASES_LEGAIS: { finalidade: string; base: string }[] = [
  {
    finalidade: "Transcrever a visita e montar o relatório",
    base: "Execução de contrato com você, o assinante (art. 7º, V).",
  },
  {
    finalidade: "Guardar nome, cargo e telefone do contato visitado",
    base:
      "Legítimo interesse do seu negócio no registro da relação comercial (art. 7º, IX). " +
      "Nessa parte você é o controlador dos dados do contato e o doniq é o operador.",
  },
  {
    finalidade: "Enviar o relatório para o CRM que você conectou",
    base: "Execução de contrato, a seu comando (art. 7º, V).",
  },
  {
    finalidade: "Manter registro de acesso à aplicação",
    base: "Cumprimento de obrigação legal — Marco Civil da Internet (art. 7º, II).",
  },
];

/** O que o produto não faz. Vale tanto quanto a lista do que faz. */
export const NAO_FAZEMOS = [
  "Não vendemos nem cedemos dados a terceiros.",
  "Não usamos suas visitas para treinar modelo de IA.",
  "Não gravamos o áudio bruto no servidor.",
  "Não preenchemos campo com informação que não foi dita na gravação.",
  "Não damos ao gestor acesso a relato de outra conta.",
];

/** Direitos do titular, LGPD art. 18. */
export const DIREITOS: { direito: string; como: string }[] = [
  { direito: "Confirmação e acesso", como: "Tudo o que é seu aparece no app; o botão de exportar baixa em JSON." },
  { direito: "Correção", como: "Qualquer campo do relatório é editável na tela, e a correção sobrepõe o que a IA extraiu." },
  { direito: "Eliminação", como: "Apagar um relato é imediato. Apagar a conta inteira: peça pelo e-mail do encarregado." },
  { direito: "Portabilidade", como: "Exportação em JSON, formato aberto, com todos os relatos e integrações." },
  { direito: "Informação sobre compartilhamento", como: "A lista de subprocessadores desta página, sempre atual." },
  { direito: "Revisão de decisão automatizada", como: "Nenhuma decisão é tomada pelo app: o relatório é rascunho, quem decide é você." },
];
