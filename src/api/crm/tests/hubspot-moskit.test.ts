import { describe, expect, test } from "bun:test";
import { paraCanonico, type RelatoEntrada } from "../canonico";
import { AVALIACAO as hubspotAvaliacao, corpoDeal } from "../hubspot";
import { AVALIACAO as moskitAvaliacao, corpoDealMoskit, getCampoCanônico } from "../moskit";
import type { ContextoEnvio } from "../tipos";

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
  mapaCampos: { objecao: "campo_objecao", temperatura: "campo_temp", doniq_nota: "nota_campo" },
};

describe("hubspot", () => {
  test("avaliação mapeia temperatura para escala 1-5", () => {
    expect(hubspotAvaliacao["Quente"]).toBe(4);
    expect(hubspotAvaliacao["Morna"]).toBe(3);
    expect(hubspotAvaliacao["Fria"]).toBe(1);
    expect(hubspotAvaliacao["inexistente"]).toBeUndefined();
  });

  test("corpo do deal tem título truncado em 200 chars", () => {
    const nomeLongo = "A".repeat(300);
    const corpo = corpoDeal(nomeLongo, "Quente");
    expect(corpo.properties.dealname.length).toBe(200);
  });

  test("corpo do deal inclui etapa quando fornecida", () => {
    const corpo = corpoDeal("Padaria Aurora", "Quente", "stage_123");
    expect(corpo.properties.dealstage).toBe("stage_123");
  });

  test("corpo do deal não inclui etapa quando vazia", () => {
    const corpo = corpoDeal("Padaria Aurora", "Quente");
    expect(corpo.properties.dealstage).toBeUndefined();
  });

  test("corpo do deal mapeia temperatura para probability", () => {
    expect(corpoDeal("Teste", "quente").properties.hs_deal_stage_probability).toBe("4");
    expect(corpoDeal("Teste", "morna").properties.hs_deal_stage_probability).toBe("3");
    expect(corpoDeal("Teste", "fria").properties.hs_deal_stage_probability).toBe("1");
  });

  test("corpo do deal inclui campo customizado de nota quando mapeado", () => {
    const corpo = corpoDeal("Teste", "Quente", undefined, { doniq_nota: "nota_campo" }, "Texto da nota");
    expect(corpo.properties.nota_campo).toBe("Texto da nota");
  });

  test("corpo do deal trunca nota em 2000 caracteres", () => {
    const notaLonga = "A".repeat(3000);
    const corpo = corpoDeal("Teste", "Quente", undefined, { doniq_nota: "campo" }, notaLonga);
    expect(corpo.properties.campo.length).toBe(2000);
  });

  test("canônico gera pessoa com telefone em E.164", () => {
    expect(canonico.pessoa.telefone).toBe("+5511988887777");
  });

  test("canônico gera título com empresa ou contato", () => {
    expect(canonico.negocio.titulo).toBe("Padaria Aurora");
  });

  test("canônico gera anotação com transcrição", () => {
    expect(canonico.anotacao.texto).toContain("Transcrição:");
  });

  test("canônico gera tarefa quando há próxima ação", () => {
    expect(canonico.tarefa).not.toBeNull();
    expect(canonico.tarefa?.texto).toContain("Levar amostra da farinha");
  });

  test("canônico extra extras com campos canônicos", () => {
    expect(canonico.extras.objecao).toBe("Achou o preço alto");
    expect(canonico.extras.concorrentes).toEqual(["Moinho Sul"]);
    expect(canonico.extras.numeros).toEqual(["30 sacos/mês"]);
  });
});

describe("moskit", () => {
  test("avaliação mapeia temperatura para escala numérica", () => {
    expect(moskitAvaliacao["Quente"]).toBe(4);
    expect(moskitAvaliacao["Morna"]).toBe(3);
    expect(moskitAvaliacao["Fria"]).toBe(1);
  });

  test("getCampoCanônico extrai temperatura", () => {
    expect(getCampoCanônico(canonico, "temperatura")).toBe("Quente");
  });

  test("getCampoCanônico extrai objeção", () => {
    expect(getCampoCanônico(canonico, "objecao")).toBe("Achou o preço alto");
  });

  test("getCampoCanônico junta concorrentes com vírgula", () => {
    expect(getCampoCanônico(canonico, "concorrentes")).toBe("Moinho Sul");
  });

  test("getCampoCanônico junta números com ponto e vírgula", () => {
    expect(getCampoCanônico(canonico, "numeros")).toBe("30 sacos/mês");
  });

  test("getCampoCanônico retorna vazio para campo desconhecido", () => {
    expect(getCampoCanônico(canonico, "inexistente")).toBe("");
  });

  test("getCampoCanônico retorna chave do relato", () => {
    expect(getCampoCanônico(canonico, "chave_relato")).toBe(canonico.chave);
  });

  test("corpoDealMoskit inclui título truncado", () => {
    const nomeLongo = "B".repeat(300);
    const corpo = corpoDealMoskit(nomeLongo, "Quente");
    expect(corpo.name.length).toBe(200);
  });

  test("corpoDealMoskit inclui etapa quando fornecida", () => {
    const corpo = corpoDealMoskit("Teste", "Quente", "stage_456");
    expect(corpo.stageId).toBe("stage_456");
  });

  test("corpoDealMoskit não inclui etapa quando vazia", () => {
    const corpo = corpoDealMoskit("Teste", "Quente");
    expect(corpo.stageId).toBeUndefined();
  });

  test("corpoDealMoskit inclui funil quando fornecido", () => {
    const corpo = corpoDealMoskit("Teste", "Quente", undefined, "pipeline_789");
    expect(corpo.pipelineId).toBe("pipeline_789");
  });

  test("corpoDealMoskit mapeia temperatura para probability", () => {
    expect(corpoDealMoskit("Teste", "quente").probability).toBe(4);
    expect(corpoDealMoskit("Teste", "morna").probability).toBe(3);
    expect(corpoDealMoskit("Teste", "fria").probability).toBe(1);
  });

  test("corpoDealMoskit usa temperatura default quando desconhecida", () => {
    expect(corpoDealMoskit("Teste", "desconhecida").probability).toBe(3);
  });

  test("canônico preserva tags do relato", () => {
    expect(canonico.negocio.tags).toEqual(["proposta"]);
  });
});

describe("integração hubspot e moskit", () => {
  test("ambos usam mesma escala de temperatura", () => {
    expect(hubspotAvaliacao).toEqual(moskitAvaliacao);
  });

  test("ambos geram payloads válidos para o mesmo relato", () => {
    const titulo = canonico.negocio.titulo;
    const temperatura = canonico.negocio.temperatura;

    const hsDeal = corpoDeal(titulo, temperatura, ctx.etapaId);
    const mkDeal = corpoDealMoskit(titulo, temperatura, ctx.etapaId, ctx.funilId);

    // Ambos devem ter nome
    expect(hsDeal.properties.dealname).toBe(mkDeal.name);

    // HubSpot usa probability em probability (string), Moskit em probability (number)
    expect(hsDeal.properties.hs_deal_stage_probability).toBe(String(mkDeal.probability));
  });
});
