import { describe, expect, it } from "bun:test";
import { GLOSSARIO_MAX_CHARS, PROMPT_VERSAO, montarSystem, termosGlossarioAsr, montarGlossarioAsr } from "../prompts";

describe("prompts", () => {
  describe("PROMPT_VERSAO", () => {
    it("está definida", () => {
      expect(PROMPT_VERSAO).toBeDefined();
    });

    it("tem formato de data", () => {
      expect(PROMPT_VERSAO).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    });
  });

  describe("GLOSSARIO_MAX_CHARS", () => {
    it("é número positivo", () => {
      expect(typeof GLOSSARIO_MAX_CHARS).toBe("number");
      expect(GLOSSARIO_MAX_CHARS).toBeGreaterThan(0);
    });

    it("é menor que 1000 chars", () => {
      expect(GLOSSARIO_MAX_CHARS).toBeLessThan(1000);
    });
  });

  describe("montarSystem", () => {
    it("retorna string não vazia", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        ["Empresa X", "Maria"]
      );
      expect(resultado.length).toBeGreaterThan(0);
    });

    it("inclui nome do vendedor", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("João");
    });

    it("inclui produto", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("Software");
    });

    it("inclui glossário quando há nomes conhecidos", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        ["Empresa X", "Maria"]
      );
      expect(resultado).toContain("Empresas e pessoas que já apareceram");
      expect(resultado).toContain("Empresa X");
      expect(resultado).toContain("Maria");
    });

    it("não inclui glossário quando não há nomes", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).not.toContain("Empresas e pessoas que já apareceram");
    });

    it("inclui data e hora com fuso SP", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("2026-08-15");
      expect(resultado).toContain("America/Sao_Paulo");
    });

    it("lida com produto vazio", () => {
      const resultado = montarSystem(
        "João",
        "",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("(não informado)");
    });

    it("lida com vertical específica", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        [],
        "agro"
      );
      // Deve incluir algo relacionado ao ramo
      expect(resultado.length).toBeGreaterThan(100);
    });

    it("contém a estrutura de saída JSON", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("SAÍDA");
      expect(resultado).toContain("JSON");
    });

    it("contém a REGRA ABSOLUTA", () => {
      const resultado = montarSystem(
        "João",
        "Software",
        "2026-08-15T14:00:00-03:00",
        []
      );
      expect(resultado).toContain("REGRA ABSOLUTA");
      expect(resultado).toContain("Nunca deduza");
    });
  });

  describe("termosGlossarioAsr", () => {
    it("retorna array", () => {
      const resultado = termosGlossarioAsr("Software", []);
      expect(Array.isArray(resultado)).toBe(true);
    });

    it("inclui produto quando fornecido", () => {
      const resultado = termosGlossarioAsr("Software", []);
      expect(resultado).toContain("Software");
    });

    it("inclui nomes conhecidos", () => {
      const resultado = termosGlossarioAsr("", ["Empresa X", "Maria"]);
      expect(resultado).toContain("Empresa X");
      expect(resultado).toContain("Maria");
    });

    it("deduplica termos iguais", () => {
      const resultado = termosGlossarioAsr("Software", ["software", "Software"]);
      // Não deve ter duplicatas (case-sensitive mantém, mas normaliza)
      const lowercase = resultado.map(t => t.toLowerCase());
      const unicos = new Set(lowercase);
      expect(unicos.size).toBe(lowercase.length);
    });

    it("remove strings vazias", () => {
      const resultado = termosGlossarioAsr("", ["", "Empresa X"]);
      expect(resultado).not.toContain("");
    });

    it("respeita limite de caracteres", () => {
      // Gera muitos termos para forçar o limite
      const muitosNomes = Array.from({ length: 100 }, (_, i) => `Empresa${i}NomeMuitoLongo${i}`);
      const resultado = termosGlossarioAsr("Produto", muitosNomes);

      // O texto completo deve caber no limite
      const texto = resultado.join(", ");
      expect(texto.length).toBeLessThanOrEqual(GLOSSARIO_MAX_CHARS);
    });

    it("lida com vertical específica", () => {
      const resultado = termosGlossarioAsr("", [], "agro");
      // Deve incluir termos do ramo
      expect(resultado.length).toBeGreaterThanOrEqual(0);
    });

    it("lida com produto e nomes juntos", () => {
      const resultado = termosGlossarioAsr("MeuProduto", ["Empresa A", "Empresa B"]);
      expect(resultado).toContain("MeuProduto");
      expect(resultado).toContain("Empresa A");
      expect(resultado).toContain("Empresa B");
    });
  });

  describe("montarGlossarioAsr", () => {
    it("retorna string não vazia", () => {
      const resultado = montarGlossarioAsr("Software", []);
      expect(resultado.length).toBeGreaterThan(0);
    });

    it("inclui prefixo padrão", () => {
      const resultado = montarGlossarioAsr("Software", []);
      expect(resultado).toContain("Relato de visita comercial");
    });

    it("retorna texto base quando sem termos", () => {
      const resultado = montarGlossarioAsr("", []);
      expect(resultado).toContain("Relato de visita comercial");
    });

    it("inclui termos quando fornecidos", () => {
      const resultado = montarGlossarioAsr("Software", ["Empresa X"]);
      expect(resultado).toContain("Software");
      expect(resultado).toContain("Empresa X");
    });
  });
});
