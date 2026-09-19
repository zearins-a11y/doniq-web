/**
 * Equipe e painel do gestor.
 *
 * Duas regras mandam neste arquivo:
 *
 *  1. Permissão não se decide aqui. Quem decide é `equipe/papeis.ts`, que é puro
 *     e testado. Aqui só se busca o membro e se obedece ao veredito.
 *  2. O gestor lê a ficha, nunca a fala. Todo relato de outra pessoa sai por
 *     `fichasParaGestor()`, que é allowlist. Nenhuma rota deste arquivo devolve
 *     `transcricao` ou `evidencia`.
 */

import { createHmac, randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { segredo } from "../auth-dispositivo";
import { sincronizarAssentos } from "../cobranca/assentos";
import { db } from "../database";
import * as schema from "../database/schema";
import { aceitarConviteAtomico } from "../equipe/aceitar-convite";
import { fichasParaGestor } from "../equipe/ficha-gestor";
import {
  type Membro,
  type Papel,
  papelValido,
  podeConvidar,
  podeRemover,
  podeSair,
  podeVerPainel,
} from "../equipe/papeis";
import { autenticado } from "../middleware/auth";
import { diaDoRelato, montarPainel } from "../painel/indicadores";
import { montarResumoSemanal } from "../painel/resumo-semanal";
import { hojeBr, isoUtc, somarDias } from "../relato/tempo";
import { baseDaAplicacao } from "../services/app-url";
import { enviarEmail, modoEmail, textoConvite } from "../services/email";
import { paraApi } from "./relatos";

export const VALIDADE_CONVITE_DIAS = 14;
export const LIMITE_RELATOS_PAINEL = 2000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Mesmo esquema da tabela `sessions`: quem lê o banco não aceita convite alheio. */
function hashToken(token: string): string {
  return createHmac("sha256", segredo()).update(token).digest("hex");
}

function id(prefixo: string): string {
  return `${prefixo}_${randomBytes(6).toString("hex")}`;
}

type MembroRow = typeof schema.membros.$inferSelect;
type EquipeRow = typeof schema.equipes.$inferSelect;

async function membroDe(userId: string): Promise<MembroRow | null> {
  const [m] = await db.select().from(schema.membros).where(eq(schema.membros.userId, userId));
  return m ?? null;
}

/** Membro + equipe, ou erro. Usado por toda rota que exige já estar numa equipe. */
async function contexto(userId: string): Promise<{ membro: MembroRow; equipe: EquipeRow; papel: Papel }> {
  const membro = await membroDe(userId);
  if (!membro) throw new ORPCError("NOT_FOUND", { message: "Você ainda não faz parte de uma equipe." });
  const [equipe] = await db
    .select()
    .from(schema.equipes)
    .where(eq(schema.equipes.equipeId, membro.equipeId));
  if (!equipe) throw new ORPCError("NOT_FOUND", { message: "Equipe não encontrada." });
  return { membro, equipe, papel: papelValido(membro.papel) };
}

function comoMembro(m: MembroRow): Membro {
  return { userId: m.userId, papel: papelValido(m.papel) };
}

/** Linhas da equipe com nome e e-mail de cada conta. */
async function pessoasDaEquipe(equipeId: string) {
  const linhas = await db.select().from(schema.membros).where(eq(schema.membros.equipeId, equipeId));
  const ids = linhas.map((l) => l.userId);
  const contas = ids.length
    ? await db.select().from(schema.users).where(inArray(schema.users.userId, ids))
    : [];
  const porId = new Map(contas.map((c) => [c.userId, c]));
  return linhas.map((l) => {
    const conta = porId.get(l.userId);
    return {
      user_id: l.userId,
      nome: conta?.nome ?? "",
      email: conta?.email ?? "",
      papel: papelValido(l.papel),
      entrou_em: l.entrouEm,
    };
  });
}

/**
 * Painel da equipe, calculado uma vez e usado por quem precisar.
 *
 * Existe porque a tela e o e-mail precisam do MESMO número. Duas consultas
 * parecidas em dois lugares divergem na primeira mudança de regra, e aí o gestor
 * lê "3 visitas" no painel e "5 visitas" no e-mail — e passa a não confiar em
 * nenhum dos dois.
 *
 * A ordem é sagrada: allowlist primeiro (`fichasParaGestor`), conta depois.
 * Indicador novo que precise de campo escondido quebra o teste em vez de vazar a
 * fala do vendedor junto com o número.
 */
async function anexarCrmStatus(linhas: (typeof schema.relatos.$inferSelect)[]) {
  const relatoIds = linhas.map((l) => l.relatoId);
  if (!relatoIds.length) {
    return linhas.map((l) => ({ ...paraApi(l), crm_status: [] }));
  }

  const syncRows = await db
    .select({
      relatoId: schema.sincronizacoes.relatoId,
      provedor: schema.sincronizacoes.provedor,
      status: schema.sincronizacoes.status,
      erro: schema.sincronizacoes.erro,
      atualizadoEm: schema.sincronizacoes.atualizadoEm,
    })
    .from(schema.sincronizacoes)
    .where(inArray(schema.sincronizacoes.relatoId, relatoIds));

  const syncMap = new Map<
    string,
    { provedor: string; status: string; erro?: string; atualizado_em?: string }[]
  >();
  for (const s of syncRows) {
    const lista = syncMap.get(s.relatoId) || [];
    lista.push({
      provedor: s.provedor,
      status: s.status,
      erro: s.erro || undefined,
      atualizado_em: s.atualizadoEm,
    });
    syncMap.set(s.relatoId, lista);
  }

  return linhas.map((l) => ({
    ...paraApi(l),
    crm_status: syncMap.get(l.relatoId) || [],
  }));
}

export async function calcularPainel(userId: string, hojeInformado?: string) {
  const membro = await membroDe(userId);

  // Caso único (autônomo ou gestor solo sem equipe criada)
  if (!membro) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.userId, userId));
    const linhas = await db
      .select()
      .from(schema.relatos)
      .where(eq(schema.relatos.userId, userId))
      .orderBy(desc(schema.relatos.createdAt))
      .limit(LIMITE_RELATOS_PAINEL);

    const fichasCruas = await anexarCrmStatus(linhas);
    const fichas = fichasParaGestor(
      fichasCruas as unknown as Record<string, unknown>[],
    );
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(hojeInformado ?? "") ? (hojeInformado as string) : hojeBr();
    const nome = user?.nome || user?.email || "Você";

    const painel = montarPainel(
      fichas,
      [{ user_id: userId, nome }],
      dia,
    );

    return {
      equipe: {
        equipeId: "solo",
        nome: "Operação Individual",
        donoUserId: userId,
        criadoEm: user?.criadoEm || hojeBr(),
      },
      papel: "gestor" as Papel,
      pessoas: [
        {
          user_id: userId,
          nome,
          email: user?.email || "",
          papel: "gestor" as Papel,
          entrou_em: user?.criadoEm || hojeBr(),
        },
      ],
      fichas,
      painel,
      modo_solo: true,
    };
  }

  const { equipe: eq_, papel } = await contexto(userId);
  if (!podeVerPainel(papel)) {
    throw new ORPCError("FORBIDDEN", { message: "Só o gestor vê o painel da equipe." });
  }

  const pessoas = await pessoasDaEquipe(eq_.equipeId);
  const ids = pessoas.map((p) => p.user_id);
  // Nunca deixar a lista vazia chegar ao IN: `IN ()` costuma virar "todos" por acidente.
  if (!ids.length) ids.push(userId);

  const linhas = await db
    .select()
    .from(schema.relatos)
    .where(inArray(schema.relatos.userId, ids))
    .orderBy(desc(schema.relatos.createdAt))
    .limit(LIMITE_RELATOS_PAINEL);

  const fichasCruas = await anexarCrmStatus(linhas);
  const fichas = fichasParaGestor(
    fichasCruas as unknown as Record<string, unknown>[],
  );
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(hojeInformado ?? "") ? (hojeInformado as string) : hojeBr();

  const painel = montarPainel(
    fichas,
    pessoas.map((p) => ({ user_id: p.user_id, nome: p.nome || p.email })),
    dia,
  );

  return { equipe: eq_, papel, pessoas, fichas, painel, modo_solo: false };
}

