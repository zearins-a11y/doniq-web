import { describe, expect, test } from "bun:test";
import { chaveDedupe, paraCanonico, telefoneInternacional, type RelatoEntrada } from "../canonico";
import { isoComOffsetBr, isoUtcDe } from "../datas";
import { calcularBackoff, valeRetentar } from "../http";

function relato(extra: Partial<RelatoEntrada> = {}): RelatoEntrada {
  return {
    relatoId: "rel_abc123",
    clientId: null,
    empresa: "Padaria Aurora",
    contato: "Dona Marli",
    cargo: "Proprietária",
    telefone: "(11) 98888-7777",
    resumo: "Quer trocar o fornecedor de farinha.",
    transcricao: "Visitei a padaria Aurora hoje, falei com a dona Marli.",
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
    ...extra,
  };
}

describe("chaveDedupe", () => {
  test("usa o client_id quando existe", () => {
    expect(chaveDedupe({ relatoId: "rel_1", clientId: "Local-42" })).toBe("relato-visita:local-42");
  });

  test("cai no relato_id e limpa caracteres estranhos", () => {
    expect(chaveDedupe({ relatoId: "REL/99", clientId: null })).toBe("relato-visita:rel-99");
  });
});

describe("telefoneInternacional", () => {
  test("põe o 55 e o +", () => {
    expect(telefoneInternacional("(11) 98888-7777")).toBe("+5511988887777");
  });

  test("não duplica o 55 e devolve vazio quando não há número", () => {
    expect(telefoneInternacional("+55 11 98888-7777")).toBe("+5511988887777");
    expect(telefoneInternacional("")).toBe("");
  });
});

describe("paraCanonico", () => {
  test("mapeia empresa, pessoa e negócio", () => {
    const c = paraCanonico(relato());
    expect(c.organizacao.nome).toBe("Padaria Aurora");
    expect(c.pessoa).toEqual({
      nome: "Dona Marli",
      cargo: "Proprietária",
      telefone: "+5511988887777",
    });
    expect(c.negocio.titulo).toBe("Padaria Aurora");
    expect(c.negocio.temperatura).toBe("Quente");
    expect(c.negocio.tags).toEqual(["proposta"]);
  });

  test("descrição carrega objeção, concorrentes e números", () => {
    const { negocio } = paraCanonico(relato());
    expect(negocio.descricao).toContain("Objeção: Achou o preço alto");
    expect(negocio.descricao).toContain("Concorrentes: Moinho Sul");
    expect(negocio.descricao).toContain("Números citados: 30 sacos/mês");
  });

  test("anotação leva a transcrição inteira", () => {
    const c = paraCanonico(relato());
    expect(c.anotacao.texto).toContain("Relato de visita — 12/08/2026 14:30");
    expect(c.anotacao.texto).toContain("Transcrição:");
    expect(c.anotacao.texto).toContain("Visitei a padaria Aurora");
  });

  test("não vaza metadado interno do app", () => {
    const texto = JSON.stringify(paraCanonico(relato()));
    for (const proibido of ["evidencia", "confianca", "prompt_versao", "modelo", "faltou_perguntar"]) {
      expect(texto).not.toContain(proibido);
    }
  });

  test("sem próxima ação e sem follow-up, não há tarefa", () => {
    expect(paraCanonico(relato({ proximaAcao: "", followup: "" })).tarefa).toBeNull();
  });

  test("temperatura inválida cai em Morna", () => {
    expect(paraCanonico(relato({ temperatura: "" })).negocio.temperatura).toBe("Morna");
  });

  test("sem empresa o título usa o contato", () => {
    expect(paraCanonico(relato({ empresa: "" })).negocio.titulo).toBe("Dona Marli");
  });
});

describe("datas", () => {
  test("monta ISO com offset do Brasil", () => {
    expect(isoComOffsetBr("2026-08-12", "14:30")).toBe("2026-08-12T14:30:00-03:00");
  });

  test("hora ausente vira 09:00 e data inválida vira vazio", () => {
    expect(isoComOffsetBr("2026-08-12")).toBe("2026-08-12T09:00:00-03:00");
    expect(isoComOffsetBr("12/08/2026", "14:30")).toBe("");
  });

  test("converte para UTC com offset explícito, como o Ollow exige", () => {
    expect(isoUtcDe("2026-08-12", "14:30")).toBe("2026-08-12T17:30:00+00:00");
  });
});

describe("backoff", () => {
  test("respeita Retry-After", () => {
    const h = new Headers({ "retry-after": "5" });
    expect(calcularBackoff(1, h)).toBe(5000);
  });

  test("limite por minuto estourado espera um minuto", () => {
    const h = new Headers({ "x-ratelimit-remaining-minute": "0" });
    expect(calcularBackoff(1, h)).toBe(60000);
  });

  test("limite por segundo estourado espera um segundo", () => {
    const h = new Headers({ "x-ratelimit-remaining-second": "0" });
    expect(calcularBackoff(1, h)).toBe(1000);
  });

  test("sem headers, cresce exponencial com teto", () => {
    expect(calcularBackoff(1, null)).toBe(500);
    expect(calcularBackoff(2, null)).toBe(1000);
    expect(calcularBackoff(9, null)).toBe(8000);
  });

  test("só retenta no que vale a pena", () => {
    expect(valeRetentar(429)).toBe(true);
    expect(valeRetentar(503)).toBe(true);
    expect(valeRetentar(422)).toBe(false);
    expect(valeRetentar(401)).toBe(false);
  });
});
