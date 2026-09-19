/**
 * Tomada para o WhatsApp oficial — instalada, não ligada.
 *
 * Decisão desta rodada (José, 11/08): nenhuma mensagem nova sai automaticamente
 * agora. Este arquivo existe para que o dia em que a API oficial entrar seja um
 * dia de configurar variável de ambiente, não de reescrever produto.
 *
 * ## Por que não está ligado
 *
 * A API oficial da Meta (Cloud API) cobra por mensagem no Brasil e muda o modelo
 * de cobrança em 01/10/2026 (de conversa para mensagem). Exige número dedicado,
 * conta comercial verificada e template aprovado antes de qualquer envio
 * proativo — de 1 a 5 dias úteis por template. As alternativas não oficiais
 * (Z-API e parecidas, R$ 99–799/mês) automatizam o WhatsApp Web por engenharia
 * reversa: derrubam número e quebram os termos. Produto que vende privacidade
 * como argumento não pode ter isso por baixo.
 *
 * Enquanto isso, o caminho que já funciona e custa zero continua sendo o link
 * `wa.me` — o vendedor toca e o WhatsApp abre com o texto pronto. Um toque.
 *
 * ## O contrato, igual ao de `services/email.ts`
 *
 * Sem configuração, `enviarWhatsapp()` NÃO finge: devolve `enviado: false` com o
 * motivo. Nunca lança — mensagem é acessório, e a operação principal (salvar a
 * relatório) não pode falhar porque um provedor está fora do ar. Quem chama mostra o
 * caminho manual quando o automático não saiu.
 *
 * ## Variáveis que ligam isso, quando a hora chegar
 *
 * - `WHATSAPP_TOKEN`         — token permanente do app da Meta
 * - `WHATSAPP_PHONE_ID`      — id do número remetente (phone number id)
 * - `WHATSAPP_VERSAO_API`    — opcional, padrão em `VERSAO_API_PADRAO`
 *
 * Todas moram no único `.env` da raiz. Enquanto não existirem, tudo aqui
 * responde "não configurado" — e é isso que a tela deve dizer ao usuário.
 */

/** Versão da Graph API usada nas URLs. Fica explícita para a atualização ser uma decisão. */
export const VERSAO_API_PADRAO = "v21.0";

export type ResultadoWhatsapp = {
  enviado: boolean;
  /** Motivo em português, para log e para a tela. Vazio quando enviou. */
  motivo: string;
  /** Id da mensagem no provedor, quando houver. Serve para investigar depois. */
  idExterno: string;
};

export function tokenConfigurado(): string {
  return (process.env.WHATSAPP_TOKEN || "").trim();
}

export function remetenteId(): string {
  return (process.env.WHATSAPP_PHONE_ID || "").trim();
}

export function versaoApi(): string {
  return (process.env.WHATSAPP_VERSAO_API || "").trim() || VERSAO_API_PADRAO;
}

/** Hoje isto é `false` em todo ambiente. É o estado correto, não uma pendência esquecida. */
export function provedorConfigurado(): boolean {
  return Boolean(tokenConfigurado() && remetenteId());
}

/**
 * Telefone em E.164 para o Brasil, ou string vazia quando não dá para confiar.
 *
 * Devolver vazio é de propósito. Número incompleto que a gente "conserta"
 * chutando um dígito manda o relatório da visita para um estranho — errar em silêncio
 * aqui é pior do que não enviar. Quem chamar trata o vazio como "sem telefone".
 *
 * Aceita: 11 dígitos (DDD + celular com o 9), 10 dígitos (DDD + fixo), com ou
 * sem o 55 na frente, com ou sem 0 de operadora. Recusa o resto.
 */
export function paraE164Br(telefone: string): string {
  let d = String(telefone || "").replace(/\D/g, "");
  if (!d) return "";

  // 0 de operadora antes do DDD (0 11 9…) e 0800 nunca é WhatsApp.
  if (d.startsWith("0")) {
    if (d.startsWith("0800")) return "";
    d = d.replace(/^0+/, "");
  }

  // 55 também é DDD do Rio Grande do Sul: tirar o "55" de um número de 11
  // dígitos que já era local transformaria (55) 99999-8888 em algo curto e
  // inválido. Só é código de país quando sobra um número local inteiro depois:
  // 12 dígitos (55 + fixo) ou 13 (55 + celular).
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length < 10 || d.length > 11) return "";

  const ddd = d.slice(0, 2);
  if (Number(ddd) < 11) return "";

  return `55${d}`;
}