function conviteParaApi(c: typeof schema.convites.$inferSelect) {
  return {
    convite_id: c.conviteId,
    email: c.email,
    papel: papelValido(c.papel),
    status: c.status,
    criado_em: c.criadoEm,
    expira_em: c.expiraEm,
    email_enviado: c.emailEnviado === "sim",
  };
}

export const equipe = {
  /** POST /equipe — cria a equipe e coloca quem criou como gestor e dono. */
  criar: autenticado
    .input(z.object({ nome: z.string().max(120).default("") }))
    .handler(async ({ input, context }) => {
      const usuario = context.usuario;
      if (await membroDe(usuario.userId)) {
        throw new ORPCError("CONFLICT", {
          message: "Sua conta já está em uma equipe. Saia dela antes de criar outra.",
        });
      }
      const agora = isoUtc();
      const equipeId = id("eqp");
      const nome = input.nome.trim() || `Equipe de ${usuario.nome || usuario.email}`;

      await db.insert(schema.equipes).values({
        equipeId,
        nome,
        donoUserId: usuario.userId,
        criadoEm: agora,
      });
      await db.insert(schema.membros).values({
        membroId: id("mbr"),
        equipeId,
        userId: usuario.userId,
        papel: "gestor",
        entrouEm: agora,
      });

      return { equipe_id: equipeId, nome, papel: "gestor" as Papel };
    }),

  /** GET /equipe/minha — equipe, papel de quem pergunta e quem está dentro. */
  minha: autenticado.handler(async ({ context }) => {
    const membro = await membroDe(context.usuario.userId);
    if (!membro) return { equipe: null, papel: null, pessoas: [], convites: [] };

    const { equipe: eq_, papel } = await contexto(context.usuario.userId);
    const pessoas = await pessoasDaEquipe(eq_.equipeId);

    // Convite pendente é assunto de gestor. Vendedor não precisa ver a fila.
    const convites = podeConvidar(papel)
      ? (
          await db
            .select()
            .from(schema.convites)
            .where(eq(schema.convites.equipeId, eq_.equipeId))
            .orderBy(desc(schema.convites.criadoEm))
        ).map(conviteParaApi)
      : [];

    return {
      equipe: { equipe_id: eq_.equipeId, nome: eq_.nome, dono_user_id: eq_.donoUserId },
      papel,
      pessoas,
      convites,
    };
  }),

  /**
   * POST /equipe/convidar — cria o convite e devolve o link.
   *
   * O link volta sempre, mesmo quando o e-mail sai. Sem provedor configurado,
   * `email_enviado` é falso e a tela mostra o link para o gestor mandar no
   * WhatsApp. Não existe caminho em que o convite exista e ninguém consiga chegar nele.
   */
  convidar: autenticado
    .input(
      z.object({
        email: z.string().min(3).max(200),
        papel: z.string().max(20).default("vendedor"),
      }),
    )
    .handler(async ({ input, context }) => {
      const { equipe: eq_, papel } = await contexto(context.usuario.userId);
      if (!podeConvidar(papel)) {
        throw new ORPCError("FORBIDDEN", { message: "Só o gestor pode convidar alguém." });
      }

      const email = input.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw new ORPCError("BAD_REQUEST", { message: "E-mail inválido." });

      // Quem já está em alguma equipe não pode ser convidado: uma conta, uma equipe.
      const [conta] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      if (conta && (await membroDe(conta.userId))) {
        throw new ORPCError("CONFLICT", { message: "Esta pessoa já está em uma equipe." });
      }

      const token = randomBytes(24).toString("base64url");
      const conviteId = id("cvt");
      const agora = isoUtc();
      const papelConvidado = papelValido(input.papel);

      await db.insert(schema.convites).values({
        conviteId,
        equipeId: eq_.equipeId,
        email,
        papel: papelConvidado,
        tokenHash: hashToken(token),
        status: "pendente",
        criadoPor: context.usuario.userId,
        criadoEm: agora,
        expiraEm: `${somarDias(hojeBr(), VALIDADE_CONVITE_DIAS)}T23:59:59Z`,
        aceitoEm: "",
        emailEnviado: "nao",
      });

      const link = `${baseDaAplicacao()}/convite/${token}`;

      const resultado = await enviarEmail({
        para: email,
        assunto: `${context.usuario.nome || "Seu gestor"} te convidou para o doniq`,
        texto: textoConvite({
          nomeQuemConvida: context.usuario.nome,
          nomeEquipe: eq_.nome,
          link,
          diasValidade: VALIDADE_CONVITE_DIAS,
        }),
      });
      if (resultado.enviado) {
        await db
          .update(schema.convites)
          .set({ emailEnviado: "sim" })
          .where(eq(schema.convites.conviteId, conviteId));
      }

      return {
        convite_id: conviteId,
        email,
        papel: papelConvidado,
        link,
        token,
        email_enviado: resultado.enviado,
        motivo_email: resultado.motivo,
        /**
         * A tela precisa dos dois para não mentir. Enviado + desviado significa
         * "saiu, mas foi para a caixa de teste" — dizer só "convite enviado"
         * faria o gestor esperar um vendedor que não recebeu nada.
         */
        email_desviado: resultado.desviado,
        email_modo: resultado.modo,
        expira_em_dias: VALIDADE_CONVITE_DIAS,
      };
    }),

  /** POST /equipe/revogar-convite */
  revogarConvite: autenticado
    .input(z.object({ convite_id: z.string().max(64) }))
    .handler(async ({ input, context }) => {
      const { equipe: eq_, papel } = await contexto(context.usuario.userId);
      if (!podeConvidar(papel)) {
        throw new ORPCError("FORBIDDEN", { message: "Só o gestor mexe nos convites." });
      }
      const [convite] = await db
        .select()
        .from(schema.convites)
        .where(
          and(
            eq(schema.convites.conviteId, input.convite_id),
            eq(schema.convites.equipeId, eq_.equipeId),
          ),
        );
      if (!convite) throw new ORPCError("NOT_FOUND", { message: "Convite não encontrado." });
      if (convite.status === "aceito") {
        throw new ORPCError("CONFLICT", {
          message: "Este convite já foi aceito. Remova a pessoa da equipe.",
        });
      }
      await db
        .update(schema.convites)
        .set({ status: "revogado" })
        .where(eq(schema.convites.conviteId, convite.conviteId));
      return { ok: true };
    }),

  /**
   * GET /equipe/convite — o que o convidado vê antes de decidir.
   * Exige login porque aceitar precisa de conta: quem abre o link sem conta faz
   * o login primeiro e volta para esta tela com o token na URL.
   */
  verConvite: autenticado
    .input(z.object({ token: z.string().min(10).max(200) }))
    .handler(async ({ input }) => {
      const [convite] = await db
        .select()
        .from(schema.convites)
        .where(eq(schema.convites.tokenHash, hashToken(input.token.trim())));
      if (!convite) throw new ORPCError("NOT_FOUND", { message: "Convite não encontrado." });

      const [eq_] = await db
        .select()
        .from(schema.equipes)
        .where(eq(schema.equipes.equipeId, convite.equipeId));
      return {
        email: convite.email,
        papel: papelValido(convite.papel),
        status: convite.status,
        expirado: convite.expiraEm < isoUtc(),
        equipe_nome: eq_?.nome ?? "",
      };
    }),

  /** POST /equipe/aceitar — entra na equipe usando o token do link. */
  aceitar: autenticado
    .input(z.object({ token: z.string().min(10).max(200) }))
    .handler(async ({ input, context }) => {
      const usuario = context.usuario;
      const agora = isoUtc();
      const resultado = await aceitarConviteAtomico({
        tokenHash: hashToken(input.token.trim()),
        userId: usuario.userId,
        email: usuario.email,
        agora,
        membroId: id("mbr"),
      });
      if (!resultado.ok) {
        if (resultado.motivo === "nao_encontrado") {
          throw new ORPCError("NOT_FOUND", { message: "Convite não encontrado." });
        }
        if (resultado.motivo === "email_divergente") {
          throw new ORPCError("FORBIDDEN", {
            message: "Este convite foi enviado para outra conta.",
          });
        }
        if (resultado.motivo === "expirado") {
          throw new ORPCError("CONFLICT", {
            message: "Este convite venceu. Peça outro ao gestor.",
          });
        }
        if (resultado.motivo === "ja_membro") {
          throw new ORPCError("CONFLICT", { message: "Sua conta já está em uma equipe." });
        }
        throw new ORPCError("CONFLICT", {
          message: "Este convite já foi usado ou cancelado.",
        });
      }
      const convite = resultado.convite;

      const [eq_] = await db
        .select()
        .from(schema.equipes)
        .where(eq(schema.equipes.equipeId, convite.equipeId));
      // A cobrança é efeito posterior ao commit: uma falha no provedor não
      // desfaz a entrada já confirmada no banco.
      await sincronizarAssentos(convite.equipeId);
      return {
        equipe_id: convite.equipeId,
        equipe_nome: eq_?.nome ?? "",
        papel: papelValido(convite.papel),
      };
    }),

  /**
   * POST /equipe/remover — tira alguém da equipe.
   * Os relatos da pessoa continuam sendo dela: sair da equipe não transfere dados.
   */
  remover: autenticado
    .input(z.object({ user_id: z.string().max(64) }))
    .handler(async ({ input, context }) => {
      const { membro, equipe: eq_ } = await contexto(context.usuario.userId);
      const veredito = podeRemover(comoMembro(membro), input.user_id, {
        equipeId: eq_.equipeId,
        donoUserId: eq_.donoUserId,
      });
      if (!veredito.ok) throw new ORPCError("FORBIDDEN", { message: veredito.motivo });

      const alvo = await membroDe(input.user_id);
      if (!alvo || alvo.equipeId !== eq_.equipeId) {
        throw new ORPCError("NOT_FOUND", { message: "Esta pessoa não está na sua equipe." });
      }
      await db.delete(schema.membros).where(eq(schema.membros.membroId, alvo.membroId));
      // Vendedor removido deixa de ser cobrado no mesmo instante, proporcional.
      await sincronizarAssentos(eq_.equipeId);
      return { ok: true };
    }),

  /** POST /equipe/sair */
  sair: autenticado.handler(async ({ context }) => {
    const { membro, equipe: eq_ } = await contexto(context.usuario.userId);
    const veredito = podeSair(comoMembro(membro), {
      equipeId: eq_.equipeId,
      donoUserId: eq_.donoUserId,
    });
    if (!veredito.ok) throw new ORPCError("FORBIDDEN", { message: veredito.motivo });
    await db.delete(schema.membros).where(eq(schema.membros.membroId, membro.membroId));
    await sincronizarAssentos(eq_.equipeId);
    return { ok: true };
  }),

  /**
   * GET /equipe/painel — os três indicadores que o gestor pediu.
   *
   * A ordem importa: primeiro a allowlist, depois a conta. Assim, se algum
   * indicador novo precisar de um campo escondido, o teste quebra em vez de o
   * campo vazar junto com o número.
   */
  painel: autenticado
    .input(z.object({ hoje: z.string().max(10).optional() }).default({}))
    .handler(async ({ input, context }) => {
      const { equipe: eq_, painel, fichas, modo_solo } = await calcularPainel(context.usuario.userId, input.hoje);

      return {
        equipe_nome: eq_.nome,
        modo_solo: Boolean(modo_solo),
        ...painel,
        /**
         * Últimas fichas da equipe, já sem transcrição e sem evidência.
         * `dia_visita` vem calculado aqui de propósito: é `created_at` convertido
         * para o fuso do vendedor. Deixar a conversão para o navegador fazia a
         * visita gravada às 22h aparecer como "amanhã" na tela do gestor.
         */
        ultimas: fichas.map((f) => ({ ...f, dia_visita: diaDoRelato(f) })).slice(0, 30),
      };
    }),

  /**
   * POST /equipe/resumo-semanal — manda para o próprio gestor, por e-mail, o
   * resumo da semana da equipe.
   *
   * Sob demanda, e não agendado, por honestidade de infraestrutura: não existe
   * agendador nesta hospedagem, e um cron improvisado dentro do processo web
   * morre no primeiro reinício sem avisar ninguém. O botão entrega o valor hoje;
   * o envio automático entra junto com o deploy que tiver cron de verdade.
   *
   * Vai sempre para o e-mail da conta do gestor, nunca para um endereço vindo
   * do cliente: rota autenticada que aceita destinatário arbitrário é relay de
   * spam com login.
   */
  resumoSemanal: autenticado
    .input(z.object({ hoje: z.string().max(10).optional() }).default({}))
    .handler(async ({ input, context }) => {
      const { equipe: eq_, papel, painel } = await calcularPainel(context.usuario.userId, input.hoje);
      if (!podeVerPainel(papel)) {
        throw new ORPCError("FORBIDDEN", { message: "Só o gestor recebe o resumo da equipe." });
      }

      const destinatario = (context.usuario.email || "").trim();
      if (!destinatario) {
        throw new ORPCError("BAD_REQUEST", { message: "Sua conta não tem e-mail cadastrado." });
      }

      const resumo = montarResumoSemanal({
        painel,
        nomeEquipe: eq_.nome,
        linkPainel: baseDaAplicacao() ? `${baseDaAplicacao()}/equipe` : "",
      });

      const resultado = await enviarEmail({
        para: destinatario,
        assunto: resumo.assunto,
        texto: resumo.texto,
      });

      return {
        enviado: resultado.enviado,
        motivo: resultado.motivo,
        desviado: resultado.desviado,
        modo: resultado.modo,
        para: destinatario,
        assunto: resumo.assunto,
        /** O corpo volta para a tela mostrar o resumo mesmo com o provedor desligado. */
        texto: resumo.texto,
      };
    }),

  /** GET /equipe/estado-email — o que a tela pode prometer sobre envio. */
  estadoEmail: autenticado.handler(async () => {
    const modo = modoEmail();
    return {
      modo,
      envia: modo !== "desligado",
      /** Em teste, tudo é desviado para a caixa de quem configurou o ambiente. */
      desvia: modo === "teste",
    };
  }),
};
