import { describe, expect, test } from "bun:test";
import { corpoNegocio as corpoAgendor, corpoPessoa, camposPersonalizados as customAgendor } from "../agendor";
import { paraCanonico, type RelatoEntrada } from "../canonico";
import { ADAPTADORES } from "../index";
import { NOMES_PROVEDOR, PROVEDORES } from "../tipos";
import { cifrar, decifrar, mascarar } from "../cripto";
import { corpoNegocio as corpoOllow } from "../ollow";
import {
  camposPersonalizados as customPipedrive,
  corpoAtividade,
  corpoNegocio as corpoNegocioPipedrive,
  corpoNota,
  corpoPessoa as corpoPessoaPipedrive,
} from "../pipedrive";
import {
  camposPersonalizados as customPloomes,
  corpoInteracao,
  corpoNegocio as corpoNegocioPloomes,
  corpoPessoa as corpoPessoaPloomes,
  corpoTarefa as corpoTarefaPloomes,
  literalOData,
} from "../ploomes";
import { corpoNegociacao, corpoTarefa } from "../rdstation";
import type { ContextoEnvio } from "../tipos";

// os testes de cripto não dependem do .env da raiz
process.env.CRM_CRYPTO_KEY ||= "a".repeat(64);

const entrada: RelatoEntrada = {
  relatoId: "rel_abc123",
  clientId: "local-42",
  empresa: "Padaria Aurora",
  contato: "Dona Marli",
  cargo: "Proprietária",
  telefone: "(11) 98888-7777",
  resumo: "Quer trocar o fornecedor de farinha.",
  transcricao: "Visitei a padaria Aurora.",
  objecao: "Achou o preço alto",
  proximaAcao: "Levar amostra da farinha",
  followup: "Ligar antes de ir",
  dataIso: "2026-08-12",
  hora: "14:30",
  temperatura: "quente",
  tags: ["proposta"],
  concorrentes: ["Moinho Sul"],
  numeros: ["30 sacos/mês"],
  createdAt: "2026-08-10T12:00:00+00:00",
};

const canonico = paraCanonico(entrada);

const ctx: ContextoEnvio = {
  credenciais: { token: "tok_teste_1234" },
  funilId: "7",
  etapaId: "21",
  idsExistentes: {},
  mapaCampos: { objecao: "campo_objecao", temperatura: "campo_temp" },
};

describe("registro dos conectores", () => {
  test("todo provedor tem adaptador, nome, rótulo de token e ajuda", () => {
    for (const provedor of PROVEDORES) {
      const a = ADAPTADORES[provedor];
      expect(a.provedor).toBe(provedor);
      expect(a.nome).toBe(NOMES_PROVEDOR[provedor]);
      expect(a.rotuloToken.length).toBeGreaterThan(3);
      // a ajuda precisa dizer onde a pessoa pega a chave, não só o nome do CRM
      expect(a.ajuda.length).toBeGreaterThan(60);
    }
  });

  test("nenhum provedor ficou de fora do registro nem sobrando nele", () => {
    expect(Object.keys(ADAPTADORES).sort()).toEqual([...PROVEDORES].sort());
  });
});

describe("agendor", () => {
  test("negócio leva funil, etapa e ranking pela temperatura", () => {
    const corpo = corpoAgendor(canonico, ctx);
    expect(corpo.title).toBe("Padaria Aurora");
    expect(corpo.dealStatusText).toBe("ongoing");
    expect(corpo.funnel).toBe(7);
    expect(corpo.dealStage).toBe(21);
    expect(corpo.ranking).toBe(5);
  });

  test("campos personalizados só saem quando mapeados", () => {
    expect(customAgendor(canonico, ctx.mapaCampos)).toEqual({
      campo_objecao: "Achou o preço alto",
      campo_temp: "Quente",
    });
    expect(customAgendor(canonico, {})).toEqual({});
  });

  test("pessoa vai com cargo, telefone e organização", () => {
    expect(corpoPessoa(canonico, "99")).toEqual({
      name: "Dona Marli",
      role: "Proprietária",
      contact: { mobile: "+5511988887777" },
      organization: 99,
    });
  });
});

