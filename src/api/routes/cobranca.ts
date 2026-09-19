/**
 * Cobrança — o estado do dinheiro, decidido no servidor.
 *
 * Duas regras mandam aqui:
 *
 *  1. **A tela nunca deduz se pode cobrar.** Ela recebe `modo`, `pode_criar_ficha`
 *     e uma frase pronta. Cálculo de cobrança em JavaScript de navegador é
 *     cálculo que o usuário pode editar.
 *  2. **Quem paga é o dono da equipe.** O vendedor convidado nunca vê tela de
 *     pagamento; ele herda o estado de quem paga. Se o vendedor achar que a
 *     ferramenta é despesa dele, ele para de gravar — e gravar é o produto.
 *
 * As decisões (cinco estados, teste de 7 dias contado no nosso banco, `vitrine`
 * que não trava nada) moram em `cobranca/assinatura.ts`, que é puro e testado.
 * Aqui só se busca o que o banco sabe e se obedece ao veredito.
 */

import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { MENSAL, ANUAL } from "../../shared/planos";
import {
  type EstadoCobranca,
  assentosEmUso,
  estadoCobranca,
  planoConhecido,
  provedorDePagamentoConfigurado,
  quemPaga,
  totalMensal,
} from "../cobranca/assinatura";
import {
  abrirCheckout,
  abrirPortal,
  assinaturaDoCliente,
  definirAssinaturaSimulada,
  modoSimulado,
} from "../cobranca/provedor";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { urlDoApp } from "../services/app-url";

/** Quem é o pagante desta conta e quantos assentos ele tem hoje. */
interface Contexto {
  /** Conta que recebe a fatura: dono da equipe, ou a própria pessoa. */
  pagante: string;
  /** Data de criação da conta do pagante — o relógio do teste é o dele. */
  criadoEm: string;
  /** Assentos = membros que aceitaram o convite. Mínimo 1. */
  assentos: number;
  /** Esta conta é a que paga? */
  paga: boolean;
}

async function contextoDeCobranca(userId: string, criadoEmProprio: string): Promise<Contexto> {
  const [membro] = await db
    .select()
    .from(schema.membros)
    .where(eq(schema.membros.userId, userId));

  // Conta solo: ela é o próprio pagante e um assento (o dela).
  if (!membro) {
    return { pagante: userId, criadoEm: criadoEmProprio, assentos: 1, paga: true };
  }

  const [equipe] = await db
    .select()
    .from(schema.equipes)
    .where(eq(schema.equipes.equipeId, membro.equipeId));

  const pagante = equipe?.donoUserId || userId;
  const paga = quemPaga(userId, equipe?.donoUserId);

  /**
   * Contamos linhas de `membros`, não de `convites`: só entra em `membros` quem
   * aceitou. Convite pendente é intenção, e cobrar intenção faz o gestor parar
   * de convidar.
   */
  const linhas = await db
    .select({ userId: schema.membros.userId })
    .from(schema.membros)
    .where(eq(schema.membros.equipeId, membro.equipeId));

  // O relógio do teste é o da conta que paga, não o de quem está olhando: senão
  // um vendedor convidado hoje reabriria sete dias grátis para a equipe inteira.
  let criadoEm = criadoEmProprio;
  if (pagante !== userId) {
    const [dono] = await db.select().from(schema.users).where(eq(schema.users.userId, pagante));
    criadoEm = dono?.criadoEm || criadoEmProprio;
  }

  return { pagante, criadoEm, assentos: assentosEmUso(linhas.length), paga };
}

/**
 * O estado completo, pronto para a tela.
 *
 * Exportado porque `relatos.criar` precisa da mesma resposta para decidir a trava
 * — a trava e o aviso têm de vir da mesma conta, senão a tela diz "tudo certo" e
 * o botão devolve erro.
 */
export async function estadoDaConta(usuario: {
  userId: string;
  criadoEm: string;
}): Promise<EstadoCobranca & { pagante: string; total_mensal: number }> {
  const ctx = await contextoDeCobranca(usuario.userId, usuario.criadoEm);

  let provedorPronto = provedorDePagamentoConfigurado();
  let assinaturaAtiva = false;
  let assinaturaAtrasada = false;
  let plano = "";

  if (provedorPronto) {
    const remota = await assinaturaDoCliente(ctx.pagante);
    // `null` = não conseguimos perguntar (chave inválida, Autumn fora do ar).
    // Tratar como "não há provedor" é o padrão seguro: ninguém trava por pane nossa.
    if (remota === null) provedorPronto = false;
    else {
      assinaturaAtiva = remota.ativa;
      assinaturaAtrasada = remota.atrasada;
      plano = remota.plano;
    }
  }

  const estado = estadoCobranca({
    criadoEm: ctx.criadoEm,
    agora: new Date(),
    provedorPronto,
    assinaturaAtiva,
    assinaturaAtrasada,
    plano,
    membrosAceitos: ctx.assentos,
    paga: ctx.paga,
  });

  return {
    ...estado,
    pagante: ctx.pagante,
    total_mensal: totalMensal(ctx.assentos, estado.plano === "anual" ? ANUAL : MENSAL),
  };
}

