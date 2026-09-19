/**
 * Rotas da agenda: grade por faixa de datas, compromisso marcado na mão e o
 * token do feed .ics.
 *
 * A rota antiga `relatos.agenda` (hoje / amanhã / sem data) continua no ar: o
 * app publicado usa ela, e a tela nova é que passa a chamar `agenda.faixa`.
 * Quebrar a rota velha derrubaria quem ainda não atualizou o aplicativo.
 */

import { randomBytes } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { z } from "zod";
import { calendarioIcs } from "../agenda/ics";
import {
  type EventoAgenda,
  type LinhaCompromisso,
  linkGoogle,
  paraIcs,
  selo,
  unirEventos,
} from "../agenda/eventos";
import { diasVazios, gradeDoMes, normalizarMes } from "../agenda/grade";
import { db } from "../database";
import * as schema from "../database/schema";
import { autenticado } from "../middleware/auth";
import { hojeBr, isoUtc, somarDias } from "../relato/tempo";

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
/** Teto de linhas por faixa. Um mês de vendedor pesado não passa de algumas centenas. */
const LIMITE_FAIXA = 500;

const diaSchema = z.string().regex(DIA, "Data no formato AAAA-MM-DD.");
const horaSchema = z.string().regex(HORA, "Hora no formato HH:MM.").or(z.literal(""));

type CompromissoRow = typeof schema.compromissos.$inferSelect;

function paraLinha(c: CompromissoRow): LinhaCompromisso {
  return {
    compromissoId: c.compromissoId,
    empresa: c.empresa,
    contato: c.contato,
    telefone: c.telefone,
    objetivo: c.objetivo,
    endereco: c.endereco,
    dataIso: c.dataIso,
    hora: c.hora,
    minutos: c.minutos,
    status: c.status,
    relatoId: c.relatoId,
    atualizadoEm: c.atualizadoEm,
  };
}

/** Forma do evento na API: snake_case, como todo o resto do JSON do produto. */
function paraApi(ev: EventoAgenda) {
  return {
    id: ev.id,
    origem: ev.origem,
    dia: ev.dia,
    hora: ev.hora,
    minutos: ev.minutos,
    titulo: ev.titulo,
    detalhe: ev.detalhe,
    contato: ev.contato,
    telefone: ev.telefone,
    local: ev.local,
    relato_id: ev.relatoId,
    concluido: ev.concluido,
    cancelado: ev.cancelado,
    selo: selo(ev),
    link_google: ev.dia ? linkGoogle(ev) : "",
    temperatura: ev.temperatura || "",
    objecao: ev.objecao || "",
  };
}

/** Compromisso cancelado não aparece na tela (mas continua no feed, cancelado). */
async function eventosDaFaixa(userId: string, de: string, ate: string) {
  const [relatos, compromissos] = await Promise.all([
    db
      .select()
      .from(schema.relatos)
      .where(
        and(
          eq(schema.relatos.userId, userId),
          gte(schema.relatos.dataIso, de),
          lte(schema.relatos.dataIso, ate),
        ),
      )
      .orderBy(asc(schema.relatos.dataIso), asc(schema.relatos.hora))
      .limit(LIMITE_FAIXA),
    db
      .select()
      .from(schema.compromissos)
      .where(
        and(
          eq(schema.compromissos.userId, userId),
          gte(schema.compromissos.dataIso, de),
          lte(schema.compromissos.dataIso, ate),
          ne(schema.compromissos.status, "cancelado"),
        ),
      )
      .orderBy(asc(schema.compromissos.dataIso), asc(schema.compromissos.hora))
      .limit(LIMITE_FAIXA),
  ]);

  return unirEventos(
    relatos.map((r) => ({
      relatoId: r.relatoId,
      empresa: r.empresa,
      contato: r.contato,
      telefone: r.telefone,
      proximaAcao: r.proximaAcao,
      resumo: r.resumo,
      dataIso: r.dataIso,
      hora: r.hora,
      createdAt: r.createdAt,
      temperatura: r.temperatura,
      objecao: r.objecao,
    })),
    compromissos.map(paraLinha),
  );
}

async function obterCompromisso(id: string, userId: string): Promise<CompromissoRow> {
  const [linha] = await db
    .select()
    .from(schema.compromissos)
    .where(and(eq(schema.compromissos.compromissoId, id), eq(schema.compromissos.userId, userId)));
  if (!linha) throw new ORPCError("NOT_FOUND", { message: "Compromisso não encontrado." });
  return linha;
}

