/**
 * Envio de e-mail.
 *
 * Três estados possíveis, e o serviço nunca mente sobre em qual está:
 *
 *   1. DESLIGADO — sem RESEND_API_KEY ou sem remetente. Não finge que enviou:
 *      devolve `enviado: false` com o motivo, e quem chamou mostra o link
 *      copiável na tela. Convite que depende de e-mail que nunca sai é convite
 *      perdido em silêncio.
 *   2. TESTE — há chave, mas ainda não há domínio verificado. TODO envio é
 *      desviado para EMAIL_TESTE_PARA, com o destinatário real escrito no
 *      assunto e no corpo. Sem essa trava, o primeiro teste manda um convite de
 *      verdade para o e-mail de um vendedor de verdade.
 *   3. LIGADO — chave e remetente do domínio próprio. Envia para quem é.
 *
 * O modo é decidido aqui, no servidor, e devolvido junto com o resultado, para
 * que a tela nunca escreva "enviamos para fulano" quando o e-mail foi desviado.
 *
 * Texto puro, sem HTML, de propósito: vendedor lê no celular entre visitas, e
 * mensagem em texto chega melhor do que peça de marketing.
 */

export const MODOS_EMAIL = ["desligado", "teste", "ligado"] as const;
export type ModoEmail = (typeof MODOS_EMAIL)[number];

export type ResultadoEmail = {
  enviado: boolean;
  /** Motivo em português, para log e para a tela. Vazio quando enviou. */
  motivo: string;
  /** Em qual dos três estados o servidor estava na hora do envio. */
  modo: ModoEmail;
  /** Para onde a mensagem foi de fato. Diferente do destinatário no modo teste. */
  destino: string;
  /** Verdadeiro quando o envio foi desviado para o endereço de teste. */
  desviado: boolean;
};

function limpo(nome: string): string {
  return (process.env[nome] || "").trim();
}

export function remetente(): string {
  return limpo("EMAIL_REMETENTE");
}

/** Endereço que recebe tudo enquanto não há domínio verificado. */
export function enderecoDeTeste(): string {
  return limpo("EMAIL_TESTE_PARA");
}

/** Caixa do encarregado de dados (LGPD). Sem ela, o formulário público some da tela. */
export function enderecoEncarregado(): string {
  return limpo("EMAIL_ENCARREGADO");
}

export function chaveConfigurada(): boolean {
  return Boolean(limpo("RESEND_API_KEY"));
}

/**
 * O estado atual, em uma palavra.
 *
 * Ordem importa: sem chave nada funciona; com chave e endereço de teste, o
 * desvio vence mesmo que exista remetente próprio — quem configurou o desvio
 * está testando, e errar para o lado seguro aqui custa um e-mail a menos, não
 * um convite indevido.
 */
export function modoEmail(): ModoEmail {
  if (!chaveConfigurada() || !remetente()) return "desligado";
  return enderecoDeTeste() ? "teste" : "ligado";
}

export function provedorConfigurado(): boolean {
  return modoEmail() !== "desligado";
}

