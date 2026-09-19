/**
 * Moskit CRM — API v2 (https://api.moskit.com/v2).
 * https://developers.moskit.com/
 *
 * Auth: Authorization: Bearer {token}
 *
 * Fluxo:
 *   1. Upsert deal (negociação) — inclui empresa, pessoa e temperatura
 *   2. Nota com texto completo do relato
 *
 * Moskit não exige que etapa seja informada — se não vier, usa o padrão do funil.
 */

import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";


const BASE = "https://api.moskit.com/v2";

function headers(cred: Credenciais): Record<string, string> {
  return { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" };
}

function url(caminho: string) {
  return `${BASE}${caminho}`;
}

const AVALIACAO: Record<string, number> = { Quente: 4, Morna: 3, Fria: 1 };

/** Avaliação numérica do Moskit (exportada para testes). */
export { AVALIACAO };

/** Normaliza temperatura para chave do AVALIACAO (primeira maiúscula). */
function normalizarTemp(temp: string): string {
  if (!temp) return "Morna";
  return temp.charAt(0).toUpperCase() + temp.slice(1).toLowerCase();
}

/** Extrai o valor de um campo canônico do relato (exportada para testes). */
export function getCampoCanônico(relato: RelatoCanonico, canonico: string): string {
  switch (canonico) {
    case "temperatura": return relato.negocio.temperatura;
    case "objecao": return relato.extras.objecao;
    case "concorrentes": return relato.extras.concorrentes.join(", ");
    case "numeros": return relato.extras.numeros.join("; ");
    case "visita_em": return relato.extras.visitaEm;
    case "chave_relato": return relato.chave;
    default: return "";
  }
}

/** Monta o corpo do deal (para testes e reutilização). */
export function corpoDealMoskit(titulo: string, temperatura: string, etapaId?: string, funilId?: string) {
  const tempNormalizada = normalizarTemp(temperatura);
  return {
    name: titulo.slice(0, 200),
    ...(etapaId ? { stageId: etapaId } : {}),
    ...(funilId ? { pipelineId: funilId } : {}),
    probability: AVALIACAO[tempNormalizada] ?? 3,
  };
}

/** Cria ou atualiza uma negociação no Moskit. */
async function upsertDeal(relato: RelatoCanonico, ctx: ContextoEnvio, cred: Credenciais): Promise<string> {
  const temperatura = AVALIACAO[normalizarTemp(relato.negocio.temperatura)] ?? 3;

  const corpo = {
    name: relato.negocio.titulo.slice(0, 200),
    ...(ctx.etapaId ? { stageId: ctx.etapaId } : {}),
    ...(ctx.funilId ? { pipelineId: ctx.funilId } : {}),
    probability: temperatura,
    customFields: [
      // Moskit aceita campos customizados como objeto de chave-valor
      // Mapeia campos canônicos via mapaCampos (chave canônica → id do campo custom)
// eslint-disable-next-line unicorn/no-useless-spread
      Object.entries(ctx.mapaCampos).map(([canonico, campoId]) => ({
        customFieldId: campoId,
        value: getCampoCanônico(relato, canonico),
      })),
    ],
  };

  if (ctx.idsExistentes.negocio) {
    await pedir({
      url: url(`/deals/${ctx.idsExistentes.negocio}`),
      metodo: "PUT",
      headers: headers(cred),
      corpo,
    });
    return ctx.idsExistentes.negocio;
  }

  const criado = await pedir<{ id: string }>({
    url: url("/deals"),
    metodo: "POST",
    headers: headers(cred),
    corpo,
  });
  return criado.id;
}

/** Cria uma nota vinculada à negociação. */
async function criarNota(relato: RelatoCanonico, dealId: string, cred: Credenciais): Promise<string> {
  const corpo = {
    title: `Relato de visita${relato.negocio.titulo ? ` — ${relato.negocio.titulo}` : ""}`,
    description: relato.anotacao.texto,
    entityId: dealId,
    entityType: "DEAL",
  };
  const nota = await pedir<{ id: string }>({
    url: url("/notes"),
    metodo: "POST",
    headers: headers(cred),
    corpo,
  });
  return nota.id;
}

/** Cria ou associa pessoa (contact) à negociação. */
async function upsertPessoa(relato: RelatoCanonico, dealId: string, cred: Credenciais): Promise<void> {
  if (!relato.pessoa.nome) return;

  // Primeiro: criar pessoa
  const pessoaCorpo = {
    name: relato.pessoa.nome,
    ...(relato.pessoa.cargo ? { jobTitle: relato.pessoa.cargo } : {}),
    phones: relato.pessoa.telefone ? [{ phone: relato.pessoa.telefone }] : [],
  };

  const pessoa = await pedir<{ id: string }>({
    url: url("/persons"),
    metodo: "POST",
    headers: headers(cred),
    corpo: pessoaCorpo,
  });

  // Associar pessoa ao deal
  await pedir({
    url: url(`/deals/${dealId}/persons/${pessoa.id}`),
    metodo: "POST",
    headers: headers(cred),
  }).catch(() => { /* pode já estar associada */ });
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. Deal
  const dealId = await upsertDeal(relato, ctx, cred);
  ids.negocio = dealId;
  payload.deal = { id: dealId };

  // 2. Pessoa
  await upsertPessoa(relato, dealId, cred);

  // 3. Nota
  if (!ids.anotacao) {
    ids.anotacao = await criarNota(relato, dealId, cred);
    payload.nota = { id: ids.anotacao };
  }

  return { ids, payload };
}

export const moskit: Adaptador = {
  provedor: "moskit",
  nome: "Moskit CRM",
  rotuloToken: "Token da API (Settings › Integrações › API)",
  ajuda:
    "Em Moskit: Settings › Integrações › API. Copie o token. A etapa e o funil são ids numéricos — peça ao suporte se não souber onde encontrar.",

  async testar(cred) {
    await pedir({ url: url("/deals?limit=1"), headers: headers(cred) });
  },

  enviar(relato, ctx) {
    return emFila(`moskit:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