describe("rd station crm", () => {
  test("negociação cria empresa e contato no mesmo payload", () => {
    const corpo = corpoNegociacao(canonico, ctx) as Record<string, any>;
    expect(corpo.deal.name).toBe("Padaria Aurora");
    expect(corpo.deal.deal_stage_id).toBe("21");
    expect(corpo.deal.rating).toBe(3);
    expect(corpo.organization).toEqual({ name: "Padaria Aurora" });
    expect(corpo.contacts[0].phones).toEqual([{ phone: "+5511988887777" }]);
    expect(corpo.deal.deal_custom_fields).toEqual([
      { custom_field_id: "campo_objecao", value: "Achou o preço alto" },
      { custom_field_id: "campo_temp", value: "Quente" },
    ]);
  });

  test("tarefa separa data e hora", () => {
    const corpo = corpoTarefa(canonico, "555") as Record<string, any>;
    expect(corpo.task.deal_id).toBe("555");
    expect(corpo.task.date).toBe("2026-08-12");
    expect(corpo.task.hour).toBe("14:30");
  });
});

describe("ollow", () => {
  test("negócio manda createdBy, responsible e stage numéricos", () => {
    const corpo = corpoOllow(canonico, ctx, "12", { organizacao: "88", pessoa: "77" }) as Record<string, any>;
    expect(corpo.status).toBe("OPEN");
    expect(corpo.createdBy).toEqual({ id: 12 });
    expect(corpo.responsible).toEqual({ id: 12 });
    expect(corpo.stage).toEqual({ id: 21 });
    expect(corpo.companies).toEqual([{ id: 88 }]);
    expect(corpo.contacts).toEqual([{ id: 77 }]);
    expect(corpo.entityCustomFields).toEqual([
      { id: "campo_objecao", textValue: "Achou o preço alto" },
      { id: "campo_temp", textValue: "Quente" },
    ]);
  });
});

describe("pipedrive", () => {
  test("negócio manda etapa, funil e ids numéricos", () => {
    const corpo = corpoNegocioPipedrive(canonico, ctx, { organizacao: "88", pessoa: "77" }) as Record<
      string,
      any
    >;
    expect(corpo.title).toBe("Padaria Aurora");
    expect(corpo.status).toBe("open");
    expect(corpo.stage_id).toBe(21);
    expect(corpo.pipeline_id).toBe(7);
    expect(corpo.org_id).toBe(88);
    expect(corpo.person_id).toBe(77);
    expect(corpo.expected_close_date).toBe("2026-08-12");
  });

  test("campo personalizado do v2 vai aninhado sob a hash", () => {
    expect(customPipedrive(canonico, ctx.mapaCampos)).toEqual({
      campo_objecao: "Achou o preço alto",
      campo_temp: "Quente",
    });
    expect(corpoNegocioPipedrive(canonico, { ...ctx, mapaCampos: {} }, {}).custom_fields).toBeUndefined();
  });

  test("pessoa leva telefone em E.164 e a organização", () => {
    expect(corpoPessoaPipedrive(canonico, "88")).toEqual({
      name: "Dona Marli",
      org_id: 88,
      phones: [{ value: "+5511988887777", primary: true, label: "mobile" }],
    });
  });

  test("nota abre com o cargo do contato e amarra nos três registros", () => {
    const corpo = corpoNota(canonico, { negocio: "5", pessoa: "77", organizacao: "88" }) as Record<
      string,
      any
    >;
    expect(corpo.content.startsWith("Dona Marli — Proprietária\n")).toBe(true);
    expect(corpo.content).toContain("Relato de visita — 12/08/2026 14:30");
    expect(corpo.content).toContain("Próxima ação: Levar amostra da farinha");
    expect(corpo.deal_id).toBe(5);
    expect(corpo.person_id).toBe(77);
    expect(corpo.org_id).toBe(88);
  });

  test("atividade separa data e hora e nasce em aberto", () => {
    const corpo = corpoAtividade(canonico, "visita", { negocio: "5" }) as Record<string, any>;
    expect(corpo.subject).toBe("Levar amostra da farinha");
    expect(corpo.type).toBe("visita");
    expect(corpo.done).toBe(false);
    expect(corpo.due_date).toBe("2026-08-12");
    expect(corpo.due_time).toBe("14:30");
    expect(corpo.deal_id).toBe(5);
  });

  test("sem próxima ação não existe atividade", () => {
    expect(corpoAtividade({ ...canonico, tarefa: null }, "visita", {})).toBeNull();
  });

  test("relato sem data vai sem prazo em vez de falhar", () => {
    const semData = { ...canonico, tarefa: { texto: "Ligar", dataIso: "", hora: "" } };
    const corpo = corpoAtividade(semData, "task", {}) as Record<string, any>;
    expect(corpo.due_date).toBeUndefined();
    expect(corpo.due_time).toBeUndefined();
  });
});

