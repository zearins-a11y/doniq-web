/**
 * Testes da tomada do WhatsApp.
 *
 * O teste mais importante deste arquivo não é o que verifica envio — é o que
 * garante que, sem configuração, NADA sai e NADA quebra. Essa é a única coisa
 * que roda em produção hoje.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
  TEMPLATES_A_APROVAR,
  VERSAO_API_PADRAO,
  enviarWhatsapp,
  linkWhatsapp,
  montarCorpo,
  paraE164Br,
  provedorConfigurado,
  versaoApi,
} from "../whatsapp";

const originais = { ...process.env };

afterEach(() => {
  process.env = { ...originais };
});

describe("whatsapp desligado", () => {
  test("sem token e sem número de remetente, o provedor não está configurado", () => {
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_ID;
    expect(provedorConfigurado()).toBe(false);
  });

  test("token sem número (ou o contrário) continua desligado: meia configuração não vale", () => {
    process.env.WHATSAPP_TOKEN = "abc";
    delete process.env.WHATSAPP_PHONE_ID;
    expect(provedorConfigurado()).toBe(false);

    delete process.env.WHATSAPP_TOKEN;
    process.env.WHATSAPP_PHONE_ID = "123";
    expect(provedorConfigurado()).toBe(false);
  });

  test("desligado, não envia, não lança e diz o que fazer no lugar", async () => {
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_ID;

    const r = await enviarWhatsapp({
      para: "11999998888",
      template: { nome: "ficha_da_visita", idioma: "pt_BR", variaveis: ["Hospital X", "ligar", "hoje"] },
    });

    expect(r.enviado).toBe(false);
    expect(r.idExterno).toBe("");
    expect(r.motivo).toContain("à mão");
  });

  test("a versão da API tem padrão e é sobreponível por ambiente", () => {
    delete process.env.WHATSAPP_VERSAO_API;
    expect(versaoApi()).toBe(VERSAO_API_PADRAO);
    process.env.WHATSAPP_VERSAO_API = "v22.0";
    expect(versaoApi()).toBe("v22.0");
  });
});

describe("telefone em E.164", () => {
  test("celular com DDD ganha o 55 e perde a pontuação", () => {
    expect(paraE164Br("(11) 99999-8888")).toBe("5511999998888");
    expect(paraE164Br("11 9 9999 8888")).toBe("5511999998888");
  });

  test("fixo de 10 dígitos também é aceito", () => {
    expect(paraE164Br("1133334444")).toBe("551133334444");
  });

  test("número que já vem com 55 não recebe 55 de novo", () => {
    expect(paraE164Br("5511999998888")).toBe("5511999998888");
    expect(paraE164Br("+55 (11) 99999-8888")).toBe("5511999998888");
  });

  test("0 de operadora antes do DDD é descartado", () => {
    expect(paraE164Br("011999998888")).toBe("5511999998888");
  });

  test("DDD 55 do Rio Grande do Sul sobrevive: o corte do 55 olha o comprimento", () => {
    // (55) 99999-8888 tem 11 dígitos e é local — não pode virar número de 9.
    expect(paraE164Br("55999998888")).toBe("5555999998888");
    // Já com o país na frente, são 13 dígitos e o 55 da frente é o país.
    expect(paraE164Br("5555999998888")).toBe("5555999998888");
  });

  test("número incompleto ou improvável devolve vazio em vez de um chute", () => {
    expect(paraE164Br("99998888")).toBe(""); // sem DDD
    expect(paraE164Br("999998888")).toBe(""); // 9 dígitos
    expect(paraE164Br("11999998888777")).toBe(""); // longo demais
    expect(paraE164Br("0800 123 4567")).toBe(""); // 0800 não é WhatsApp
    expect(paraE164Br("0999998888")).toBe(""); // DDD 09 não existe
    expect(paraE164Br("")).toBe("");
    expect(paraE164Br("sem número")).toBe("");
  });

  test("telefone ruim não envia, e o motivo manda confirmar o número", async () => {
    process.env.WHATSAPP_TOKEN = "abc";
    process.env.WHATSAPP_PHONE_ID = "123";
    const r = await enviarWhatsapp({
      para: "99998888",
      template: { nome: "ficha_da_visita", idioma: "pt_BR", variaveis: [] },
    });
    expect(r.enviado).toBe(false);
    expect(r.motivo).toContain("telefone");
  });
});

describe("corpo da mensagem", () => {
  test("sai no formato de template que a Cloud API espera", () => {
    const corpo = montarCorpo("5511999998888", {
      nome: "ficha_da_visita",
      idioma: "pt_BR",
      variaveis: ["Hospital Santa Clara", "enviar proposta", "hoje"],
    }) as Record<string, any>;

    expect(corpo.messaging_product).toBe("whatsapp");
    expect(corpo.to).toBe("5511999998888");
    expect(corpo.type).toBe("template");
    expect(corpo.template.name).toBe("ficha_da_visita");
    expect(corpo.template.language.code).toBe("pt_BR");
    expect(corpo.template.components[0].parameters.map((p: any) => p.text)).toEqual([
      "Hospital Santa Clara",
      "enviar proposta",
      "hoje",
    ]);
  });

  test("template sem variável não manda componente vazio pela metade", () => {
    const corpo = montarCorpo("5511999998888", {
      nome: "aviso",
      idioma: "pt_BR",
      variaveis: [],
    }) as Record<string, any>;
    expect(corpo.template.components).toEqual([]);
  });
});

describe("link wa.me — o caminho de hoje", () => {
  test("leva o número normalizado e o texto escapado", () => {
    const l = linkWhatsapp("(11) 99999-8888", "Obrigado pela visita, Dra. Helena & equipe");
    expect(l.startsWith("https://wa.me/5511999998888?text=")).toBe(true);
    expect(l).toContain("%26"); // o & não pode quebrar a query
    expect(l).toContain("Dra.%20Helena");
  });

  test("sem telefone confiável, abre o WhatsApp sem destinatário em vez de sumir com a mensagem", () => {
    expect(linkWhatsapp("", "texto")).toBe("https://wa.me/?text=texto");
    expect(linkWhatsapp("99998888", "texto")).toBe("https://wa.me/?text=texto");
  });
});

describe("templates a aprovar", () => {
  test("todo template declarado é de utilidade e tem corpo em português", () => {
    expect(TEMPLATES_A_APROVAR.length).toBeGreaterThan(0);
    for (const t of TEMPLATES_A_APROVAR) {
      expect(t.categoria).toBe("utility");
      expect(t.idioma).toBe("pt_BR");
      expect(t.nome).toMatch(/^[a-z0-9_]+$/); // a Meta só aceita minúsculas e _
      expect(t.corpo.length).toBeGreaterThan(20);
    }
  });

  test("nenhum texto de utilidade carrega frase de venda: isso reclassifica e encarece", () => {
    // A categoria é decidida pela redação. Se alguém escrever oferta aqui, a Meta
    // cobra como marketing — várias vezes mais caro por mensagem.
    const proibidas = ["desconto", "promoção", "aproveite", "oferta", "grátis", "assine"];
    for (const t of TEMPLATES_A_APROVAR) {
      const corpo = t.corpo.toLowerCase();
      for (const p of proibidas) expect(corpo).not.toContain(p);
    }
  });

  test("as variáveis do corpo são numeradas em sequência, começando em 1", () => {
    for (const t of TEMPLATES_A_APROVAR) {
      const achadas = [...t.corpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      expect(achadas).toEqual(achadas.map((_, i) => i + 1));
    }
  });
});
