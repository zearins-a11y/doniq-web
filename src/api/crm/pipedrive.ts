/**
 * Pipedrive — base https://api.pipedrive.com, header `x-api-token`.
 *
 * Particularidades que ditam o código:
 *  - a API v1 saiu de suporte em 31/07/2026, então organizações, pessoas,
 *    negócios e atividades vão todos por `/api/v2`;
 *  - notas nunca ganharam versão 2: `POST /api/v1/notes` é a única chamada v1
 *    daqui junto de `/api/v1/activityTypes` e `/api/v1/users/me`, e é proposital
 *    (ver BASE_V1);
 *  - campo personalizado em v2 vai aninhado em `custom_fields: { hash: valor }`,
 *    diferente do v1 (que punha o hash na raiz do corpo);
 *  - a resposta vem envelopada em `{ success, data }`, por isso todo retorno
 *    passa por `dados()`;
 *  - `job_title` não existe por padrão em pessoa (só com contact sync), então o
 *    cargo do contato entra na nota e na descrição do negócio;
 *  - o limite é por token e a v2 custa metade da v1; o backoff de `http.ts` lê
 *    `retry-after` quando o Pipedrive devolve 429.
 */

import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";
import { ErroCrm } from "./tipos";

const BASE = "https://api.pipedrive.com/api/v2";

/**
 * Nem tudo ganhou versão 2: notas, tipos de atividade e `users/me` seguem só em
 * v1 na documentação atual. Não é descuido de migração.
 */
const BASE_V1 = "https://api.pipedrive.com/api/v1";

/** Limite do campo `content` de nota no Pipedrive. */
const MAX_NOTA = 100_000;

function cabecalhos(cred: Credenciais): Record<string, string> {
  return { "x-api-token": cred.token };
}

type Envelope<T> = { success?: boolean; data?: T; error?: string };
type ComId = { id?: number | string; name?: string; key_string?: string };
type ItemBusca = { id?: number | string; name?: string; item?: ComId };

/** Desembrulha `{ success, data }`. Erro de payload chega como 4xx pelo `pedir`. */
function dados<T>(resposta: Envelope<T>): T | undefined {
  return resposta?.data;
}

