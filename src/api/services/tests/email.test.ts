/**
 * Serviço de e-mail.
 *
 * O que estes testes protegem, em ordem de gravidade:
 *   - sem provedor, o serviço NÃO finge que enviou (convite perdido em silêncio
 *     é pior do que convite que a tela manda o gestor copiar);
 *   - no modo de teste, nenhuma mensagem escapa para o destinatário real — é a
 *     trava que impede um teste de mandar convite para um vendedor de verdade;
 *   - o resultado sempre diz em que modo o servidor estava, para a tela não
 *     prometer o que não aconteceu;
 *   - falha do provedor nunca vira exceção: e-mail é acessório.
 */
import { afterEach, expect, mock, test } from "bun:test";
import {
  assuntoDesviado,
  avisoDesvio,
  chaveConfigurada,
  emailValido,
  enviarEmail,
  modoEmail,
  provedorConfigurado,
  textoConvite,
  textoEncarregado,
} from "../email";

const CHAVES = ["RESEND_API_KEY", "EMAIL_REMETENTE", "EMAIL_TESTE_PARA", "EMAIL_ENCARREGADO"] as const;
const original = Object.fromEntries(CHAVES.map((k) => [k, process.env[k]]));
const fetchOriginal = globalThis.fetch;

function ambiente(valores: Partial<Record<(typeof CHAVES)[number], string>>) {
  for (const k of CHAVES) {
    const v = valores[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/** Captura o corpo enviado sem falar com a rede. */
function fetchFalso(status = 200) {
  const chamadas: { url: string; corpo: Record<string, unknown>; headers: Headers }[] = [];
  globalThis.fetch = mock(async (url: unknown, init?: unknown) => {
    const opcoes = (init ?? {}) as { body?: string; headers?: HeadersInit };
    chamadas.push({
      url: String(url),
      corpo: JSON.parse(opcoes.body ?? "{}"),
      headers: new Headers(opcoes.headers),
    });
    return new Response("{}", { status });
  }) as unknown as typeof fetch;
  return chamadas;
}

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  for (const k of CHAVES) {
    const v = original[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/* ------------------------------------------------ os três estados */

test("sem chave o serviço está desligado e não finge que enviou", async () => {
  ambiente({ EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  const chamadas = fetchFalso();
  expect(chaveConfigurada()).toBe(false);
  expect(modoEmail()).toBe("desligado");
  expect(provedorConfigurado()).toBe(false);

  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "Convite", texto: "oi" });
  expect(r.enviado).toBe(false);
  expect(r.modo).toBe("desligado");
  expect(r.motivo.length).toBeGreaterThan(10);
  expect(chamadas).toHaveLength(0);
});

test("chave sem remetente também está desligado: o Resend recusaria de qualquer forma", () => {
  ambiente({ RESEND_API_KEY: "re_123" });
  expect(modoEmail()).toBe("desligado");
});

test("chave e remetente, sem endereço de teste, envia de verdade para quem é", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  const chamadas = fetchFalso();
  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "Convite", texto: "corpo" });

  expect(r).toMatchObject({ enviado: true, modo: "ligado", destino: "vendedor@empresa.com.br", desviado: false });
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0]?.corpo.to).toEqual(["vendedor@empresa.com.br"]);
  expect(chamadas[0]?.corpo.subject).toBe("Convite");
  expect(String(chamadas[0]?.corpo.text)).toBe("corpo");
});

/* ------------------------------------------------ a trava do modo de teste */

test("no modo de teste nada chega ao destinatário real", async () => {
  ambiente({
    RESEND_API_KEY: "re_123",
    EMAIL_REMETENTE: "doniq <onboarding@resend.dev>",
    EMAIL_TESTE_PARA: "jose@exemplo.com",
  });
  const chamadas = fetchFalso();
  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "Convite", texto: "corpo" });

  expect(modoEmail()).toBe("teste");
  expect(r).toMatchObject({ enviado: true, modo: "teste", destino: "jose@exemplo.com", desviado: true });
  expect(chamadas[0]?.corpo.to).toEqual(["jose@exemplo.com"]);
  // o endereço real não pode aparecer como destino em lugar nenhum do envelope
  expect(JSON.stringify(chamadas[0]?.corpo.to)).not.toContain("vendedor@empresa.com.br");
});

test("a mensagem desviada se identifica no assunto e no corpo", async () => {
  ambiente({
    RESEND_API_KEY: "re_123",
    EMAIL_REMETENTE: "doniq <onboarding@resend.dev>",
    EMAIL_TESTE_PARA: "jose@exemplo.com",
  });
  const chamadas = fetchFalso();
  await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "Convite", texto: "corpo original" });

  const assunto = String(chamadas[0]?.corpo.subject);
  const texto = String(chamadas[0]?.corpo.text);
  expect(assunto).toBe("[TESTE → vendedor@empresa.com.br] Convite");
  expect(texto).toContain("MODO DE TESTE");
  expect(texto).toContain("vendedor@empresa.com.br");
  // o conteúdo original continua inteiro, só ganhou um cabeçalho
  expect(texto.endsWith("corpo original")).toBe(true);
});