/** Token do feed: 32 bytes em base64url. O segredo é a URL, então tem que doer adivinhar. */
export function gerarTokenFeed(): string {
  return randomBytes(32).toString("base64url");
}

async function feedDoUsuario(userId: string) {
  const [linha] = await db
    .select()
    .from(schema.feedsAgenda)
    .where(eq(schema.feedsAgenda.userId, userId));
  return linha ?? null;
}

export const agenda = {
  /**
   * GET /agenda/mes — grade do mês pronta para desenhar, com os eventos do
   * período da grade (inclui os dias vizinhos que aparecem na primeira e na
   * última semana; senão o dia 31 do mês passado apareceria vazio na tela).
   */
  mes: autenticado
    .input(z.object({ mes: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const hoje = hojeBr();
      let grade: ReturnType<typeof gradeDoMes>;
      try {
        grade = gradeDoMes(input.mes ? normalizarMes(input.mes) : hoje.slice(0, 7), hoje);
      } catch {
        throw new ORPCError("BAD_REQUEST", { message: "Mês inválido. Use AAAA-MM." });
      }

      const eventos = await eventosDaFaixa(
        context.usuario.userId,
        grade.inicioGrade,
        grade.fimGrade,
      );
      const ocupados = [...new Set(eventos.map((e) => e.dia))];

      return {
        hoje,
        mes: grade.mes,
        rotulo: grade.rotulo,
        primeiro_dia: grade.primeiroDia,
        ultimo_dia: grade.ultimoDia,
        semanas: grade.semanas.map((s) =>
          s.map((d) => ({
            dia: d.dia,
            numero: d.numero,
            do_mes: d.doMes,
            hoje: d.hoje,
            fim_de_semana: d.fimDeSemana,
          })),
        ),
        eventos: eventos.map(paraApi),
        dias_vazios: diasVazios(grade, ocupados, hoje),
      };
    }),

  /** GET /agenda/faixa — eventos entre duas datas. Serve à semana do celular. */
  faixa: autenticado
    .input(z.object({ de: diaSchema, ate: diaSchema }))
    .handler(async ({ input, context }) => {
      if (input.ate < input.de) {
        throw new ORPCError("BAD_REQUEST", { message: "A data final vem antes da inicial." });
      }
      const eventos = await eventosDaFaixa(context.usuario.userId, input.de, input.ate);
      return { hoje: hojeBr(), eventos: eventos.map(paraApi) };
    }),

  /**
   * GET /agenda/sem_data — visita gravada que ficou sem próxima data combinada.
   * É a lista mais valiosa da tela: dinheiro parado.
   */
  sem_data: autenticado.handler(async ({ context }) => {
    const linhas = await db
      .select()
      .from(schema.relatos)
      .where(
        and(
          eq(schema.relatos.userId, context.usuario.userId),
          eq(schema.relatos.dataIso, ""),
          eq(schema.relatos.audioIninteligivel, false),
        ),
      )
      .orderBy(asc(schema.relatos.createdAt))
      .limit(50);
    return {
      eventos: linhas.map((r) =>
        paraApi({
          id: `relato:${r.relatoId}`,
          origem: "relato",
          dia: "",
          hora: "",
          minutos: 60,
          titulo: r.empresa || r.contato || "Visita sem empresa",
          detalhe: r.proximaAcao || r.resumo || "",
          contato: r.contato,
          telefone: r.telefone,
          local: "",
          relatoId: r.relatoId,
          concluido: true,
          cancelado: false,
          atualizadoEm: r.createdAt,
          temperatura: r.temperatura || "morna",
          objecao: r.objecao || "",
        }),
      ),
    };
  }),

  /** POST /agenda/compromissos — marcar visita na mão, antes de existir relato. */
  criar: autenticado
    .input(
      z.object({
        empresa: z.string().max(200),
        contato: z.string().max(200).optional(),
        telefone: z.string().max(60).optional(),
        objetivo: z.string().max(500).optional(),
        endereco: z.string().max(300).optional(),
        data_iso: diaSchema,
        hora: horaSchema.optional(),
        minutos: z.number().int().min(15).max(600).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const empresa = input.empresa.trim();
      if (!empresa) throw new ORPCError("BAD_REQUEST", { message: "Diga para quem é a visita." });

      const agora = isoUtc();
      const linha = {
        compromissoId: `cmp_${randomBytes(6).toString("hex")}`,
        userId: context.usuario.userId,
        empresa,
        contato: input.contato?.trim() ?? "",
        telefone: input.telefone?.trim() ?? "",
        objetivo: input.objetivo?.trim() ?? "",
        endereco: input.endereco?.trim() ?? "",
        dataIso: input.data_iso,
        hora: input.hora ?? "",
        minutos: input.minutos ?? 60,
        status: "aberto",
        relatoId: "",
        criadoEm: agora,
        atualizadoEm: agora,
      } satisfies CompromissoRow;

      await db.insert(schema.compromissos).values(linha);
      return paraApi(unirEventos([], [paraLinha(linha)])[0]!);
    }),

  /** PATCH /agenda/compromissos/{id} */
  editar: autenticado
    .input(
      z.object({
        compromisso_id: z.string(),
        mudancas: z.object({
          empresa: z.string().max(200).nullish(),
          contato: z.string().max(200).nullish(),
          telefone: z.string().max(60).nullish(),
          objetivo: z.string().max(500).nullish(),
          endereco: z.string().max(300).nullish(),
          data_iso: diaSchema.nullish(),
          hora: horaSchema.nullish(),
          minutos: z.number().int().min(15).max(600).nullish(),
          status: z.enum(["aberto", "feito", "cancelado"]).nullish(),
        }),
      }),
    )
    .handler(async ({ input, context }) => {
      const atual = await obterCompromisso(input.compromisso_id, context.usuario.userId);
      const m = input.mudancas;
      const novo: CompromissoRow = {
        ...atual,
        empresa: m.empresa?.trim() ?? atual.empresa,
        contato: m.contato?.trim() ?? atual.contato,
        telefone: m.telefone?.trim() ?? atual.telefone,
        objetivo: m.objetivo?.trim() ?? atual.objetivo,
        endereco: m.endereco?.trim() ?? atual.endereco,
        dataIso: m.data_iso ?? atual.dataIso,
        hora: m.hora ?? atual.hora,
        minutos: m.minutos ?? atual.minutos,
        status: m.status ?? atual.status,
        atualizadoEm: isoUtc(),
      };
      await db
        .update(schema.compromissos)
        .set(novo)
        .where(eq(schema.compromissos.compromissoId, atual.compromissoId));
      return paraApi(unirEventos([], [paraLinha(novo)])[0]!);
    }),

  /**
   * DELETE /agenda/compromissos/{id} — cancela em vez de apagar. A linha precisa
   * sobreviver para o feed mandar STATUS:CANCELLED e o evento sumir de quem já
   * sincronizou; apagar deixaria o compromisso fantasma no Google do vendedor.
   */
  cancelar: autenticado
    .input(z.object({ compromisso_id: z.string() }))
    .handler(async ({ input, context }) => {
      const atual = await obterCompromisso(input.compromisso_id, context.usuario.userId);
      await db
        .update(schema.compromissos)
        .set({ status: "cancelado", atualizadoEm: isoUtc() })
        .where(eq(schema.compromissos.compromissoId, atual.compromissoId));
      return { ok: true };
    }),

  /**
   * GET /agenda/ics_evento — o `.ics` de uma visita só, para o botão "adicionar
   * à agenda". Existe porque o feed assinado leva de 8 a 24 horas para o Google
   * reler: quem acabou de marcar quer o evento agora. É cópia de mão única — se
   * a visita mudar depois, este evento não muda junto.
   */
  ics_evento: autenticado
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const [origem, ...resto] = input.id.split(":");
      const id = resto.join(":");
      let evento: EventoAgenda | undefined;

      if (origem === "compromisso") {
        evento = unirEventos([], [paraLinha(await obterCompromisso(id, userId))])[0];
      } else if (origem === "relato") {
        const [r] = await db
          .select()
          .from(schema.relatos)
          .where(and(eq(schema.relatos.relatoId, id), eq(schema.relatos.userId, userId)));
        if (!r) throw new ORPCError("NOT_FOUND", { message: "Visita não encontrada." });
        evento = unirEventos(
          [
            {
              relatoId: r.relatoId,
              empresa: r.empresa,
              contato: r.contato,
              telefone: r.telefone,
              proximaAcao: r.proximaAcao,
              resumo: r.resumo,
              dataIso: r.dataIso,
              hora: r.hora,
              createdAt: r.createdAt,
            },
          ],
          [],
        )[0];
      }
      if (!evento) throw new ORPCError("BAD_REQUEST", { message: "Evento desconhecido." });
      if (!evento.dia) {
        throw new ORPCError("BAD_REQUEST", { message: "Combine uma data antes de mandar pra agenda." });
      }
      return {
        nome: `visita-${evento.dia}.ics`,
        arquivo: calendarioIcs([paraIcs(evento)], { nome: evento.titulo, ttlHoras: 4 }),
      };
    }),

  /**
   * GET /agenda/feed — estado do link de sincronização. `criar` é explícito: o
   * token só nasce quando o vendedor pede, e não para todo mundo que abre a tela.
   */
  feed: autenticado.handler(async ({ context }) => {
    const linha = await feedDoUsuario(context.usuario.userId);
    return {
      existe: Boolean(linha),
      token: linha?.token ?? "",
      criado_em: linha?.criadoEm ?? "",
      ultimo_acesso_em: linha?.ultimoAcessoEm ?? "",
      acessos: linha?.acessos ?? 0,
    };
  }),

  /** POST /agenda/feed — cria o link, ou troca o que existe (revogando o antigo). */
  gerar_feed: autenticado
    .input(z.object({ trocar: z.boolean().optional() }))
    .handler(async ({ input, context }) => {
      const userId = context.usuario.userId;
      const atual = await feedDoUsuario(userId);
      if (atual && !input.trocar) {
        return { token: atual.token, criado_em: atual.criadoEm };
      }
      // Troca é revogação: apaga a linha velha, cria outra. Não existe "dois
      // links válidos" — quem tinha o antigo perde o acesso na hora.
      if (atual) await db.delete(schema.feedsAgenda).where(eq(schema.feedsAgenda.userId, userId));
      const linha = {
        token: gerarTokenFeed(),
        userId,
        ultimoAcessoEm: "",
        acessos: 0,
        criadoEm: isoUtc(),
      };
      await db.insert(schema.feedsAgenda).values(linha);
      return { token: linha.token, criado_em: linha.criadoEm };
    }),

  /** DELETE /agenda/feed — desliga a sincronização de vez. */
  revogar_feed: autenticado.handler(async ({ context }) => {
    await db.delete(schema.feedsAgenda).where(eq(schema.feedsAgenda.userId, context.usuario.userId));
    return { ok: true };
  }),
};