function id(resposta: Envelope<ComId>): string {
  const bruto = dados(resposta)?.id;
  if (bruto === undefined || bruto === null || bruto === "") {
    throw new ErroCrm("O Pipedrive respondeu sem o id do registro.");
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

/**
 * Busca por nome exato. O `/search` devolve `data.items[]`, e cada item traz o
 * registro em `item`; aceitamos também o formato achatado por segurança.
 */
async function acharPorNome(cred: Credenciais, entidade: string, nome: string): Promise<string | null> {
  const termo = nome.trim();
  if (termo.length < 2) return null;
  const busca = new URLSearchParams({ term: termo, fields: "name", exact_match: "true", limit: "10" });
  const resposta = await pedir<Envelope<{ items?: ItemBusca[] }>>({
    url: `${BASE}/${entidade}/search?${busca.toString()}`,
    headers: cabecalhos(cred),
  });
  const itens = dados(resposta)?.items ?? [];
  const alvo = comparavel(termo);
  for (const linha of itens) {
    const registro = linha.item ?? linha;
    if (registro?.id && comparavel(String(registro.name ?? "")) === alvo) return String(registro.id);
  }
  return null;
}

/** Tipo da atividade: prefere visita, depois tarefa/task, senão o primeiro. */
async function tipoDeAtividade(cred: Credenciais): Promise<string> {
  const resposta = await pedir<Envelope<ComId[]>>({
    url: `${BASE_V1}/activityTypes`,
    headers: cabecalhos(cred),
  });
  const lista = dados(resposta) ?? [];
  const preferido =
    lista.find((t) => /visita/i.test(String(t.name ?? ""))) ??
    lista.find((t) => /tarefa|task/i.test(`${t.name ?? ""} ${t.key_string ?? ""}`)) ??
    lista[0];
  const chave = preferido?.key_string;
  if (!chave) throw new ErroCrm("Nenhum tipo de atividade encontrado no Pipedrive.");
  return String(chave);
}

/** `custom_fields` do v2: hash de 40 caracteres -> valor. */
export function camposPersonalizados(relato: RelatoCanonico, mapa: Record<string, string>) {
  const valores: Record<string, string> = {
    temperatura: relato.negocio.temperatura,
    objecao: relato.extras.objecao,
    concorrentes: relato.extras.concorrentes.join(", "),
    numeros: relato.extras.numeros.join("; "),
    visita_em: relato.extras.visitaEm,
    chave_relato: relato.chave,
  };
  const saida: Record<string, string> = {};
  for (const [canonico, hash] of Object.entries(mapa)) {
    const valor = valores[canonico];
    if (hash && valor) saida[hash] = valor;
  }
  return saida;
}

/** Payload da organização — puro. */
export function corpoOrganizacao(relato: RelatoCanonico) {
  return { name: relato.organizacao.nome.slice(0, 255) };
}

/** Payload da pessoa — puro. Telefone já chega em E.164 do canônico. */
export function corpoPessoa(relato: RelatoCanonico, organizacaoId?: string) {
  const corpo: Record<string, unknown> = { name: relato.pessoa.nome.slice(0, 255) };
  if (organizacaoId) corpo.org_id = Number(organizacaoId);
  if (relato.pessoa.telefone) {
    corpo.phones = [{ value: relato.pessoa.telefone, primary: true, label: "mobile" }];
  }
  return corpo;
}

/** Payload do negócio — puro. Etapa e funil vêm da configuração da conta. */
export function corpoNegocio(relato: RelatoCanonico, ctx: ContextoEnvio, ids: IdsExternos) {
  const corpo: Record<string, unknown> = {
    title: relato.negocio.titulo.slice(0, 255),
    status: "open",
  };
  if (ctx.etapaId) corpo.stage_id = Number(ctx.etapaId);
  if (ctx.funilId) corpo.pipeline_id = Number(ctx.funilId);
  if (ids.organizacao) corpo.org_id = Number(ids.organizacao);
  if (ids.pessoa) corpo.person_id = Number(ids.pessoa);
  if (relato.extras.visitaEm) corpo.expected_close_date = relato.extras.visitaEm;
  const personalizados = camposPersonalizados(relato, ctx.mapaCampos);
  if (Object.keys(personalizados).length) corpo.custom_fields = personalizados;
  return corpo;
}

/** Primeira linha, para campos de título de uma linha só. */
function primeiraLinha(texto: string): string {
  return texto.split("\n")[0]?.trim() ?? "";
}

/**
 * Payload da nota — puro. O Pipedrive aceita HTML simples em `content`.
 * A próxima ação entra aqui porque a atividade do v2 não tem campo de descrição.
 */
export function corpoNota(relato: RelatoCanonico, ids: IdsExternos) {
  const cabecalho = relato.pessoa.cargo ? `${relato.pessoa.nome} — ${relato.pessoa.cargo}\n` : "";
  const proxima = relato.tarefa ? `\n\nPróxima ação: ${relato.tarefa.texto}` : "";
  const corpo: Record<string, unknown> = {
    content: `${cabecalho}${relato.anotacao.texto}${proxima}`.slice(0, MAX_NOTA),
  };
  if (ids.negocio) corpo.deal_id = Number(ids.negocio);
  if (ids.pessoa) corpo.person_id = Number(ids.pessoa);
  if (ids.organizacao) corpo.org_id = Number(ids.organizacao);
  return corpo;
}

/**
 * Payload da atividade — puro. Data e hora vão em campos separados e o assunto é
 * de uma linha: o detalhe do follow-up fica na nota, que aceita texto longo.
 */
export function corpoAtividade(relato: RelatoCanonico, tipo: string, ids: IdsExternos) {
  if (!relato.tarefa) return null;
  const corpo: Record<string, unknown> = {
    subject: primeiraLinha(relato.tarefa.texto).slice(0, 255),
    type: tipo,
    done: false,
  };
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(relato.tarefa.dataIso) ? relato.tarefa.dataIso : "";
  if (dia) corpo.due_date = dia;
  if (dia && /^\d{2}:\d{2}$/.test(relato.tarefa.hora)) corpo.due_time = relato.tarefa.hora;
  if (ids.negocio) corpo.deal_id = Number(ids.negocio);
  if (ids.pessoa) corpo.person_id = Number(ids.pessoa);
  if (ids.organizacao) corpo.org_id = Number(ids.organizacao);
  return corpo;
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. organização
  if (relato.organizacao.nome && !ids.organizacao) {
    const existente = await acharPorNome(cred, "organizations", relato.organizacao.nome);
    if (existente) {
      ids.organizacao = existente;
    } else {
      const corpo = corpoOrganizacao(relato);
      payload.organizacao = corpo;
      ids.organizacao = id(
        await pedir({ url: `${BASE}/organizations`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 2. pessoa
  if (relato.pessoa.nome && !ids.pessoa) {
    const existente = await acharPorNome(cred, "persons", relato.pessoa.nome);
    if (existente) {
      ids.pessoa = existente;
    } else {
      const corpo = corpoPessoa(relato, ids.organizacao);
      payload.pessoa = corpo;
      ids.pessoa = id(
        await pedir({ url: `${BASE}/persons`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 3. negócio
  const corpoDoNegocio = corpoNegocio(relato, ctx, ids);
  payload.negocio = corpoDoNegocio;
  if (ids.negocio) {
    await pedir({
      url: `${BASE}/deals/${ids.negocio}`,
      metodo: "PATCH",
      headers: cabecalhos(cred),
      corpo: corpoDoNegocio,
    });
  } else {
    ids.negocio = id(
      await pedir({ url: `${BASE}/deals`, metodo: "POST", headers: cabecalhos(cred), corpo: corpoDoNegocio }),
    );
  }

  // 4. nota (v1 — ver BASE_V1)
  if (!ids.anotacao) {
    const corpo = corpoNota(relato, ids);
    payload.anotacao = corpo;
    ids.anotacao = id(
      await pedir({ url: `${BASE_V1}/notes`, metodo: "POST", headers: cabecalhos(cred), corpo }),
    );
  }

  // 5. atividade da próxima ação
  if (relato.tarefa && !ids.tarefa) {
    const tipo = await tipoDeAtividade(cred);
    const corpo = corpoAtividade(relato, tipo, ids);
    if (corpo) {
      // Atividade sem data é válida no Pipedrive: sem `due_date` ela cai na lista
      // de pendências sem prazo, o que é melhor que falhar o envio inteiro.
      payload.tarefa = corpo;
      ids.tarefa = id(
        await pedir({ url: `${BASE}/activities`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  return { ids, payload };
}

export const pipedrive: Adaptador = {
  provedor: "pipedrive",
  nome: "Pipedrive",
  rotuloToken: "API token (Perfil › Configurações pessoais › API)",
  ajuda:
    "No Pipedrive: foto do perfil › Configurações pessoais › API › copiar o token pessoal. Etapa e funil são os ids que aparecem na URL do funil. Campo personalizado usa o código de 40 letras do campo.",

  async testar(cred) {
    await pedir({ url: `${BASE_V1}/users/me`, headers: cabecalhos(cred) });
  },

  enviar(relato, ctx) {
    return emFila(`pipedrive:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