test("o desvio vence o remetente próprio: quem configurou teste está testando", () => {
  ambiente({
    RESEND_API_KEY: "re_123",
    EMAIL_REMETENTE: "doniq <oi@doniq.com.br>",
    EMAIL_TESTE_PARA: "jose@exemplo.com",
  });
  expect(modoEmail()).toBe("teste");
});

test("endereço de teste inválido não vira envio para o destinatário real", async () => {
  ambiente({
    RESEND_API_KEY: "re_123",
    EMAIL_REMETENTE: "doniq <onboarding@resend.dev>",
    EMAIL_TESTE_PARA: "isso não é e-mail",
  });
  const chamadas = fetchFalso();
  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "Convite", texto: "corpo" });

  expect(r.enviado).toBe(false);
  expect(r.desviado).toBe(true);
  expect(chamadas).toHaveLength(0);
});

/* ------------------------------------------------ robustez */

test("destino inválido é recusado antes de gastar chamada", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  const chamadas = fetchFalso();
  for (const ruim of ["", "   ", "sem-arroba", "a@b", "a@b.c d"]) {
    const r = await enviarEmail({ para: ruim, assunto: "x", texto: "y" });
    expect(r.enviado).toBe(false);
  }
  expect(chamadas).toHaveLength(0);
});

test("provedor recusando devolve motivo com o código, sem lançar", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  fetchFalso(422);
  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "x", texto: "y" });
  expect(r.enviado).toBe(false);
  expect(r.motivo).toContain("422");
});

test("rede caída não derruba a operação principal", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  globalThis.fetch = mock(async () => {
    throw new Error("sem rede");
  }) as unknown as typeof fetch;
  const r = await enviarEmail({ para: "vendedor@empresa.com.br", assunto: "x", texto: "y" });
  expect(r.enviado).toBe(false);
  expect(r.motivo.length).toBeGreaterThan(10);
});

test("responder-para só vai no envelope quando existe", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  const chamadas = fetchFalso();
  await enviarEmail({ para: "a@b.com.br", assunto: "x", texto: "y" });
  await enviarEmail({ para: "a@b.com.br", assunto: "x", texto: "y", responderPara: "titular@c.com.br" });
  expect(chamadas[0]?.corpo).not.toHaveProperty("reply_to");
  expect(chamadas[1]?.corpo.reply_to).toBe("titular@c.com.br");
});

test("envia chave de idempotência quando a mensagem fornece uma", async () => {
  ambiente({ RESEND_API_KEY: "re_123", EMAIL_REMETENTE: "doniq <oi@doniq.com.br>" });
  const chamadas = fetchFalso();
  await enviarEmail({
    para: "a@b.com.br",
    assunto: "Código",
    texto: "123456",
    chaveIdempotencia: "codigo-login/ver_123",
  });

  expect(chamadas[0]?.headers.get("idempotency-key")).toBe("codigo-login/ver_123");
});

test("emailValido aceita o comum e recusa o hostil", () => {
  for (const bom of ["a@b.com.br", "jose.moreira+doniq@empresa.com"]) expect(emailValido(bom)).toBe(true);
  for (const ruim of ["", "a@b", "a b@c.com", null, undefined, 7, `${"a".repeat(200)}@b.com`]) {
    expect(emailValido(ruim)).toBe(false);
  }
});

/* ------------------------------------------------ textos */

test("o convite diz quem convidou, o link, o prazo e o limite de privacidade", () => {
  const t = textoConvite({
    nomeQuemConvida: "Carla",
    nomeEquipe: "Equipe Sul",
    link: "https://doniq.com.br/convite/abc",
    diasValidade: 7,
  });
  expect(t).toContain("Carla");
  expect(t).toContain("Equipe Sul");
  expect(t).toContain("https://doniq.com.br/convite/abc");
  expect(t).toContain("7 dias");
  expect(t).toContain("não aparecem para ele");
});

test("convite sem nome não vira 'undefined te convidou'", () => {
  const t = textoConvite({ nomeQuemConvida: "", nomeEquipe: "", link: "x", diasValidade: 7 });
  expect(t.toLowerCase()).not.toContain("undefined");
  expect(t).toContain("Seu gestor");
});

test("o pedido do titular chega com e-mail de resposta no corpo, não só no cabeçalho", () => {
  const t = textoEncarregado({
    nome: "José",
    email: "jose@titular.com",
    assunto: "Apagar meus dados",
    mensagem: "Quero excluir minha conta.",
    quando: "2026-08-11 09:00",
  });
  expect(t).toContain("jose@titular.com");
  expect(t).toContain("Apagar meus dados");
  expect(t).toContain("Quero excluir minha conta.");
  expect(t).toContain("prazo");
});

test("os enfeites do modo teste são estáveis o bastante para a tela citar", () => {
  expect(assuntoDesviado("Convite", "a@b.com")).toContain("[TESTE");
  expect(avisoDesvio("a@b.com")).toContain("a@b.com");
});