/**
 * Usado pela rota pública do `.ics` (fora do oRPC, em `api/index.ts`): resolve o
 * token, marca o acesso e devolve os eventos da janela do feed.
 *
 * A janela é passado curto + futuro longo: calendário de vendedor não precisa
 * carregar o ano passado, e feed gordo é feed que o Google baixa devagar.
 */
export async function eventosDoFeed(token: string, diasAtras = 30, diasFrente = 180) {
  const [linha] = await db.select().from(schema.feedsAgenda).where(eq(schema.feedsAgenda.token, token));
  if (!linha) return null;

  const hoje = hojeBr();
  const de = somarDias(hoje, -diasAtras);
  const ate = somarDias(hoje, diasFrente);

  const [eventos, cancelados] = await Promise.all([
    eventosDaFaixa(linha.userId, de, ate),
    db
      .select()
      .from(schema.compromissos)
      .where(
        and(
          eq(schema.compromissos.userId, linha.userId),
          eq(schema.compromissos.status, "cancelado"),
          gte(schema.compromissos.dataIso, de),
          lte(schema.compromissos.dataIso, ate),
        ),
      )
      .limit(LIMITE_FAIXA),
  ]);

  await db
    .update(schema.feedsAgenda)
    .set({ ultimoAcessoEm: isoUtc(), acessos: linha.acessos + 1 })
    .where(eq(schema.feedsAgenda.token, token));

  return {
    userId: linha.userId,
    // Cancelado entra no fim, com o status que faz o cliente de calendário
    // remover o evento que ele já tinha baixado.
    eventos: [...eventos, ...unirEventos([], cancelados.map(paraLinha))],
  };
}
