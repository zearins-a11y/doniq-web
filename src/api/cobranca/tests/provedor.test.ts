/**
 * O que se pode testar do provedor sem rede: a queda graciosa.
 *
 * Não testamos a Autumn (isso seria testar a internet). Testamos a promessa que o
 * resto do código depende: sem chave, nada estoura e ninguém é travado.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  abrirCheckout,
  abrirPortal,
  assinaturaDoCliente,
  idDeCliente,
  moeda,
  parametrosAtualizacaoAssentos,
  parametrosCheckout,
} from "../provedor";

const original = process.env.AUTUMN_SECRET_KEY;
const fetchOriginal = globalThis.fetch;
const consoleErrorOriginal = console.error;
const chaveDeTeste = () => ["chave", "de", "teste"].join("-");

beforeEach(() => {
  delete process.env.AUTUMN_SECRET_KEY;
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  console.error = consoleErrorOriginal;
  if (original === undefined) delete process.env.AUTUMN_SECRET_KEY;
  else process.env.AUTUMN_SECRET_KEY = original;
});

describe("sem provedor configurado", () => {
  test("a assinatura volta null, que quem chama lê como vitrine", async () => {
    expect(await assinaturaDoCliente("u_1")).toBeNull();
  });

  test("checkout não é inventado: null em vez de URL falsa", async () => {
    expect(await abrirCheckout({ userId: "u_1", plano: "mensal", assentos: 3 })).toBeNull();
  });

  test("portal também volta null, sem exceção vazando para a rota", async () => {
    expect(await abrirPortal("u_1")).toBeNull();
  });

  test("chave só com espaço não conta como chave", async () => {
    process.env.AUTUMN_SECRET_KEY = "   ";
    expect(await assinaturaDoCliente("u_1")).toBeNull();
  });
});

describe("identidade e rótulo", () => {
  test("o cliente da Autumn é o nosso userId, não o e-mail", () => {
    expect(idDeCliente("u_abc")).toBe("u_abc");
  });

  test("a moeda exibida é real", () => {
    expect(moeda()).toBe("brl");
  });

  test("checkout força BRL e preserva plano, assentos e retorno", () => {
    expect(
      parametrosCheckout({
        userId: "u_1",
        plano: "mensal",
        assentos: 3,
        successUrl: "https://app.exemplo/equipe?assinatura=ok",
      }),
    ).toEqual({
      customer_id: "u_1",
      plan_id: "mensal",
      currency: "brl",
      feature_quantities: [{ feature_id: "assento", quantity: 3 }],
      proration_behavior: "prorate_immediately",
      redirect_mode: "always",
      success_url: "https://app.exemplo/equipe?assinatura=ok",
    });
  });

  test("atualização de assentos usa operação de fundo sem redirecionamento", () => {
    expect(parametrosAtualizacaoAssentos("u_1", "mensal", 3)).toEqual({
      customerId: "u_1",
      planId: "mensal",
      featureQuantities: [{ featureId: "assento", quantity: 3 }],
      prorationBehavior: "prorate_immediately",
      redirectMode: "never",
    });
  });

  test("quantidade de assentos nunca fica abaixo de um", () => {
    expect(parametrosAtualizacaoAssentos("u_1", "anual", 0).featureQuantities[0]?.quantity).toBe(1);
  });
});

describe("checkout hospedado", () => {
  test("envia o pedido em BRL e devolve a URL de pagamento", async () => {
    let urlRecebida = "";
    let opcoesRecebidas: RequestInit | undefined;
    globalThis.fetch = (async (url, opcoes) => {
      urlRecebida = String(url);
      opcoesRecebidas = opcoes;
      return Response.json({ payment_url: "https://checkout.exemplo/sessao" });
    }) as typeof fetch;
    process.env.AUTUMN_SECRET_KEY = chaveDeTeste();

    const url = await abrirCheckout({
      userId: "u_1",
      plano: "anual",
      assentos: 2,
      successUrl: "https://app.exemplo/equipe?assinatura=ok",
    });

    expect(url).toBe("https://checkout.exemplo/sessao");
    expect(urlRecebida).toBe("https://api.useautumn.com/v1/billing.attach");
    expect(opcoesRecebidas?.method).toBe("POST");
    expect(new Headers(opcoesRecebidas?.headers).get("authorization")).toBe(
      "Bearer chave-de-teste",
    );
    expect(JSON.parse(String(opcoesRecebidas?.body))).toEqual({
      customer_id: "u_1",
      plan_id: "anual",
      currency: "brl",
      feature_quantities: [{ feature_id: "assento", quantity: 2 }],
      proration_behavior: "prorate_immediately",
      redirect_mode: "always",
      success_url: "https://app.exemplo/equipe?assinatura=ok",
    });
  });

  test("falha HTTP não inventa URL nem derruba o produto", async () => {
    globalThis.fetch = (async () => new Response("indisponível", { status: 503 })) as typeof fetch;
    process.env.AUTUMN_SECRET_KEY = chaveDeTeste();

    expect(await abrirCheckout({ userId: "u_1", plano: "mensal", assentos: 1 })).toBeNull();
  });

  test("diagnóstico de falha remove cliente, e-mail e URL", async () => {
    let argumentos: unknown[] = [];
    console.error = (...valores) => {
      argumentos = valores;
    };
    globalThis.fetch = (async () =>
      Response.json(
        {
          error: {
            code: "currency_mismatch",
            type: "invalid_request",
            message:
              "Customer u_cliente está em USD. Veja https://checkout.exemplo/sessao ou avise pessoa@exemplo.com.",
          },
        },
        { status: 400 },
      )) as typeof fetch;
    process.env.AUTUMN_SECRET_KEY = chaveDeTeste();

    expect(
      await abrirCheckout({ userId: "u_cliente", plano: "mensal", assentos: 1 }),
    ).toBeNull();
    expect(argumentos).toEqual([
      "[cobranca] Autumn recusou checkout",
      {
        status: 400,
        code: "currency_mismatch",
        type: "invalid_request",
        message: "Customer [customer] está em USD. Veja [url] ou avise [email].",
      },
    ]);
  });

  test("falha de rede registra somente o tipo do erro", async () => {
    let argumentos: unknown[] = [];
    console.error = (...valores) => {
      argumentos = valores;
    };
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed com dado interno");
    }) as typeof fetch;
    process.env.AUTUMN_SECRET_KEY = chaveDeTeste();

    expect(await abrirCheckout({ userId: "u_1", plano: "mensal", assentos: 1 })).toBeNull();
    expect(argumentos).toEqual([
      "[cobranca] Falha ao chamar checkout Autumn",
      { type: "TypeError" },
    ]);
  });
});
