/**
 * Ploomes — base https://public-api2.ploomes.com, header `User-Key`.
 *
 * Particularidades que ditam o código:
 *  - a API fala OData: filtro em `$filter`, corte em `$top`, e a resposta vem em
 *    `{ value: [...] }` — inclusive no POST, que devolve o registro criado dentro
 *    de `value[0]`;
 *  - o vocabulário é próprio: cliente é `Contacts` (empresa e pessoa são o mesmo
 *    recurso, separados por `TypeId`), negócio é `Deals`, a anotação da visita é
 *    `InteractionRecords` e a próxima ação é `Tasks`;
 *  - `Contacts.TypeId` é por conta, então o adaptador lê `/Contacts@Types` e casa
 *    pelo nome (Empresa / Pessoa) em vez de chutar 1 ou 2;
 *  - campo personalizado vai em `OtherProperties: [{ FieldKey, StringValue }]`,
 *    com FieldKey (texto), não com id numérico;
 *  - `Tasks` datam em `DateTime` (sem offset, hora local) e `InteractionRecords`
 *    em `Date` (com offset). São formatos diferentes de propósito;
 *  - limite de 120 requisições por minuto por conta — daí o `emFila`.
 */

import { isoComOffsetBr } from "./datas";
import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";
import { ErroCrm } from "./tipos";

const BASE = "https://public-api2.ploomes.com";

function cabecalhos(cred: Credenciais): Record<string, string> {
  return { "User-Key": cred.token };
}

type ComId = { Id?: number | string; Name?: string };
type Lista<T> = { value?: T[] };

function primeiro<T>(resposta: Lista<T>): T | undefined {
  const lista = resposta?.value;
  return Array.isArray(lista) && lista.length ? lista[0] : undefined;
}

/**
 * O POST devolve o registro criado dentro de `value`. Aceitamos também o objeto
 * solto na raiz: é uma linha de código a mais e evita quebrar se a API mudar o
 * envelope.
 */
function id(resposta: Lista<ComId> & ComId): string {
  const bruto = primeiro(resposta)?.Id ?? resposta?.Id;
  if (bruto === undefined || bruto === null || bruto === "") {
    throw new ErroCrm("O Ploomes respondeu sem o id do registro.");
  }
  return String(bruto);
}

/** Aspas simples dentro de literal OData dobram. */
export function literalOData(valor: string): string {
  return `'${valor.replace(/'/g, "''")}'`;
}

