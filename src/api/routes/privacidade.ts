/**
 * Direitos do titular: portabilidade dos dados da conta (LGPD art. 18, V) e
 * canal de contato com o encarregado (art. 41).
 */

import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { base } from "../core/app";
import { decifrar, mascarar } from "../crm/cripto";
import { NOMES_PROVEDOR } from "../crm";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { paraUsuario } from "../auth-dispositivo";
import {
  type IntegracaoExportada,
  montarExportacao,
  nomeArquivo,
} from "../privacidade/exportacao";
import { isoUtc } from "../relato/tempo";
import {
  emailValido,
  enderecoEncarregado,
  enviarEmail,
  provedorConfigurado,
  textoEncarregado,
} from "../services/email";
import { LIMITE_POR_JANELA, registrarTentativa } from "../services/limite-envio";
import { paraApi } from "./relatos";

/** Teto de segurança: o titular leva tudo, mas o servidor não monta um arquivo infinito. */
export const LIMITE_EXPORTACAO = 5000;

/**
 * Assuntos possíveis, fechados em lista.
 *
 * São os direitos que a LGPD dá ao titular (art. 18), em português de gente.
 * Lista fechada não é burocracia: string livre no assunto de um e-mail é
 * exatamente onde se injeta cabeçalho.
 */
export const ASSUNTOS_TITULAR = [
  "Quero saber quais dados vocês têm sobre mim",
  "Quero corrigir um dado meu",
  "Quero apagar minha conta e meus dados",
  "Quero revogar meu consentimento",
  "Outra dúvida sobre privacidade",
] as const;

export const LIMITE_MENSAGEM = 3000;

/** Prazo que a política promete ao titular. Repetido na confirmação da tela. */
export const PRAZO_RESPOSTA_DIAS = 15;

export const privacidade = {
  /** GET /privacidade/exportar — todos os dados da conta em um JSON. */
  exportar: autenticado.handler(async ({ context }) => {
    const usuario = context.usuario;

    const linhas = await db
      .select()
      .from(schema.relatos)
      .where(eq(schema.relatos.userId, usuario.userId))
      .orderBy(desc(schema.relatos.createdAt))
      .limit(LIMITE_EXPORTACAO);

    const conectadas = await db
      .select()
      .from(schema.integracoes)
      .where(eq(schema.integracoes.userId, usuario.userId));

    const integracoes: IntegracaoExportada[] = conectadas.map((i) => {
      let mascara = "••••";
      try {
        const cred = JSON.parse(decifrar(i.credenciais)) as { token?: string };
        mascara = mascarar(cred.token ?? "");
      } catch {
        mascara = "credencial ilegível";
      }
      return {
        provedor: i.provedor,
        nome: NOMES_PROVEDOR[i.provedor as keyof typeof NOMES_PROVEDOR] ?? i.provedor,
        token_mascarado: mascara,
        mapa_campos: i.mapaCampos ?? {},
        funil_id: i.funilId,
        etapa_id: i.etapaId,
        ativa: i.ativa,
        atualizado_em: i.atualizadoEm,
      };
    });

    const agora = isoUtc();
    const dados = montarExportacao(
      paraUsuario(usuario),
      linhas.map((l) => paraApi(l) as unknown as Record<string, unknown>),
      integracoes,
      agora,
    );

    return { arquivo: nomeArquivo(usuario, agora), dados };
  }),

  /**
   * GET /privacidade/canal-encarregado — a tela pergunta se o canal existe.
   *
   * Sem endereço configurado o formulário não aparece. Formulário que aceita o
   * pedido e joga fora é pior do que formulário nenhum: o titular acredita que
   * exerceu um direito que ninguém recebeu.
   */
  canalEncarregado: base.handler(async () => {
    const aberto = Boolean(enderecoEncarregado()) && provedorConfigurado();
    return {
      aberto,
      assuntos: ASSUNTOS_TITULAR,
      limite_mensagem: LIMITE_MENSAGEM,
      envios_por_hora: LIMITE_POR_JANELA,
    };
  }),

  /**
   * POST /privacidade/falar-com-encarregado — pedido do titular de dados
   * (LGPD art. 18 e 41).
   *
   * Pública de propósito: o titular pode ser um vendedor que já apagou a conta,
   * ou alguém que nunca teve uma. Exigir login para exercer direito de titular
   * seria transformar o direito em benefício de cliente.
   *
   * Sendo pública, tem freio: o endereço de quem escreve conta no limite, e o
   * texto vai como corpo de e-mail — nunca como HTML, para não virar veículo de
   * injeção na caixa do encarregado.
   */
  falarComEncarregado: base
    .input(
      z.object({
        nome: z.string().max(120).default(""),
        email: z.string().min(3).max(200),
        assunto: z.string().max(80).default(ASSUNTOS_TITULAR[0]),
        mensagem: z.string().min(10).max(LIMITE_MENSAGEM),
      }),
    )
    .handler(async ({ input }) => {
      const encarregado = enderecoEncarregado();
      if (!encarregado || !provedorConfigurado()) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "O canal por formulário está fora do ar. Escreva direto para o e-mail da política.",
        });
      }

      const email = input.email.trim().toLowerCase();
      if (!emailValido(email)) {
        throw new ORPCError("BAD_REQUEST", { message: "Informe um e-mail válido para receber a resposta." });
      }

      const freio = registrarTentativa(email);
      if (!freio.permitido) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: `Você já enviou pedidos demais agora há pouco. Tente de novo em ${freio.minutos} min.`,
        });
      }

      // Assunto vindo do cliente é encaixado na lista conhecida: string livre no
      // assunto do e-mail é onde se injeta cabeçalho.
      const conhecido = ASSUNTOS_TITULAR.find((a) => a === input.assunto);
      const assunto: string = conhecido ?? ASSUNTOS_TITULAR[0];
      const agora = isoUtc();

      const resultado = await enviarEmail({
        para: encarregado,
        assunto: `[Titular] ${assunto}`,
        texto: textoEncarregado({
          nome: input.nome.trim(),
          email,
          assunto,
          mensagem: input.mensagem.trim(),
          quando: agora,
        }),
        responderPara: email,
      });

      if (!resultado.enviado) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: `Não foi possível registrar seu pedido agora (${resultado.motivo}). Tente de novo em alguns minutos.`,
        });
      }

      return { ok: true, recebido_em: agora, prazo_dias: PRAZO_RESPOSTA_DIAS };
    }),
};
