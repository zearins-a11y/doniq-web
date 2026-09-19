/**
 * exportar.test.ts — testes para os três formatos de exportação do relato.
 *
 * Por que importa: cada formato alimenta um canal diferente (CRM recebe
 * JSON, vendedor compartilha texto no WhatsApp, gestor arquiva Markdown).
 * Se uma chave vazar pro lugar errado (ex: número de telefone cair no
 * resumo), o erro só aparece quando alguém usa aquele canal.
 */

import { describe, expect, test } from "bun:test";
import type { Relato } from "../api";
import { exportar, exportarJson, exportarMarkdown, exportarTexto } from "../exportar";

/** Relato mínimo válido para os testes. */
function relatoBase(): Relato {
  return {
    relato_id: "r-001",
    user_id: "u-001",
    transcricao: "fui na padaria...",
    empresa: "Padaria São Bento",
    contato: "Seu Antônio",
    cargo: "Dono",
    telefone: "(11) 98765-4321",
    resumo: "Topou testar a nova linha de orgânicos em três SKUs.",
    resumo_narrativo: "O dono da padaria topou testar a nova linha de orgânicos.",
    email_cliente: "antonio@padariasaobento.com.br",
    proximas_perguntas: ["Qual o volume médio semanal?"],
    objecao: "",
    proxima_acao: "Enviar amostra até quarta",
    data_iso: "2026-09-15",
    hora: "14:30",
    temperatura: "Quente",
    faltou_perguntar: [],
    followup: "",
    precisa_confirmar: false,
    campo_a_confirmar: "",
    audio_ininteligivel: false,
    tags: ["orgânicos", "lançamento"],
    concorrentes: ["Padaria X"],
    numeros: ["R$ 12 mil"],
    evidencia: {},
    confianca: {},
    revisado: true,
    campos_a_revisar: [],
    tipo_visita: "prospeccao",
    roteiro: [],
    prompt_versao: "teste-v1",
    modelo: "teste",
    tokens_input: 120,
    tokens_output: 80,
    duracao_ms: 900,
    cache_key: "teste-r-001",
    created_at: "2026-09-15T14:30:00Z",
  };
}

describe("exportarJson", () => {
  test("retorna JSON válido parseável", () => {
    const out = exportarJson(relatoBase());
    const parsed = JSON.parse(out);
    expect(parsed.empresa).toBe("Padaria São Bento");
  });

  test("formata com indentação legível (2 espaços)", () => {
    const out = exportarJson(relatoBase());
    expect(out).toContain('  "empresa"');
  });

  test("não inclui campos vazios (cargo, objecao, followup, tags, concorrentes, numeros)", () => {
    const out = exportarJson({ ...relatoBase(), cargo: "", objecao: "", followup: "" });
    const parsed = JSON.parse(out);
    expect("cargo" in parsed && parsed.cargo !== undefined).toBe(false);
    expect("objecao" in parsed && parsed.objecao !== undefined).toBe(false);
    expect("followup" in parsed && parsed.followup !== undefined).toBe(false);
  });

  test("não inclui tags/concorrentes/numeros quando vazios", () => {
    const r = { ...relatoBase(), tags: [], concorrentes: [], numeros: [] };
    const parsed = JSON.parse(exportarJson(r));
    expect("tags" in parsed && parsed.tags !== undefined).toBe(false);
    expect("concorrentes" in parsed && parsed.concorrentes !== undefined).toBe(false);
    expect("numeros" in parsed && parsed.numeros !== undefined).toBe(false);
  });

  test("sempre inclui campos obrigatórios mesmo se vazios", () => {
    const r = { ...relatoBase(), empresa: "", contato: "", resumo: "" };
    const parsed = JSON.parse(exportarJson(r));
    expect("empresa" in parsed).toBe(true);
    expect("contato" in parsed).toBe(true);
    expect("resumo" in parsed).toBe(true);
  });

  test("junta data_iso e hora em 'quando' quando ambos presentes", () => {
    const parsed = JSON.parse(exportarJson(relatoBase()));
    expect(parsed.quando).toBe("2026-09-15 14:30");
  });

  test("'quando' sem hora fica só com a data", () => {
    const r = { ...relatoBase(), hora: "" };
    const parsed = JSON.parse(exportarJson(r));
    expect(parsed.quando).toBe("2026-09-15");
  });

  test("'quando' sem data não aparece no JSON", () => {
    const r = { ...relatoBase(), data_iso: "" };
    const parsed = JSON.parse(exportarJson(r));
    expect("quando" in parsed && parsed.quando !== undefined).toBe(false);
  });
});