export type Mensagem = {
  para: string;
  assunto: string;
  texto: string;
  /** Para onde vai a resposta do destinatário. Usado no contato do encarregado. */
  responderPara?: string;
  /** Evita que o provedor processe duas vezes a mesma tentativa de envio. */
  chaveIdempotencia?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailValido(valor: unknown): boolean {
  const v = String(valor ?? "").trim();
  return v.length <= 200 && EMAIL_RE.test(v);
}

/** Assunto no modo teste: quem abrir a caixa precisa ver na hora que é desvio. */
export function assuntoDesviado(assunto: string, destinatarioReal: string): string {
  return `[TESTE → ${destinatarioReal}] ${assunto}`;
}

/** Aviso no topo do corpo, para o caso de alguém encaminhar a mensagem desviada. */
export function avisoDesvio(destinatarioReal: string): string {
  return [
    "— — —",
    `MODO DE TESTE: esta mensagem era para ${destinatarioReal} e foi desviada para você`,
    "porque o domínio de envio ainda não está verificado. O destinatário real não recebeu nada.",
    "— — —",
    "",
  ].join("\n");
}

/**
 * Tenta enviar. Nunca lança: e-mail é acessório, e a operação principal (criar
 * o convite, montar o resumo) não pode falhar porque o provedor caiu.
 */
export async function enviarEmail(msg: Mensagem): Promise<ResultadoEmail> {
  const modo = modoEmail();
  const paraReal = String(msg.para ?? "").trim();

  if (modo === "desligado") {
    return {
      enviado: false,
      motivo: "Nenhum provedor de e-mail configurado neste ambiente.",
      modo,
      destino: "",
      desviado: false,
    };
  }
  if (!emailValido(paraReal)) {
    return { enviado: false, motivo: "Endereço de destino inválido.", modo, destino: "", desviado: false };
  }

  const desviado = modo === "teste";
  const destino = desviado ? enderecoDeTeste() : paraReal;
  if (desviado && !emailValido(destino)) {
    return {
      enviado: false,
      motivo: "O endereço de teste configurado é inválido; nada foi enviado.",
      modo,
      destino: "",
      desviado: true,
    };
  }

  const assunto = desviado ? assuntoDesviado(msg.assunto, paraReal) : msg.assunto;
  const texto = desviado ? avisoDesvio(paraReal) + msg.texto : msg.texto;
  const chaveIdempotencia = String(msg.chaveIdempotencia ?? "").trim().slice(0, 256);

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${limpo("RESEND_API_KEY")}`,
        "content-type": "application/json",
        ...(chaveIdempotencia ? { "idempotency-key": chaveIdempotencia } : {}),
      },
      body: JSON.stringify({
        from: remetente(),
        to: [destino],
        subject: assunto,
        text: texto,
        ...(msg.responderPara ? { reply_to: msg.responderPara } : {}),
      }),
    });
    if (!resposta.ok) {
      return {
        enviado: false,
        motivo: `O provedor recusou o envio (HTTP ${resposta.status}).`,
        modo,
        destino,
        desviado,
      };
    }
    return { enviado: true, motivo: "", modo, destino, desviado };
  } catch {
    return {
      enviado: false,
      motivo: "Não foi possível falar com o provedor de e-mail.",
      modo,
      destino,
      desviado,
    };
  }
}

/** Texto do convite. Curto de propósito: vendedor lê no celular, entre visitas. */
export function textoConvite(params: {
  nomeQuemConvida: string;
  nomeEquipe: string;
  link: string;
  diasValidade: number;
}): Mensagem["texto"] {
  const quem = params.nomeQuemConvida || "Seu gestor";
  const equipe = params.nomeEquipe || "a equipe";
  return [
    `${quem} te convidou para ${equipe} no doniq.`,
    "",
    "O doniq transforma o áudio da sua visita em relatório pronto, sem digitar nada.",
    "",
    `Para entrar, abra este link: ${params.link}`,
    "",
    `O convite vale por ${params.diasValidade} dias.`,
    "",
    "Seu gestor vê o relatório da visita — empresa, objeção, próximo passo. A gravação e as",
    "frases que você falou não aparecem para ele.",
  ].join("\n");
}

/**
 * Mensagem do titular de dados para o encarregado (LGPD art. 41).
 *
 * O corpo repete o endereço de quem escreveu porque o `reply_to` some quando a
 * mensagem é encaminhada, e pedido de titular tem prazo legal para resposta.
 */
export function textoEncarregado(params: {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  quando: string;
}): Mensagem["texto"] {
  return [
    "Pedido recebido pelo formulário de privacidade do doniq.",
    "",
    `Nome: ${params.nome || "(não informado)"}`,
    `E-mail para resposta: ${params.email}`,
    `Assunto: ${params.assunto}`,
    `Recebido em: ${params.quando}`,
    "",
    "Mensagem:",
    params.mensagem,
    "",
    "— — —",
    "A LGPD dá prazo para responder pedido de titular. Responda direto para o e-mail acima.",
  ].join("\n");
}
