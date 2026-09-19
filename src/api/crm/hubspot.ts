/**
 * HubSpot CRM — Private App Token (Bearer).
 * https://developers.hubspot.com/docs/api/crm/deals
 *
 * Fluxo:
 *   1. Upsert contato (e-mail ou nome)
 *   2. Criar deal com nome + nota da visita
 *   3. Associar contato ao deal
 *   4. Nota com o texto completo do relato
 */

import { emFila, pedir } from "./http";
import type { Adaptador, ContextoEnvio, Credenciais, IdsExternos, RelatoCanonico } from "./tipos";


const BASE = "https://api.hubapi.com";

function headers(cred: Credenciais): Record<string, string> {
  return { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" };
}

function url(caminho: string) {
  return `${BASE}${caminho}`;
}

/** Busca contato existente pelo nome (propriedade "firstname" ou e-mail no identificador). */
async function buscarContatoExistente(nome: string, cred: Credenciais): Promise<string | null> {
  const r = await pedir<{ results: { id: string }[] }>({
    url: url(`/crm/v3/objects/contacts/search`),
    metodo: "POST",
    headers: headers(cred),
    corpo: {
      filterGroups: [
        {
          filters: [
            { propertyName: "firstname", operator: "EQ", value: nome },
          ],
        },
      ],
      limit: 1,
    },
  }).catch(() => null);
  return r?.results?.[0]?.id ?? null;
}

/** Upsert contato — retorna o ID do contato. */
async function upsertContato(relato: RelatoCanonico, cred: Credenciais): Promise<string> {
  const telefone = relato.pessoa.telefone;
  const corpo: Record<string, unknown> = {
    properties: {
      firstname: relato.pessoa.nome || "Sem nome",
      ...(relato.pessoa.cargo ? { jobtitle: relato.pessoa.cargo } : {}),
      ...(telefone ? { phone: telefone } : {}),
    },
  };

  // Tenta buscar existente
  const existente = await buscarContatoExistente(relato.pessoa.nome, cred);
  if (existente) {
    await pedir({ url: url(`/crm/v3/objects/contacts/${existente}`), metodo: "PATCH", headers: headers(cred), corpo });
    return existente;
  }

  // Cria novo
  const criado = await pedir<{ id: string }>({
    url: url("/crm/v3/objects/contacts"),
    metodo: "POST",
    headers: headers(cred),
    corpo,
  });
  return criado.id;
}

/** Avaliação numérica do HubSpot: 1–5. */
export const AVALIACAO: Record<string, number> = { Quente: 4, Morna: 3, Fria: 1 };

/** Normaliza temperatura para chave do AVALIACAO (primeira maiúscula). */
function normalizarTemp(temp: string): string {
  if (!temp) return "Morna";
  return temp.charAt(0).toUpperCase() + temp.slice(1).toLowerCase();
}

/** Monta o payload do deal (para testes e reutilização). */
export function corpoDeal(
  titulo: string,
  temperatura: string,
  etapaId?: string,
  mapaCampos?: Record<string, string>,
  anotacao?: string,
) {
  const tempNormalizada = normalizarTemp(temperatura);
  return {
    properties: {
      dealname: titulo.slice(0, 200),
      dealstage: etapaId || undefined,
      ...(AVALIACAO[tempNormalizada] !== undefined
        ? { hs_deal_stage_probability: String(AVALIACAO[tempNormalizada]) }
        : {}),
      ...(mapaCampos?.["doniq_nota"] && anotacao
        ? { [mapaCampos["doniq_nota"]]: anotacao.slice(0, 2000) }
        : {}),
    },
  };
}

async function enviar(relato: RelatoCanonico, ctx: ContextoEnvio) {
  const cred = ctx.credenciais;
  const ids: IdsExternos = { ...ctx.idsExistentes };
  const payload: Record<string, unknown> = {};

  // 1. Contato
  let contatoId = ids.contato;
  if (!contatoId && relato.pessoa.nome) {
    contatoId = await upsertContato(relato, cred);
    ids.contato = contatoId;
  }

  // 2. Deal
  if (!ids.negocio) {
    const dealCorpo = {
      properties: {
        dealname: relato.negocio.titulo.slice(0, 200),
        dealstage: ctx.etapaId || undefined,
        ...(relato.negocio.temperatura
          ? { hs_deal_stage_probability: String(AVALIACAO[relato.negocio.temperatura] ?? 3) }
          : {}),
        ...(ctx.mapaCampos["doniq_nota"]
          ? { [ctx.mapaCampos["doniq_nota"]]: relato.anotacao.texto.slice(0, 2000) }
          : {}),
      },
    };
    payload.deal = dealCorpo;
    const deal = await pedir<{ id: string }>({
      url: url("/crm/v3/objects/deals"),
      metodo: "POST",
      headers: headers(cred),
      corpo: dealCorpo,
    });
    ids.negocio = deal.id;
  }

  // 3. Associar contato ao deal
  if (contatoId && ids.negocio) {
    await pedir({
      url: url(
        `/crm/v4/objects/deals/${ids.negocio}/associations/contacts/${contatoId}/deal_to_contact`),
      metodo: "PUT",
      headers: headers(cred),
    }).catch(() => { /* associações podem já existir */ });
    payload.associacao = { contato: contatoId, deal: ids.negocio };
  }

  // 4. Nota com texto do relato
  if (!ids.anotacao) {
    const notaCorpo = {
      properties: {
        hs_note_body: relato.anotacao.texto,
        hs_timestamp: new Date().toISOString(),
      },
      associations: ids.negocio
        ? [
            { to: { id: ids.negocio }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] },
          ]
        : [],
    };
    payload.nota = notaCorpo;
    const nota = await pedir<{ id: string }>({
      url: url("/crm/v3/objects/notes"),
      metodo: "POST",
      headers: headers(cred),
      corpo: notaCorpo,
    });
    ids.anotacao = nota.id;
  }

  return { ids, payload };
}

export const hubspot: Adaptador = {
  provedor: "hubspot",
  nome: "HubSpot CRM",
  rotuloToken: "Private App Token",
  ajuda:
    "HubSpot › Settings › Integrations › Private Apps › Create a private app with crm.objects.contacts, crm.objects.deals, crm.objects.notes (write) scopes.",

  async testar(cred) {
    const r = await pedir<{ user: string; hubDomain: string }>({
      url: url("/oauth/v1/access-tokens/invalid"),
      metodo: "POST",
      headers: { Authorization: `Bearer ${cred.token}` },
    }).catch((e: unknown) => e);
    if (!r || !(r as { user?: string }).user) {
      // Teste prático: GET /crm/v3/objects/deals sem corpo é 200 se token é válido
      await pedir({ url: url("/crm/v3/objects/deals?limit=1"), headers: headers(cred) });
    }
  },

  enviar(relato, ctx) {
    return emFila(`hubspot:${ctx.credenciais.token.slice(-8)}`, () => enviar(relato, ctx));
  },
};
