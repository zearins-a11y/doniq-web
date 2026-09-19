/**
 * Ollow (ex-Moskit) — API v2, base https://api.ms.prod.ollow.services/v2, header `apikey`.
 *
 * Particularidades que ditam o código:
 *  - `createdBy` e `responsible` são obrigatórios em empresa, contato, negócio e
 *    atividade, então o adaptador resolve um usuário da conta antes de escrever;
 *  - datas exigem offset explícito (ISO-8601) e voltam em UTC;
 *  - limite de 6 req/s e 240 req/min — o backoff de `http.ts` lê os headers
 *    X-RateLimit-Remaining-Second/Minute;
 *  - dedupe é feito com /companies/search e /contacts/search (expressão `like`).
 */

import { isoComOffsetBr } from "./datas";
import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";
import { ErroCrm } from "./tipos";

const BASE = "https://api.ms.prod.ollow.services/v2";

function cabecalhos(cred: Credenciais): Record<string, string> {
  return { apikey: cred.token, "X-Ollow-Origin": "RELATO_DE_VISITA" };
}

type ComId = { id?: number | string; name?: string; title?: string };

function id(resposta: unknown): string {
  const bruto = (resposta as ComId)?.id;
  if (bruto === undefined || bruto === null || bruto === "") {
    throw new ErroCrm("O Ollow respondeu sem o id do registro.");
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

async function primeiroDaLista(cred: Credenciais, caminho: string): Promise<ComId | null> {
  const lista = await pedir<ComId[]>({ url: `${BASE}${caminho}`, headers: cabecalhos(cred) });
  return Array.isArray(lista) && lista.length ? lista[0] : null;
}

/** Usuário responsável: o configurado em `contaId`, senão o primeiro da conta. */
async function usuarioResponsavel(cred: Credenciais): Promise<string> {
  if (cred.contaId) return cred.contaId;
  const usuario = await primeiroDaLista(cred, "/users?quantity=1");
  if (!usuario?.id) throw new ErroCrm("Nenhum usuário encontrado na conta do Ollow.");
  return String(usuario.id);
}

/** Tipo de atividade: prefere algo parecido com visita/tarefa; senão o primeiro. */
async function tipoDeAtividade(cred: Credenciais): Promise<string> {
  const tipos = await pedir<ComId[]>({ url: `${BASE}/activityTypes`, headers: cabecalhos(cred) });
  const lista = Array.isArray(tipos) ? tipos : [];
  const preferido =
    lista.find((t) => /visita/i.test(String(t.name ?? ""))) ??
    lista.find((t) => /tarefa|task/i.test(String(t.name ?? ""))) ??
    lista[0];
  if (!preferido?.id) throw new ErroCrm("Nenhum tipo de atividade encontrado no Ollow.");
  return String(preferido.id);
}

/** Busca por nome exato entre os resultados do `like` (mínimo de 3 caracteres). */
async function acharPorNome(cred: Credenciais, entidade: string, nome: string): Promise<string | null> {
  if (nome.trim().length < 3) return null;
  const achados = await pedir<ComId[]>({
    url: `${BASE}/${entidade}/search?quantity=25`,
    metodo: "POST",
    headers: cabecalhos(cred),
    corpo: [{ field: "name", expression: "like", values: [nome.trim()] }],
  });
  const alvo = comparavel(nome);
  const igual = (Array.isArray(achados) ? achados : []).find((x) => comparavel(String(x.name ?? "")) === alvo);
  return igual?.id ? String(igual.id) : null;
}

export function camposPersonalizados(relato: RelatoCanonico, mapa: Record<string, string>) {
  const valores: Record<string, string> = {
    temperatura: relato.negocio.temperatura,
    objecao: relato.extras.objecao,
    concorrentes: relato.extras.concorrentes.join(", "),
    numeros: relato.extras.numeros.join("; "),
    visita_em: relato.extras.visitaEm,
    chave_relato: relato.chave,
  };
  const saida: { id: string; textValue: string }[] = [];
  for (const [canonico, campoId] of Object.entries(mapa)) {
    const valor = valores[canonico];
    if (campoId && valor) saida.push({ id: campoId, textValue: valor });
  }
  return saida;
}

/** Payload do negócio — puro. `stage` define o funil, por isso é obrigatório. */
export function corpoNegocio(
  relato: RelatoCanonico,
  ctx: ContextoEnvio,
  usuarioId: string,
  ids: IdsExternos,
) {
  const corpo: Record<string, unknown> = {
    name: relato.negocio.titulo.slice(0, 200),
    status: "OPEN",
    createdBy: { id: Number(usuarioId) },
    responsible: { id: Number(usuarioId) },
  };
  if (ctx.etapaId) corpo.stage = { id: Number(ctx.etapaId) };
  if (ids.organizacao) corpo.companies = [{ id: Number(ids.organizacao) }];
  if (ids.pessoa) corpo.contacts = [{ id: Number(ids.pessoa) }];
  const personalizados = camposPersonalizados(relato, ctx.mapaCampos);
  if (personalizados.length) corpo.entityCustomFields = personalizados;
  return corpo;
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  const usuarioId = await usuarioResponsavel(cred);
  const responsavel = { id: Number(usuarioId) };

  // 1. empresa
  if (relato.organizacao.nome && !ids.organizacao) {
    const existente = await acharPorNome(cred, "companies", relato.organizacao.nome);
    if (existente) {
      ids.organizacao = existente;
    } else {
      const corpo = { name: relato.organizacao.nome, createdBy: responsavel, responsible: responsavel };
      payload.organizacao = corpo;
      ids.organizacao = id(
        await pedir({ url: `${BASE}/companies`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 2. contato
  if (relato.pessoa.nome && !ids.pessoa) {
    const existente = await acharPorNome(cred, "contacts", relato.pessoa.nome);
    if (existente) {
      ids.pessoa = existente;
    } else {
      const corpo: Record<string, unknown> = {
        name: relato.pessoa.nome,
        createdBy: responsavel,
        responsible: responsavel,
      };
      if (relato.pessoa.telefone) {
        // `type` é obrigatório em telefone; usamos o primeiro tipo da conta.
        const tipo = await primeiroDaLista(cred, "/phoneTypes");
        if (tipo?.id) corpo.phones = [{ number: relato.pessoa.telefone, type: { id: Number(tipo.id) } }];
      }
      payload.pessoa = corpo;
      ids.pessoa = id(
        await pedir({ url: `${BASE}/contacts`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 3. negócio
  const corpoDoNegocio = corpoNegocio(relato, ctx, usuarioId, ids);
  payload.negocio = corpoDoNegocio;
  if (ids.negocio) {
    await pedir({
      url: `${BASE}/deals/${ids.negocio}`,
      metodo: "PUT",
      headers: cabecalhos(cred),
      corpo: { ...corpoDoNegocio, id: Number(ids.negocio) },
    });
  } else {
    ids.negocio = id(
      await pedir({ url: `${BASE}/deals`, metodo: "POST", headers: cabecalhos(cred), corpo: corpoDoNegocio }),
    );
  }

  // 4. nota no negócio
  if (!ids.anotacao) {
    const corpo = { description: relato.anotacao.texto, user: responsavel };
    payload.anotacao = corpo;
    ids.anotacao = id(
      await pedir({
        url: `${BASE}/deals/${ids.negocio}/notes`,
        metodo: "POST",
        headers: cabecalhos(cred),
        corpo,
      }),
    );
  }

  // 5. atividade da próxima ação
  if (relato.tarefa && !ids.tarefa) {
    const tipoId = await tipoDeAtividade(cred);
    const corpo = {
      title: relato.tarefa.texto.slice(0, 200),
      dueDate: isoComOffsetBr(relato.tarefa.dataIso, relato.tarefa.hora) || isoComOffsetBr(relato.extras.visitaEm),
      type: { id: Number(tipoId) },
      createdBy: responsavel,
      responsible: responsavel,
      deals: [{ id: Number(ids.negocio) }],
      notes: relato.tarefa.texto,
    };
    if (!corpo.dueDate) throw new ErroCrm("O Ollow exige data na atividade e o relato não tem data.");
    payload.tarefa = corpo;
    ids.tarefa = id(
      await pedir({ url: `${BASE}/activities`, metodo: "POST", headers: cabecalhos(cred), corpo }),
    );
  }

  return { ids, payload };
}

export const ollow: Adaptador = {
  provedor: "ollow",
  nome: "Ollow",
  rotuloToken: "API key (Marketplace › API pública)",
  ajuda:
    "No Ollow: Marketplace › API pública › gerar api key. A etapa (stage) já define o funil. Limite de 6 requisições por segundo.",

  async testar(cred) {
    await pedir({ url: `${BASE}/users?quantity=1`, headers: cabecalhos(cred) });
  },

  enviar(relato, ctx) {
    return emFila(`ollow:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
