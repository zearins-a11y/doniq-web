import { describe, expect, test } from "bun:test";
import { DIAS_TESTE } from "../../../shared/planos";
import {
  assentosEmUso,
  diasRestantesDeTeste,
  estadoCobranca,
  planoConhecido,
  provedorDePagamentoConfigurado,
  quemPaga,
  totalMensal,
} from "../assinatura";

const CRIADO = "2026-08-01T12:00:00.000Z";
function em(iso: string) {
  return new Date(iso);
}

describe("prazo do teste", () => {
  test("o prazo é o número decidido em shared/planos, não um número solto aqui", () => {
    expect(DIAS_TESTE).toBe(7);
  });

  test("no primeiro instante o teste tem o prazo cheio", () => {
    expect(diasRestantesDeTeste(CRIADO, em(CRIADO))).toBe(DIAS_TESTE);
  });

  test("arredonda para cima: meio do último dia ainda é um dia", () => {
    expect(diasRestantesDeTeste(CRIADO, em("2026-08-07T18:00:00.000Z"))).toBe(1);
  });

  test("no instante do vencimento já é zero", () => {
    expect(diasRestantesDeTeste(CRIADO, em("2026-08-08T12:00:00.000Z"))).toBe(0);
  });

  test("depois do vencimento não fica negativo", () => {
    expect(diasRestantesDeTeste(CRIADO, em("2026-09-30T12:00:00.000Z"))).toBe(0);
  });

  test("data ilegível no banco não vira teste infinito", () => {
    expect(diasRestantesDeTeste("", em(CRIADO))).toBe(0);
    expect(diasRestantesDeTeste("ontem", em(CRIADO))).toBe(0);
  });
});

describe("vitrine: sem forma de pagar, nada trava", () => {
  test("teste vencido sem provedor continua podendo gravar", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2026-12-01T12:00:00.000Z"),
      provedorPronto: false,
      assinaturaAtiva: false,
    });
    expect(e.modo).toBe("vitrine");
    expect(e.pode_criar_ficha).toBe(true);
  });

  test("vitrine não promete cobrança nem inventa dias restantes", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em(CRIADO),
      provedorPronto: false,
      assinaturaAtiva: false,
    });
    expect(e.dias_restantes).toBe(0);
    expect(e.plano).toBe("");
    expect(e.aviso).toContain("sem cobrança");
  });

  test("a chave da Autumn é o que define o provedor", () => {
    expect(provedorDePagamentoConfigurado({} as NodeJS.ProcessEnv)).toBe(false);
    expect(provedorDePagamentoConfigurado({ AUTUMN_SECRET_KEY: "   " } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(provedorDePagamentoConfigurado({ AUTUMN_SECRET_KEY: "am_x" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("teste, ativa e vencida", () => {
  test("dentro do prazo é teste e libera tudo", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2026-08-03T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: false,
    });
    expect(e.modo).toBe("teste");
    expect(e.dias_restantes).toBe(5);
    expect(e.pode_criar_ficha).toBe(true);
    expect(e.aviso).toContain("5 dias");
  });

  test("um dia restante fala no singular", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2026-08-07T18:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: false,
    });
    expect(e.aviso).toContain("1 dia restante");
  });

  test("teste vencido com provedor pronto trava só a ficha nova", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2026-08-20T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: false,
    });
    expect(e.modo).toBe("vencida");
    expect(e.pode_criar_ficha).toBe(false);
    // o aviso precisa dizer o que continua funcionando, senão parece conta apagada
    expect(e.aviso).toContain("histórico");
    expect(e.aviso).toContain("exportação");
  });

  test("assinatura ativa vence o prazo do teste, mesmo muito depois", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2027-08-20T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: true,
      plano: "anual",
      membrosAceitos: 3,
    });
    expect(e.modo).toBe("ativa");
    expect(e.plano).toBe("anual");
    expect(e.pode_criar_ficha).toBe(true);
    expect(e.aviso).toContain("3 vendedores");
  });

  test("pagamento atrasado mantém acesso e orienta o proprietário", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2027-08-20T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: true,
      assinaturaAtrasada: true,
      plano: "mensal",
      paga: true,
    });
    expect(e.modo).toBe("atrasada");
    expect(e.plano).toBe("mensal");
    expect(e.pode_criar_ficha).toBe(true);
    expect(e.aviso).toContain("atualiza");
  });

  test("vendedor herda o atraso sem receber instrução para pagar", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2027-08-20T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: true,
      assinaturaAtrasada: true,
      plano: "mensal",
      paga: false,
    });
    expect(e.modo).toBe("atrasada");
    expect(e.pode_criar_ficha).toBe(true);
    expect(e.aviso).toContain("proprietário");
    expect(e.aviso).not.toContain("você atualiza");
  });

  test("assinatura ativa com plano desconhecido não vira estado ativo", () => {
    const e = estadoCobranca({
      criadoEm: CRIADO,
      agora: em("2026-08-20T12:00:00.000Z"),
      provedorPronto: true,
      assinaturaAtiva: true,
      plano: "enterprise-legado",
    });
    expect(e.modo).toBe("vencida");
    expect(e.plano).toBe("");
  });

  test("plano só sai da lista fechada", () => {
    expect(planoConhecido("mensal")).toBe("mensal");
    expect(planoConhecido("Mensal")).toBe("");
    expect(planoConhecido("gratis-para-sempre")).toBe("");
  });
});

describe("assentos", () => {
  test("conta solo é um assento", () => {
    expect(assentosEmUso(0)).toBe(1);
    expect(assentosEmUso(1)).toBe(1);
  });

  test("equipe conta quem aceitou", () => {
    expect(assentosEmUso(4)).toBe(4);
  });

  test("número quebrado ou inválido não gera fatura estranha", () => {
    expect(assentosEmUso(2.7)).toBe(2);
    expect(assentosEmUso(Number.NaN)).toBe(1);
    expect(assentosEmUso(-3)).toBe(1);
  });

  test("total mensal é assento x preço", () => {
    expect(totalMensal(3, 89)).toBe(267);
    expect(totalMensal(0, 89)).toBe(89);
  });
});

describe("quem paga", () => {
  test("conta sem equipe paga a própria assinatura", () => {
    expect(quemPaga("u_1")).toBe(true);
  });

  test("proprietário paga pela equipe", () => {
    expect(quemPaga("dono", "dono")).toBe(true);
  });

  test("gestor convidado não gerencia a cobrança do proprietário", () => {
    expect(quemPaga("gestor_2", "dono")).toBe(false);
  });

  test("vendedor convidado nunca vê cobrança", () => {
    expect(quemPaga("vendedor", "dono")).toBe(false);
  });
});
