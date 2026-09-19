/**
 * Testes Ponta a Ponta (E2E) do Funil de Compra, Checkout e Ciclo de Vida da Cobrança.
 *
 * Valida:
 *  1. Máquina de estados completa (teste -> vencida -> checkout -> ativa -> atrasada);
 *  2. Trava ética: contas vencidas travam APENAS gravação nova (histórico e exportação livres);
 *  3. Abertura de checkout (mensal vs anual, cálculo de assentos e proration);
 *  4. Ativação pós-pagamento e liberação imediata de cotas;
 *  5. Ajuste proporcional de assentos quando a equipe expande ou reduz;
 *  6. Proteção de papéis: somente o proprietário da equipe administra cobrança.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { MENSAL, ANUAL } from "../../../shared/planos";
import {
  assentosEmUso,
  estadoCobranca,
  quemPaga,
  totalMensal,
} from "../assinatura";
import {
  abrirCheckout,
  assinaturaDoCliente,
  atualizarAssentos,
  definirAssinaturaSimulada,
  limparAssinaturasSimuladas,
  parametrosAtualizacaoAssentos,
  parametrosCheckout,
} from "../provedor";

const DATA_CRIACAO = "2026-09-01T10:00:00.000Z";

function dataSimulada(iso: string): Date {
  return new Date(iso);
}

describe("E2E Fluxo Comercial: Ciclo de Vida da Conta e Compra", () => {
  beforeEach(() => {
    limparAssinaturasSimuladas();
    delete process.env.AUTUMN_SECRET_KEY;
    process.env.SIMULAR_COBRANCA = "true";
  });

  afterEach(() => {
    limparAssinaturasSimuladas();
    delete process.env.SIMULAR_COBRANCA;
    delete process.env.AUTUMN_SECRET_KEY;
  });

  describe("1. Período de Teste Gratuito (7 dias)", () => {
    test("conta nova nasce em teste com 7 dias e permissão de gravação liberada", () => {
      const e = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-09-01T10:00:00.000Z"),
        provedorPronto: true,
        assinaturaAtiva: false,
      });

      expect(e.modo).toBe("teste");
      expect(e.dias_restantes).toBe(7);
      expect(e.pode_criar_ficha).toBe(true);
      expect(e.aviso).toContain("7 dias restantes");
      expect(e.aviso).toContain("Nenhum cartão foi pedido");
    });

    test("regressão diária do teste informa os dias corretos até o último dia", () => {
      // 4 dias depois
      const d4 = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-09-05T10:00:00.000Z"),
        provedorPronto: true,
        assinaturaAtiva: false,
      });
      expect(d4.dias_restantes).toBe(3);
      expect(d4.pode_criar_ficha).toBe(true);

      // Último dia (singular)
      const dUltimo = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-09-07T18:00:00.000Z"),
        provedorPronto: true,
        assinaturaAtiva: false,
      });
      expect(dUltimo.dias_restantes).toBe(1);
      expect(dUltimo.aviso).toContain("1 dia restante");
      expect(dUltimo.pode_criar_ficha).toBe(true);
    });
  });

  describe("2. Vencimento Ético do Teste (vencida)", () => {
    test("após os 7 dias sem assinar, pausa apenas novas gravações sem reter histórico", () => {
      const e = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-09-10T12:00:00.000Z"), // 9 dias depois
        provedorPronto: true,
        assinaturaAtiva: false,
      });

      expect(e.modo).toBe("vencida");
      expect(e.dias_restantes).toBe(0);
      expect(e.pode_criar_ficha).toBe(false);

      // Garantia de transparência com o usuário
      expect(e.aviso).toContain("O teste acabou");
      expect(e.aviso).toContain("Gravar visita nova está pausado");
      expect(e.aviso).toContain("histórico");
      expect(e.aviso).toContain("painel");
      expect(e.aviso).toContain("exportação continuam abertos");
    });

    test("se o provedor de pagamento estiver desconectado, cai para vitrine sem travar", () => {
      const e = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-10-01T12:00:00.000Z"),
        provedorPronto: false, // Sem chave e sem sandbox
        assinaturaAtiva: false,
      });

      expect(e.modo).toBe("vitrine");
      expect(e.pode_criar_ficha).toBe(true); // Ninguém é feito de refém por falta de infraestrutura
    });
  });

  describe("3. Iniciação do Checkout e Cálculo de Assentos", () => {
    test("calcula valores e parâmetros de checkout para plano mensal e anual", () => {
      expect(totalMensal(1, MENSAL)).toBe(89);
      expect(totalMensal(3, MENSAL)).toBe(267);
      expect(totalMensal(5, ANUAL)).toBe(395);

      const paramsMensal = parametrosCheckout({
        userId: "user_gestor",
        plano: "mensal",
        assentos: 3,
        successUrl: "https://doniq.app/equipe?assinatura=ok",
      });

      expect(paramsMensal.customer_id).toBe("user_gestor");
      expect(paramsMensal.plan_id).toBe("mensal");
      expect(paramsMensal.currency).toBe("brl");
      expect(paramsMensal.feature_quantities[0]?.quantity).toBe(3);
      expect(paramsMensal.proration_behavior).toBe("prorate_immediately");
      expect(paramsMensal.redirect_mode).toBe("always");
    });

    test("gera URL de checkout simulado quando em modo sandbox", async () => {
      const url = await abrirCheckout({
        userId: "user_gestor",
        plano: "anual",
        assentos: 4,
        successUrl: "/equipe?assinatura=ok",
      });

      expect(url).not.toBeNull();
      expect(url).toContain("/checkout-simulado");
      expect(url).toContain("plano=anual");
      expect(url).toContain("assentos=4");
      expect(url).toContain("retorno=%2Fequipe%3Fassinatura%3Dok");
    });

    test("gera URL oficial de checkout da Autumn/Stripe quando com chave ao vivo", async () => {
      const chaveMock = () => ["am", "sk", "test", "simulada"].join("_");
      process.env.AUTUMN_SECRET_KEY = chaveMock();
      globalThis.fetch = (async () => {
        return Response.json({ payment_url: "https://checkout.stripe.com/c/pay/cs_test_123" });
      }) as typeof fetch;

      const url = await abrirCheckout({
        userId: "user_gestor",
        plano: "mensal",
        assentos: 2,
        successUrl: "https://doniq.com.br/equipe?assinatura=ok",
      });

      expect(url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
    });
  });

  describe("4. Ativação Pós-Pagamento e Liberação de Recursos", () => {
    test("confirmação do pagamento ativa a assinatura e reabre permissão de gravação", async () => {
      const userId = "user_titular";

      // Antes do pagamento: conta vencida
      definirAssinaturaSimulada(userId, null);
      const antes = await assinaturaDoCliente(userId);
      expect(antes?.ativa).toBe(false);

      // Simulação do webhook ou retorno da Stripe ativando plano anual para 3 vendedores
      definirAssinaturaSimulada(userId, {
        ativa: true,
        plano: "anual",
        assentos: 3,
        atrasada: false,
      });

      const remoto = await assinaturaDoCliente(userId);
      expect(remoto?.ativa).toBe(true);
      expect(remoto?.plano).toBe("anual");
      expect(remoto?.assentos).toBe(3);
      expect(remoto?.atrasada).toBe(false);

      // Estado avaliado pelo produto
      const estado = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-10-15T10:00:00.000Z"), // Bem depois dos 7 dias
        provedorPronto: true,
        assinaturaAtiva: remoto!.ativa,
        plano: remoto!.plano,
        membrosAceitos: remoto!.assentos,
      });

      expect(estado.modo).toBe("ativa");
      expect(estado.plano).toBe("anual");
      expect(estado.assentos).toBe(3);
      expect(estado.pode_criar_ficha).toBe(true);
      expect(estado.aviso).toBe("Assinatura anual ativa para 3 vendedores.");
    });
  });

  describe("5. Recuperação de Pagamento Atrasado (atrasada)", () => {
    test("renovação pendente no cartão não bloqueia a operação do vendedor", async () => {
      const userId = "user_titular";
      definirAssinaturaSimulada(userId, {
        ativa: true,
        plano: "mensal",
        assentos: 2,
        atrasada: true,
      });

      const remoto = await assinaturaDoCliente(userId);
      expect(remoto?.atrasada).toBe(true);

      // Para o proprietário: avisa com ação de regularização
      const estadoDono = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-11-01T10:00:00.000Z"),
        provedorPronto: true,
        assinaturaAtiva: remoto!.ativa,
        assinaturaAtrasada: remoto!.atrasada,
        plano: remoto!.plano,
        membrosAceitos: remoto!.assentos,
        paga: true,
      });

      expect(estadoDono.modo).toBe("atrasada");
      expect(estadoDono.pode_criar_ficha).toBe(true);
      expect(estadoDono.aviso).toContain("O pagamento da assinatura está pendente");
      expect(estadoDono.aviso).toContain("O acesso continua liberado");

      // Para o vendedor da equipe: aviso neutro sem cobrança
      const estadoVendedor = estadoCobranca({
        criadoEm: DATA_CRIACAO,
        agora: dataSimulada("2026-11-01T10:00:00.000Z"),
        provedorPronto: true,
        assinaturaAtiva: remoto!.ativa,
        assinaturaAtrasada: remoto!.atrasada,
        plano: remoto!.plano,
        membrosAceitos: remoto!.assentos,
        paga: false,
      });

      expect(estadoVendedor.modo).toBe("atrasada");
      expect(estadoVendedor.pode_criar_ficha).toBe(true);
      expect(estadoVendedor.aviso).toContain("regularização pelo proprietário");
      expect(estadoVendedor.aviso).not.toContain("você atualiza");
    });
  });

  describe("6. Escalonamento e Proration de Assentos", () => {
    test("atualização de assentos calcula proporcionalidade imediata sem redirect", async () => {
      const userId = "user_expansao";
      definirAssinaturaSimulada(userId, {
        ativa: true,
        plano: "mensal",
        assentos: 2,
      });

      const params = parametrosAtualizacaoAssentos(userId, "mensal", 5);
      expect(params.customerId).toBe(userId);
      expect(params.featureQuantities[0]?.quantity).toBe(5);
      expect(params.prorationBehavior).toBe("prorate_immediately");
      expect(params.redirectMode).toBe("never");

      // Atualiza os assentos no provedor
      const ok = await atualizarAssentos(userId, "mensal", 5);
      expect(ok).toBe(true);

      const atualizado = await assinaturaDoCliente(userId);
      expect(atualizado?.assentos).toBe(5);
    });

    test("assentos nunca ficam abaixo de 1 mesmo com equipe zerada", () => {
      expect(assentosEmUso(0)).toBe(1);
      expect(assentosEmUso(-5)).toBe(1);
      expect(assentosEmUso(1)).toBe(1);
      expect(assentosEmUso(10)).toBe(10);
    });
  });

  describe("7. Regras de Papéis e Permissão de Cobrança", () => {
    test("apenas o proprietário da equipe administra cobrança", () => {
      expect(quemPaga("dono_id", "dono_id")).toBe(true);
      expect(quemPaga("vendedor_id", "dono_id")).toBe(false);
      expect(quemPaga("gestor_convidado", "dono_id")).toBe(false);
      expect(quemPaga("solo_id", null)).toBe(true);
    });
  });
});
