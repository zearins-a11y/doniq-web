/**
 * Testes para as funções exportadas de routes/relatos.ts
 * e utilitários relacionados usados nos handlers.
 */
import { describe, expect, test } from "bun:test";
import { LIMITE_HISTORICO, paraApi } from "../relatos";
import { tipoValido } from "../../relato/checklist";
import { normalizarTelefone } from "../../relato/validators";

describe("LIMITE_HISTORICO", () => {
  test("é 200", () => {
    expect(LIMITE_HISTORICO).toBe(200);
  });
});

describe("paraApi", () => {
  test("mapeia todos os campos do schema para formato API", () => {
    const row = {
      relatoId: "rel_abc",
      userId: "user_x",
      transcricao: "visitei a firma",
      empresa: "Firma X",
      contato: "João",
      cargo: "Gerente",
      telefone: "(11) 99999-0000",
      resumo: "interessado",
      objecao: "preço alto",
      proximaAcao: "ligar semana que vem",
      dataIso: "2026-08-12",
      hora: "14:30",
      temperatura: "quente",
      faltouPerguntar: null,
      followup: null,
      precisaConfirmar: true,
      campoAConfirmar: "preço",
      audioIninteligivel: false,
      tags: ["prospeccao"],
      concorrentes: ["Concorrente A"],
      numeros: ["30 unidades"],
      evidencia: { empresa: "visita" },
      confianca: { empresa: "alta" },
      revisado: false,
      camposARevisar: null,
      tipoVisita: "prospeccao",
      roteiro: [],
      promptVersao: "2026-08-11.1",
      modelo: "anthropic/claude-sonnet-4-20250514",
      createdAt: "2026-08-12T14:30:00Z",
    } as Parameters<typeof paraApi>[0];

    const result = paraApi(row);

    expect(result.relato_id).toBe("rel_abc");
    expect(result.user_id).toBe("user_x");
    expect(result.empresa).toBe("Firma X");
    expect(result.temperatura).toBe("quente");
    expect(result.precisa_confirmar).toBe(true);
    expect(result.audio_ininteligivel).toBe(false);
    expect(result.tags).toEqual(["prospeccao"]);
    expect(result.concorrentes).toEqual(["Concorrente A"]);
    expect(result.evidencia).toEqual({ empresa: "visita" });
    expect(result.confianca).toEqual({ empresa: "alta" });
    expect(result.modelo).toBe("anthropic/claude-sonnet-4-20250514");
  });

  test("nulos viram padrões", () => {
    const row = {
      relatoId: "rel_x",
      userId: "u",
      transcricao: "x",
      empresa: "",
      contato: "",
      cargo: "",
      telefone: "",
      resumo: "",
      objecao: "",
      proximaAcao: "",
      dataIso: "",
      hora: "",
      temperatura: "",
      faltouPerguntar: null,
      followup: null,
      precisaConfirmar: null,
      campoAConfirmar: null,
      audioIninteligivel: null,
      tags: null,
      concorrentes: null,
      numeros: null,
      evidencia: null,
      confianca: null,
      revisado: null,
      camposARevisar: null,
      tipoVisita: null,
      roteiro: null,
      promptVersao: null,
      modelo: null,
      createdAt: "",
    } as Parameters<typeof paraApi>[0];

    const result = paraApi(row);

    expect(result.faltou_perguntar).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.concorrentes).toEqual([]);
    expect(result.numeros).toEqual([]);
    expect(result.evidencia).toEqual({});
    expect(result.confianca).toEqual({});
    expect(result.campos_a_revisar).toEqual([]);
    expect(result.roteiro).toEqual([]);
  });

  test("preserva arrays existentes", () => {
    const row = {
      relatoId: "rel_x",
      userId: "u",
      transcricao: "x",
      empresa: "X",
      contato: "Y",
      cargo: "",
      telefone: "",
      resumo: "",
      objecao: "",
      proximaAcao: "",
      dataIso: "",
      hora: "",
      temperatura: "",
      faltouPerguntar: ["quem decide?"],
      followup: null,
      precisaConfirmar: null,
      campoAConfirmar: null,
      audioIninteligivel: null,
      tags: ["a", "b"],
      concorrentes: null,
      numeros: null,
      evidencia: null,
      confianca: null,
      revisado: null,
      camposARevisar: null,
      tipoVisita: null,
      roteiro: null,
      promptVersao: null,
      modelo: null,
      createdAt: "",
    } as Parameters<typeof paraApi>[0];

    const result = paraApi(row);

    expect(result.faltou_perguntar).toEqual(["quem decide?"]);
    expect(result.tags).toEqual(["a", "b"]);
  });
});

describe("tipoValido", () => {
  test("retorna tipo existente", () => {
    expect(tipoValido("prospeccao")).toBe("prospeccao");
    expect(tipoValido("retorno")).toBe("retorno");
    expect(tipoValido("fechamento")).toBe("fechamento");
    expect(tipoValido("posvenda")).toBe("posvenda");
  });

  test("string desconhecido retorna padrão prospeccao", () => {
    expect(tipoValido("invalido")).toBe("prospeccao");
    expect(tipoValido("")).toBe("prospeccao");
    expect(tipoValido(null)).toBe("prospeccao");
    expect(tipoValido(undefined)).toBe("prospeccao");
  });

  test("número é convertido para string", () => {
    expect(tipoValido(123 as unknown)).toBe("prospeccao");
  });
});

// AvaliarRoteiro já tem cobertura em packages/web/src/api/relato/tests/checklist.test.ts
// Aqui testamos só o que pertence estritamente a routes/relatos.ts

describe("normalizarTelefone", () => {
  // normalizarTelefone formata DDD de 8 ou 9 dígitos
  test("formata telefone de 9 dígitos", () => {
    expect(normalizarTelefone("11988887777")).toBe("(11) 98888-7777");
  });

  test("formata telefone de 8 dígitos", () => {
    expect(normalizarTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  test("número curto demais retorna vazio", () => {
    expect(normalizarTelefone("123")).toBe("");
    expect(normalizarTelefone("")).toBe("");
  });

  test("remove caracteres não-dígitos do input", () => {
    expect(normalizarTelefone("(11) 98888-7777")).toBe("(11) 98888-7777");
  });
});