export const cobranca = {
  /** GET /cobranca/estado — o que a tela deve dizer e o que está liberado. */
  estado: autenticado.handler(async ({ context }) => {
    return estadoDaConta(context.usuario);
  }),

  /**
   * POST /cobranca/assinar — devolve a URL do checkout.
   *
   * Não cobramos aqui dentro: quem cobra é a página hospedada da Stripe, que é
   * onde Pix e cartão convivem e onde as regras de cada meio de pagamento ficam
   * em ordem sem nós.
   */
  assinar: autenticado
    .input(z.object({ plano: z.string().max(20) }))
    .handler(async ({ input, context }) => {
      const plano = planoConhecido(input.plano);
      if (!plano) {
        throw new ORPCError("BAD_REQUEST", { message: "Plano desconhecido. Escolha mensal ou anual." });
      }

      const estado = await estadoDaConta(context.usuario);
      if (!estado.paga) {
        throw new ORPCError("FORBIDDEN", {
          message: "A assinatura é administrada pelo proprietário da equipe.",
        });
      }
      if (estado.modo === "vitrine") {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message:
            "A assinatura ainda não abriu. Você continua usando o produto inteiro, sem cobrança, até ela abrir.",
        });
      }

      const url = await abrirCheckout({
        userId: estado.pagante,
        plano,
        assentos: estado.assentos,
        successUrl: urlDoApp("/equipe?assinatura=ok"),
      });
      if (!url) {
        throw new ORPCError("BAD_GATEWAY", {
          message: "Não deu pra abrir o pagamento agora. Nada foi cobrado — tente de novo em alguns minutos.",
        });
      }
      return { url, plano, assentos: estado.assentos };
    }),

  /**
   * POST /cobranca/portal — trocar cartão, ver faturas, cancelar.
   *
   * Cancelar mora na Stripe de propósito: quem quer sair sai sozinho. Assinatura
   * que só cancela por e-mail vira chargeback, e chargeback custa mais que o mês
   * que se tentou segurar.
   */
  portal: autenticado.handler(async ({ context }) => {
    const estado = await estadoDaConta(context.usuario);
    if (!estado.paga) {
      throw new ORPCError("FORBIDDEN", {
        message: "A assinatura é administrada pelo proprietário da equipe.",
      });
    }
    const url = await abrirPortal(estado.pagante, urlDoApp("/equipe"));
    if (!url) {
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "Ainda não há assinatura para gerenciar.",
      });
    }
    return { url };
  }),

  /** POST /cobranca/simularAtivacao — simula confirmação de pagamento em ambiente de sandbox. */
  simularAtivacao: autenticado
    .input(
      z.object({
        plano: z.enum(["mensal", "anual"]),
        assentos: z.number().int().min(1).default(1),
        atrasada: z.boolean().optional().default(false),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!modoSimulado()) {
        throw new ORPCError("FORBIDDEN", {
          message: "Simulação de cobrança indisponível em produção.",
        });
      }
      const estado = await estadoDaConta(context.usuario);
      if (!estado.paga) {
        throw new ORPCError("FORBIDDEN", {
          message: "A assinatura é administrada pelo proprietário da equipe.",
        });
      }
      definirAssinaturaSimulada(estado.pagante, {
        ativa: true,
        plano: input.plano,
        assentos: input.assentos,
        atrasada: input.atrasada,
      });
      return { sucesso: true, plano: input.plano, assentos: input.assentos };
    }),

  /** POST /cobranca/simularCancelamento — cancela assinatura simulada para testes de vencimento. */
  simularCancelamento: autenticado.handler(async ({ context }) => {
    if (!modoSimulado()) {
      throw new ORPCError("FORBIDDEN", {
        message: "Simulação de cobrança indisponível em produção.",
      });
    }
    const estado = await estadoDaConta(context.usuario);
    if (!estado.paga) {
      throw new ORPCError("FORBIDDEN", {
        message: "A assinatura é administrada pelo proprietário da equipe.",
      });
    }
    definirAssinaturaSimulada(estado.pagante, null);
    return { sucesso: true };
  }),
};
