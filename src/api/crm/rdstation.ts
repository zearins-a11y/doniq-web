/**
 * RD Station CRM — API v1 (https://crm.rdstation.com/api/v1).
 * O token vai na query string (`?token=`), então nada de URL em log: `pedir`
 * só registra mensagens, e o payload guardado no banco não inclui a URL.
 *
 * A criação de negociação já aceita organização e contato no mesmo POST, o que
 * evita chamadas extras. Reenvio atualiza a negociação (PUT /deals/{id}).
 */

import { isoComOffsetBr } from "./datas";
import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";
import { ErroCrm } from "./tipos";

const BASE = "https://crm.rdstation.com/api/v1";

const AVALIACAO: Record<string, number> = { Quente: 3, Morna: 2, Fria: 1 };

function url(caminho: string, cred: Credenciais): string {
  return `${BASE}${caminho}${caminho.includes("?") ? "&" : "?"}token=${encodeURIComponent(cred.token)}`;
}

type ComId = { id?: string; _id?: string };

function id(resposta: unknown): string {
  const dado = resposta as ComId;
  const bruto = dado?.id ?? dado?._id;
  if (!bruto) throw new ErroCrm("O RD Station CRM respondeu sem o id do registro.");
  return String(bruto);
}

/** Campos personalizados: `[{ custom_field_id, value }]`, só os que o cliente mapeou. */
export function camposPersonalizados(relato: RelatoCanonico, mapa: Record<string, string>) {
  const valores: Record<string, string> = {
    temperatura: relato.negocio.temperatura,
    objecao: relato.extras.objecao,
    concorrentes: relato.extras.concorrentes.join(", "),
    numeros: relato.extras.numeros.join("; "),
    visita_em: relato.extras.visitaEm,
    chave_relato: relato.chave,
  };
  const saida: { custom_field_id: string; value: string }[] = [];
  for (const [canonico, campoId] of Object.entries(mapa)) {
    const valor = valores[canonico];
    if (campoId && valor) saida.push({ custom_field_id: campoId, value: valor });
  }
  return saida;
}

/** Payload de criação da negociação — puro. */
export function corpoNegociacao(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const negociacao: Record<string, unknown> = {
    name: relato.negocio.titulo.slice(0, 200),
    rating: AVALIACAO[relato.negocio.temperatura] ?? 2,
  };
  if (ctx.etapaId) negociacao.deal_stage_id = ctx.etapaId;
  if (relato.extras.visitaEm) negociacao.prediction_date = relato.extras.visitaEm;

  const personalizados = camposPersonalizados(relato, ctx.mapaCampos);
  if (personalizados.length) negociacao.deal_custom_fields = personalizados;

  const corpo: Record<string, unknown> = { deal: negociacao };
  if (relato.organizacao.nome) corpo.organization = { name: relato.organizacao.nome };
  if (relato.pessoa.nome) {
    corpo.contacts = [
      {
        name: relato.pessoa.nome,
        title: relato.pessoa.cargo || undefined,
        phones: relato.pessoa.telefone ? [{ phone: relato.pessoa.telefone }] : undefined,
      },
    ];
  }
  corpo.deal_source = { name: "Relato de Visita" };
  return corpo;
}

/** Tarefa do RD CRM: data e hora separadas, no fuso da conta. */
export function corpoTarefa(relato: RelatoCanonico, negociacaoId: string) {
  if (!relato.tarefa) return null;
  const corpo: Record<string, unknown> = {
    task: {
      type: "task",
      subject: relato.tarefa.texto.slice(0, 200),
      deal_id: negociacaoId,
      ...(relato.tarefa.dataIso ? { date: relato.tarefa.dataIso } : {}),
      ...(relato.tarefa.hora ? { hour: relato.tarefa.hora } : {}),
    },
  };
  return corpo;
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. negociação (cria junto empresa e contato)
  const corpo = corpoNegociacao(relato, ctx);
  payload.negocio = corpo;
  if (ids.negocio) {
    await pedir({ url: url(`/deals/${ids.negocio}`, cred), metodo: "PUT", corpo });
  } else {
    const criada = await pedir<Record<string, unknown>>({ url: url("/deals", cred), metodo: "POST", corpo });
    ids.negocio = id(criada);
    const organizacao = criada.organization as ComId | undefined;
    if (organizacao?.id ?? organizacao?._id) ids.organizacao = String(organizacao.id ?? organizacao._id);
  }

  // 2. anotação na negociação
  if (!ids.anotacao) {
    const corpoAnotacao = {
      annotation: {
        text: relato.anotacao.texto,
        deal_id: ids.negocio,
        date: isoComOffsetBr(relato.extras.visitaEm) || undefined,
      },
    };
    payload.anotacao = corpoAnotacao;
    ids.anotacao = id(
      await pedir({ url: url("/annotations", cred), metodo: "POST", corpo: corpoAnotacao }),
    );
  }

  // 3. tarefa da próxima ação
  const corpoDaTarefa = corpoTarefa(relato, ids.negocio);
  if (corpoDaTarefa && !ids.tarefa) {
    payload.tarefa = corpoDaTarefa;
    ids.tarefa = id(await pedir({ url: url("/tasks", cred), metodo: "POST", corpo: corpoDaTarefa }));
  }

  return { ids, payload };
}

export const rdstation: Adaptador = {
  provedor: "rdstation",
  nome: "RD Station CRM",
  rotuloToken: "Token da instância (Configurações › Integrações › API)",
  ajuda:
    "No RD Station CRM: Configurações › Integrações › API. A etapa é o id do deal_stage do funil que deve receber os relatos.",

  async testar(cred) {
    await pedir({ url: url("/token/check", cred) });
  },

  enviar(relato, ctx) {
    return emFila(`rdstation:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
