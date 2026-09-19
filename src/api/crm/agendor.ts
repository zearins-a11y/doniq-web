/**
 * Agendor — API v3 (https://api.agendor.com.br/v3), header `Authorization: Token <token>`.
 * É o único dos três com upsert nativo (organizations/upsert, people/upsert).
 *
 * O Agendor não tem endpoint de "nota": o histórico da conta é feito de tarefas.
 * Então a anotação do relato entra como tarefa já concluída (finished_date = agora),
 * e a próxima ação entra como tarefa em aberto com due_date.
 */

import { agoraUtc, isoUtcDe } from "./datas";
import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";
import { ErroCrm } from "./tipos";

const BASE = "https://api.agendor.com.br/v3";

const RANKING: Record<string, number> = { Quente: 5, Morna: 3, Fria: 1 };

function cabecalhos(cred: Credenciais): Record<string, string> {
  return { Authorization: `Token ${cred.token}` };
}

type Envelope<T> = { data?: T };
type ComId = { id?: number | string };

function id(v: unknown): string {
  const dado = (v as Envelope<ComId>)?.data ?? (v as ComId);
  const bruto = dado?.id;
  if (bruto === undefined || bruto === null || bruto === "") {
    throw new ErroCrm("O Agendor respondeu sem o id do registro.");
  }
  return String(bruto);
}

function comparavel(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Campos personalizados só vão quando o cliente mapeou o identificador. */
export function camposPersonalizados(
  relato: RelatoCanonico,
  mapa: Record<string, string>,
): Record<string, string> {
  const valores: Record<string, string> = {
    temperatura: relato.negocio.temperatura,
    objecao: relato.extras.objecao,
    concorrentes: relato.extras.concorrentes.join(", "),
    numeros: relato.extras.numeros.join("; "),
    visita_em: relato.extras.visitaEm,
    chave_relato: relato.chave,
  };
  const saida: Record<string, string> = {};
  for (const [canonico, identificador] of Object.entries(mapa)) {
    const valor = valores[canonico];
    if (identificador && valor) saida[identificador] = valor;
  }
  return saida;
}

/** Payload do negócio — puro, testável sem rede. */
export function corpoNegocio(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const corpo: Record<string, unknown> = {
    title: relato.negocio.titulo.slice(0, 150),
    dealStatusText: "ongoing",
    description: relato.negocio.descricao.slice(0, 2000),
    ranking: RANKING[relato.negocio.temperatura] ?? 3,
  };
  if (ctx.funilId) corpo.funnel = Number(ctx.funilId);
  if (ctx.etapaId) corpo.dealStage = Number(ctx.etapaId);
  const personalizados = camposPersonalizados(relato, ctx.mapaCampos);
  if (Object.keys(personalizados).length) corpo.customFields = personalizados;
  return corpo;
}

export function corpoPessoa(relato: RelatoCanonico, organizacaoId: string | null) {
  const corpo: Record<string, unknown> = { name: relato.pessoa.nome.slice(0, 150) };
  if (relato.pessoa.cargo) corpo.role = relato.pessoa.cargo;
  if (relato.pessoa.telefone) corpo.contact = { mobile: relato.pessoa.telefone };
  if (organizacaoId) corpo.organization = Number(organizacaoId);
  return corpo;
}

async function acharPessoaNaOrganizacao(
  cred: Credenciais,
  organizacaoId: string,
  nome: string,
): Promise<string | null> {
  const resposta = await pedir<Envelope<Array<{ id?: number; name?: string }>>>({
    url: `${BASE}/organizations/${organizacaoId}/people?per_page=100`,
    headers: cabecalhos(cred),
  });
  const alvo = comparavel(nome);
  const achado = (resposta.data ?? []).find((p) => comparavel(p.name ?? "") === alvo);
  return achado?.id ? String(achado.id) : null;
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. organização (upsert nativo por nome/cnpj)
  if (relato.organizacao.nome && !ids.organizacao) {
    const corpo = { name: relato.organizacao.nome.slice(0, 150) };
    payload.organizacao = corpo;
    ids.organizacao = id(
      await pedir({ url: `${BASE}/organizations/upsert`, metodo: "POST", headers: cabecalhos(cred), corpo }),
    );
  }

  // 2. pessoa — o upsert do Agendor só casa por cpf/e-mail, que não temos;
  // então procuramos pelo nome dentro da organização antes de criar.
  if (relato.pessoa.nome && !ids.pessoa) {
    const existente = ids.organizacao
      ? await acharPessoaNaOrganizacao(cred, ids.organizacao, relato.pessoa.nome)
      : null;
    if (existente) {
      ids.pessoa = existente;
    } else {
      const corpo = corpoPessoa(relato, ids.organizacao ?? null);
      payload.pessoa = corpo;
      ids.pessoa = id(await pedir({ url: `${BASE}/people`, metodo: "POST", headers: cabecalhos(cred), corpo }));
    }
  }

  // 3. negócio — um por relato; reenvio atualiza em vez de duplicar
  const corpoDoNegocio = corpoNegocio(relato, ctx);
  payload.negocio = corpoDoNegocio;
  if (ids.negocio) {
    await pedir({
      url: `${BASE}/deals/${ids.negocio}`,
      metodo: "PUT",
      headers: cabecalhos(cred),
      corpo: corpoDoNegocio,
    });
  } else {
    const dono = ids.organizacao
      ? `${BASE}/organizations/${ids.organizacao}/deals`
      : ids.pessoa
        ? `${BASE}/people/${ids.pessoa}/deals`
        : null;
    if (!dono) throw new ErroCrm("Relato sem empresa e sem contato — o Agendor precisa de um dos dois.");
    ids.negocio = id(
      await pedir({ url: dono, metodo: "POST", headers: cabecalhos(cred), corpo: corpoDoNegocio }),
    );
  }

  // 4. anotação = tarefa já concluída
  if (!ids.anotacao) {
    const agora = agoraUtc();
    const corpo = {
      text: relato.anotacao.texto,
      type: "VISITA",
      due_date: agora,
      finished_date: agora,
    };
    payload.anotacao = corpo;
    ids.anotacao = id(
      await pedir({
        url: `${BASE}/deals/${ids.negocio}/tasks`,
        metodo: "POST",
        headers: cabecalhos(cred),
        corpo,
      }),
    );
  }

  // 5. próxima ação = tarefa em aberto
  if (relato.tarefa && !ids.tarefa) {
    const vencimento = isoUtcDe(relato.tarefa.dataIso, relato.tarefa.hora);
    const corpo: Record<string, unknown> = { text: relato.tarefa.texto };
    if (vencimento) corpo.due_date = vencimento;
    payload.tarefa = corpo;
    ids.tarefa = id(
      await pedir({
        url: `${BASE}/deals/${ids.negocio}/tasks`,
        metodo: "POST",
        headers: cabecalhos(cred),
        corpo,
      }),
    );
  }

  return { ids, payload };
}

export const agendor: Adaptador = {
  provedor: "agendor",
  nome: "Agendor",
  rotuloToken: "Token da API (Configurações › Integrações › API)",
  ajuda: "No Agendor: Configurações › Integrações › Tokens de API. O funil e a etapa são numéricos.",

  async testar(cred) {
    await pedir({ url: `${BASE}/organizations?per_page=1`, headers: cabecalhos(cred) });
  },

  enviar(relato, ctx) {
    return emFila(`agendor:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