function comparavel(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Dedupe por nome exato, filtrando no servidor com OData. */
async function acharCliente(cred: Credenciais, nome: string, tipoId: string): Promise<string | null> {
  const alvo = nome.trim();
  if (alvo.length < 2) return null;
  const busca = new URLSearchParams({
    $filter: `Name eq ${literalOData(alvo)} and TypeId eq ${tipoId}`,
    $top: "1",
    $select: "Id,Name",
  });
  const resposta = await pedir<Lista<ComId>>({
    url: `${BASE}/Contacts?${busca.toString()}`,
    headers: cabecalhos(cred),
  });
  const achado = primeiro(resposta);
  if (!achado?.Id) return null;
  return comparavel(String(achado.Name ?? "")) === comparavel(alvo) ? String(achado.Id) : null;
}

/** Tipo de cliente pelo nome — "Empresa" ou "Pessoa", conforme a conta. */
async function tipoDeCliente(cred: Credenciais, procurado: "empresa" | "pessoa"): Promise<string> {
  const resposta = await pedir<Lista<ComId>>({
    url: `${BASE}/Contacts@Types?$select=Id,Name`,
    headers: cabecalhos(cred),
  });
  const lista = resposta?.value ?? [];
  const regra = procurado === "empresa" ? /empresa|juridic/i : /pessoa|fisic/i;
  const escolhido = lista.find((t) => regra.test(String(t.Name ?? ""))) ?? lista[0];
  if (!escolhido?.Id) throw new ErroCrm("Nenhum tipo de cliente encontrado no Ploomes.");
  return String(escolhido.Id);
}

/** Primeiro tipo de telefone da conta, quando existir. */
async function tipoDeTelefone(cred: Credenciais): Promise<string> {
  const resposta = await pedir<Lista<ComId>>({
    url: `${BASE}/PhoneTypes?$top=1&$select=Id`,
    headers: cabecalhos(cred),
  });
  const tipo = primeiro(resposta)?.Id;
  return tipo ? String(tipo) : "";
}

/** `OtherProperties` — puro. FieldKey é a chave de texto do campo na conta. */
export function camposPersonalizados(relato: RelatoCanonico, mapa: Record<string, string>) {
  const valores: Record<string, string> = {
    temperatura: relato.negocio.temperatura,
    objecao: relato.extras.objecao,
    concorrentes: relato.extras.concorrentes.join(", "),
    numeros: relato.extras.numeros.join("; "),
    visita_em: relato.extras.visitaEm,
    chave_relato: relato.chave,
  };
  const saida: { FieldKey: string; StringValue: string }[] = [];
  for (const [canonico, chave] of Object.entries(mapa)) {
    const valor = valores[canonico];
    if (chave && valor) saida.push({ FieldKey: chave, StringValue: valor });
  }
  return saida;
}

/** Payload da empresa — puro. */
export function corpoEmpresa(relato: RelatoCanonico, tipoId: string) {
  return { Name: relato.organizacao.nome.slice(0, 200), TypeId: Number(tipoId) };
}

/** Payload da pessoa — puro. Telefone chega em E.164 do canônico. */
export function corpoPessoa(
  relato: RelatoCanonico,
  tipoId: string,
  empresaId?: string,
  tipoTelefoneId?: string,
) {
  const corpo: Record<string, unknown> = {
    Name: relato.pessoa.nome.slice(0, 200),
    TypeId: Number(tipoId),
  };
  if (empresaId) corpo.CompanyId = Number(empresaId);
  if (relato.pessoa.telefone) {
    const telefone: Record<string, unknown> = { PhoneNumber: relato.pessoa.telefone };
    if (tipoTelefoneId) telefone.TypeId = Number(tipoTelefoneId);
    corpo.Phones = [telefone];
  }
  return corpo;
}

/** Payload do negócio — puro. Sem `StageId` o Ploomes usa a primeira etapa. */
export function corpoNegocio(relato: RelatoCanonico, ctx: ContextoEnvio, ids: IdsExternos) {
  const corpo: Record<string, unknown> = { Title: relato.negocio.titulo.slice(0, 200) };
  if (ids.organizacao) corpo.ContactId = Number(ids.organizacao);
  if (ids.pessoa) corpo.PersonId = Number(ids.pessoa);
  if (ctx.etapaId) corpo.StageId = Number(ctx.etapaId);
  const personalizados = camposPersonalizados(relato, ctx.mapaCampos);
  if (personalizados.length) corpo.OtherProperties = personalizados;
  return corpo;
}

/** Payload do registro de interação (a anotação da visita) — puro. */
export function corpoInteracao(relato: RelatoCanonico, ids: IdsExternos, agora: string) {
  const corpo: Record<string, unknown> = {
    Title: "Relato de visita",
    Content: relato.anotacao.texto,
    Date: isoComOffsetBr(relato.extras.visitaEm, relato.tarefa?.hora ?? "") || agora,
  };
  if (ids.organizacao) corpo.ContactId = Number(ids.organizacao);
  else if (ids.pessoa) corpo.ContactId = Number(ids.pessoa);
  if (ids.negocio) corpo.DealId = Number(ids.negocio);
  return corpo;
}

/**
 * Payload da tarefa — puro. `DateTime` é hora local, sem offset, e o título é de
 * uma linha (o texto inteiro vai em `Description`, que aceita texto longo).
 */
export function corpoTarefa(relato: RelatoCanonico, ids: IdsExternos) {
  if (!relato.tarefa) return null;
  const corpo: Record<string, unknown> = {
    Title: (relato.tarefa.texto.split("\n")[0] ?? "").trim().slice(0, 100),
    Description: relato.tarefa.texto,
  };
  const comOffset = isoComOffsetBr(relato.tarefa.dataIso, relato.tarefa.hora);
  if (comOffset) corpo.DateTime = comOffset.slice(0, 19);
  if (ids.organizacao) corpo.ContactId = Number(ids.organizacao);
  else if (ids.pessoa) corpo.ContactId = Number(ids.pessoa);
  if (ids.negocio) corpo.DealId = Number(ids.negocio);
  return corpo;
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. empresa (cliente do tipo empresa)
  if (relato.organizacao.nome && !ids.organizacao) {
    const tipoId = await tipoDeCliente(cred, "empresa");
    const existente = await acharCliente(cred, relato.organizacao.nome, tipoId);
    if (existente) {
      ids.organizacao = existente;
    } else {
      const corpo = corpoEmpresa(relato, tipoId);
      payload.organizacao = corpo;
      ids.organizacao = id(
        await pedir({ url: `${BASE}/Contacts`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 2. pessoa (cliente do tipo pessoa, ligada à empresa)
  if (relato.pessoa.nome && !ids.pessoa) {
    const tipoId = await tipoDeCliente(cred, "pessoa");
    const existente = await acharCliente(cred, relato.pessoa.nome, tipoId);
    if (existente) {
      ids.pessoa = existente;
    } else {
      const tipoTelefoneId = relato.pessoa.telefone ? await tipoDeTelefone(cred) : "";
      const corpo = corpoPessoa(relato, tipoId, ids.organizacao, tipoTelefoneId);
      payload.pessoa = corpo;
      ids.pessoa = id(
        await pedir({ url: `${BASE}/Contacts`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  // 3. negócio
  const corpoDoNegocio = corpoNegocio(relato, ctx, ids);
  payload.negocio = corpoDoNegocio;
  if (ids.negocio) {
    await pedir({
      url: `${BASE}/Deals(${ids.negocio})`,
      metodo: "PATCH",
      headers: cabecalhos(cred),
      corpo: corpoDoNegocio,
    });
  } else {
    ids.negocio = id(
      await pedir({ url: `${BASE}/Deals`, metodo: "POST", headers: cabecalhos(cred), corpo: corpoDoNegocio }),
    );
  }

  // 4. anotação da visita
  if (!ids.anotacao) {
    const corpo = corpoInteracao(relato, ids, new Date().toISOString());
    payload.anotacao = corpo;
    ids.anotacao = id(
      await pedir({ url: `${BASE}/InteractionRecords`, metodo: "POST", headers: cabecalhos(cred), corpo }),
    );
  }

  // 5. tarefa da próxima ação
  if (relato.tarefa && !ids.tarefa) {
    const corpo = corpoTarefa(relato, ids);
    if (corpo) {
      payload.tarefa = corpo;
      ids.tarefa = id(
        await pedir({ url: `${BASE}/Tasks`, metodo: "POST", headers: cabecalhos(cred), corpo }),
      );
    }
  }

  return { ids, payload };
}

export const ploomes: Adaptador = {
  provedor: "ploomes",
  nome: "Ploomes",
  rotuloToken: "User-Key (Administração › Usuários de integração)",
  ajuda:
    "No Ploomes: Administração › Integrações › Usuários de integração › Novo usuário, e copie a chave gerada. A etapa é o id do estágio do funil; sem ela o negócio entra na primeira etapa. Campo personalizado usa a FieldKey do campo.",

  async testar(cred) {
    await pedir({ url: `${BASE}/Users?$top=1&$select=Id`, headers: cabecalhos(cred) });
  },

  enviar(relato, ctx) {
    return emFila(`ploomes:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