/**
 * Envio proativo só existe por template aprovado pela Meta. Texto livre fora da
 * janela de 24h é recusado pelo provedor — então o tipo aqui nem permite escrever
 * um. Assim o erro aparece na compilação, não na conta do cliente.
 */
export type Template = {
  /** Nome exato do template aprovado no painel da Meta. */
  nome: string;
  /** Idioma registrado no template. */
  idioma: string;
  /** Valores das variáveis {{1}}, {{2}}… na ordem. */
  variaveis: string[];
};

export type MensagemWhatsapp = {
  /** Telefone do destinatário, do jeito que está no relatório. Normalizado aqui dentro. */
  para: string;
  template: Template;
};

/** Corpo que a Cloud API espera. Puro, para poder ser testado sem rede. */
export function montarCorpo(numeroE164: string, template: Template): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: numeroE164,
    type: "template",
    template: {
      name: template.nome,
      language: { code: template.idioma },
      components: template.variaveis.length
        ? [
            {
              type: "body",
              parameters: template.variaveis.map((v) => ({ type: "text", text: v })),
            },
          ]
        : [],
    },
  };
}

/**
 * Tenta enviar. Nunca lança.
 *
 * Enquanto não houver token e número, o primeiro `if` é o único caminho que roda
 * em produção — e é isso que faz esta tomada ser segura de deixar instalada.
 */
export async function enviarWhatsapp(msg: MensagemWhatsapp): Promise<ResultadoWhatsapp> {
  if (!provedorConfigurado()) {
    return {
      enviado: false,
      motivo: "O envio automático pelo WhatsApp ainda não está ativo. Use o botão de enviar à mão.",
      idExterno: "",
    };
  }

  const numero = paraE164Br(msg.para);
  if (!numero) {
    return {
      enviado: false,
      motivo: "O telefone do relatório está incompleto. Confirme o número antes de enviar.",
      idExterno: "",
    };
  }

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${versaoApi()}/${remetenteId()}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${tokenConfigurado()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(montarCorpo(numero, msg.template)),
        signal: AbortSignal.timeout(15000),
      },
    );
    const dados = (await resposta.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!resposta.ok) {
      return {
        enviado: false,
        motivo: dados.error?.message || `O WhatsApp recusou o envio (HTTP ${resposta.status}).`,
        idExterno: "",
      };
    }
    return { enviado: true, motivo: "", idExterno: dados.messages?.[0]?.id ?? "" };
  } catch {
    return {
      enviado: false,
      motivo: "Não foi possível falar com o WhatsApp agora.",
      idExterno: "",
    };
  }
}

/**
 * Link `wa.me` — o caminho que funciona hoje, com um toque e sem custo.
 *
 * Mora aqui junto do envio automático de propósito: no dia em que o automático
 * ligar, o manual continua sendo o plano B na mesma tela, e os dois usam a mesma
 * regra de telefone. Quando o número não dá para confiar, o link abre o WhatsApp
 * sem destinatário e o vendedor escolhe o contato — a mensagem não se perde.
 */
export function linkWhatsapp(telefone: string, texto: string): string {
  const numero = paraE164Br(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto || "")}`;
}

/**
 * Templates que precisarão de aprovação da Meta antes do primeiro envio.
 *
 * Declarados aqui como intenção, não como coisa pronta: nenhum foi submetido.
 * Escrever o texto agora tem um motivo prático — template de "utilidade" custa
 * uma fração do de "marketing", e o que decide a categoria é a redação. Frase de
 * venda no meio do aviso reclassifica a mensagem e multiplica a conta.
 */
export const TEMPLATES_A_APROVAR = [
  {
    nome: "ficha_da_visita",
    idioma: "pt_BR",
    categoria: "utility" as const,
    /** {{1}} empresa · {{2}} próximo passo · {{3}} prazo */
    corpo:
      "Sua visita em {{1}} foi registrada. Próximo passo: {{2}}, até {{3}}. Abra o doniq para ver o relatório completo.",
  },
  {
    nome: "fechamento_do_dia",
    idioma: "pt_BR",
    categoria: "utility" as const,
    /** {{1}} nº de visitas · {{2}} nº de próximos passos vencendo amanhã */
    corpo:
      "Fechamento do dia: {{1}} visita(s) registrada(s) e {{2}} próximo(s) passo(s) para amanhã. Abra o doniq para ver a lista.",
  },
] as const;