describe("ploomes", () => {
  test("negócio usa o vocabulário do Ploomes", () => {
    const corpo = corpoNegocioPloomes(canonico, ctx, { organizacao: "88", pessoa: "77" }) as Record<
      string,
      any
    >;
    expect(corpo.Title).toBe("Padaria Aurora");
    expect(corpo.ContactId).toBe(88);
    expect(corpo.PersonId).toBe(77);
    expect(corpo.StageId).toBe(21);
    expect(corpo.OtherProperties).toEqual([
      { FieldKey: "campo_objecao", StringValue: "Achou o preço alto" },
      { FieldKey: "campo_temp", StringValue: "Quente" },
    ]);
  });

  test("campo personalizado só sai quando mapeado", () => {
    expect(customPloomes(canonico, {})).toEqual([]);
  });

  test("pessoa vira cliente do tipo pessoa ligada à empresa", () => {
    expect(corpoPessoaPloomes(canonico, "2", "88", "1")).toEqual({
      Name: "Dona Marli",
      TypeId: 2,
      CompanyId: 88,
      Phones: [{ PhoneNumber: "+5511988887777", TypeId: 1 }],
    });
  });

  test("sem tipo de telefone o telefone vai sem TypeId", () => {
    const corpo = corpoPessoaPloomes(canonico, "2", "", "") as Record<string, any>;
    expect(corpo.Phones).toEqual([{ PhoneNumber: "+5511988887777" }]);
    expect(corpo.CompanyId).toBeUndefined();
  });

  test("interação leva data com offset e cai no cliente empresa", () => {
    const corpo = corpoInteracao(canonico, { organizacao: "88", pessoa: "77", negocio: "5" }, "agora") as
      Record<string, any>;
    expect(corpo.Date).toBe("2026-08-12T14:30:00-03:00");
    expect(corpo.ContactId).toBe(88);
    expect(corpo.DealId).toBe(5);
    expect(corpo.Content).toContain("Resumo: Quer trocar o fornecedor de farinha.");
  });

  test("interação sem data da visita usa o agora recebido", () => {
    const semData = { ...canonico, extras: { ...canonico.extras, visitaEm: "" }, tarefa: null };
    expect((corpoInteracao(semData, {}, "agora") as Record<string, any>).Date).toBe("agora");
  });

  test("tarefa usa DateTime local, sem offset, e título de uma linha", () => {
    const corpo = corpoTarefaPloomes(canonico, { pessoa: "77", negocio: "5" }) as Record<string, any>;
    expect(corpo.Title).toBe("Levar amostra da farinha");
    expect(corpo.Description).toContain("Follow-up: Ligar antes de ir");
    expect(corpo.DateTime).toBe("2026-08-12T14:30:00");
    expect(corpo.ContactId).toBe(77);
    expect(corpo.DealId).toBe(5);
  });

  test("aspas simples no filtro OData são dobradas", () => {
    expect(literalOData("Bar do Zé's")).toBe("'Bar do Zé''s'");
  });
});

describe("cripto", () => {
  test("ida e volta preserva o token", () => {
    const guardado = cifrar(JSON.stringify({ token: "abc123" }));
    expect(guardado.startsWith("v1.")).toBe(true);
    expect(JSON.parse(decifrar(guardado))).toEqual({ token: "abc123" });
  });

  test("cifra diferente a cada chamada (iv aleatório)", () => {
    expect(cifrar("igual")).not.toBe(cifrar("igual"));
  });

  test("adulteração é rejeitada", () => {
    const guardado = cifrar("segredo");
    const partes = guardado.split(".");
    partes[3] = Buffer.from("outracoisa").toString("base64");
    expect(() => decifrar(partes.join("."))).toThrow();
  });

  test("máscara mostra só os últimos quatro", () => {
    expect(mascarar("abcdefgh")).toBe("••••efgh");
    expect(mascarar("ab")).toBe("••••");
  });
});