describe("exportarTexto", () => {
  test("começa com Empresa e Contato", () => {
    const out = exportarTexto(relatoBase());
    expect(out.startsWith("Empresa: Padaria São Bento")).toBe(true);
    expect(out).toContain("Contato: Seu Antônio (Dono) · (11) 98765-4321");
  });

  test("travessão para campos opcionais vazios", () => {
    const r = { ...relatoBase(), objecao: "", proxima_acao: "" };
    const out = exportarTexto(r);
    expect(out).toContain("Objeção: —");
    expect(out).toContain("Próxima ação: —");
  });

  test("'Quando: a confirmar' quando não tem data", () => {
    const r = { ...relatoBase(), data_iso: "" };
    const out = exportarTexto(r);
    expect(out).toContain("Quando: a confirmar");
  });

  test("'Quando: 2026-09-15 14:30' quando tem ambos", () => {
    const out = exportarTexto(relatoBase());
    expect(out).toContain("Quando: 2026-09-15 14:30");
  });

  test("Concorrentes só aparece se preenchido", () => {
    const sem = exportarTexto({ ...relatoBase(), concorrentes: [] });
    expect(sem).not.toContain("Concorrentes:");

    const com = exportarTexto({ ...relatoBase(), concorrentes: ["Padaria X", "Padaria Y"] });
    expect(com).toContain("Concorrentes: Padaria X, Padaria Y");
  });

  test("Tags concatenadas com vírgula", () => {
    const out = exportarTexto(relatoBase());
    expect(out).toContain("Tags: orgânicos, lançamento");
  });

  test("Números concatenados com ' | '", () => {
    const out = exportarTexto({ ...relatoBase(), numeros: ["R$ 12 mil", "15 unidades"] });
    expect(out).toContain("Números: R$ 12 mil | 15 unidades");
  });

  test("Followup só aparece se preenchido (com prefixo 'Mensagem:')", () => {
    const sem = exportarTexto({ ...relatoBase(), followup: "" });
    expect(sem).not.toContain("Mensagem:");

    const com = exportarTexto({ ...relatoBase(), followup: "oi, voltei segunda" });
    expect(com).toContain("Mensagem:");
    expect(com).toContain("oi, voltei segunda");
  });

  test("Resumo preserva quebras de linha (multilinha)", () => {
    const out = exportarTexto({ ...relatoBase(), resumo: "Linha 1\nLinha 2" });
    expect(out).toContain("Resumo:\nLinha 1\nLinha 2");
  });
});

describe("exportarMarkdown", () => {
  test("começa com título H1 da empresa", () => {
    const out = exportarMarkdown(relatoBase());
    expect(out.startsWith("# Padaria São Bento")).toBe(true);
  });

  test("tabela inicial tem campos básicos", () => {
    const out = exportarMarkdown(relatoBase());
    expect(out).toContain("| Campo | Valor |");
    expect(out).toContain("|---|---|");
    expect(out).toContain("| Temperatura | Quente |");
    expect(out).toContain("| Revisado | ✅ sim |");
  });

  test("Revisado = ❌ não quando revisado=false", () => {
    const out = exportarMarkdown({ ...relatoBase(), revisado: false });
    expect(out).toContain("Revisado | ❌ não |");
  });

  test("'Quando' = _a confirmar_ (italic) quando sem data", () => {
    const out = exportarMarkdown({ ...relatoBase(), data_iso: "" });
    expect(out).toContain("| Quando | _a confirmar_ |");
  });

  test("Seções obrigatórias: Resumo e Próxima ação sempre presentes", () => {
    const out = exportarMarkdown({ ...relatoBase(), resumo: "", proxima_acao: "" });
    expect(out).toContain("## Resumo");
    expect(out).toContain("_não informado_");
    expect(out).toContain("## Próxima ação");
    expect(out).toContain("_não informada_");
  });

  test("Seção Concorrentes vira lista markdown quando preenchida", () => {
    const out = exportarMarkdown({ ...relatoBase(), concorrentes: ["Padaria X", "Padaria Y"] });
    expect(out).toContain("## Concorrentes");
    expect(out).toContain("- Padaria X");
    expect(out).toContain("- Padaria Y");
  });

  test("Concorrentes omitido quando vazio", () => {
    const out = exportarMarkdown({ ...relatoBase(), concorrentes: [] });
    expect(out).not.toContain("## Concorrentes");
  });

  test("Footer com data de geração em pt-BR", () => {
    const out = exportarMarkdown({ ...relatoBase(), created_at: "2026-09-15T14:30:00Z" });
    expect(out).toContain("Gerado pelo Doniq em");
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test("Mensagem pro cliente vira seção 'Mensagem pro cliente' se preenchida", () => {
    const out = exportarMarkdown({ ...relatoBase(), followup: "liguei hoje de manhã" });
    expect(out).toContain("## Mensagem pro cliente");
    expect(out).toContain("liguei hoje de manhã");
  });

  test("Gera string válida de markdown (sem quebrar)", () => {
    const out = exportarMarkdown(relatoBase());
    // Não deve ter ## duplicado ou marcadores quebrados
    expect(out.split("\n## ").length).toBeGreaterThan(2);
    // Linhas não-vazias com #
    expect(out).toMatch(/^# /m);
  });
});

describe("exportar dispatcher", () => {
  test("exportar com formato='json' chama exportarJson", () => {
    expect(exportar(relatoBase(), "json")).toBe(exportarJson(relatoBase()));
  });

  test("exportar com formato='texto' chama exportarTexto", () => {
    expect(exportar(relatoBase(), "texto")).toBe(exportarTexto(relatoBase()));
  });

  test("exportar com formato='markdown' chama exportarMarkdown", () => {
    expect(exportar(relatoBase(), "markdown")).toBe(exportarMarkdown(relatoBase()));
  });

  test("exportar com formato desconhecido cai em markdown (fallback)", () => {
    // @ts-expect-error: testando fallback intencional
    const out = exportar(relatoBase(), "xml");
    expect(out).toBe(exportarMarkdown(relatoBase()));
  });
});
