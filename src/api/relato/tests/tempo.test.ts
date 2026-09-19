import { describe, expect, it } from "bun:test";
import { agoraBr, hojeBr, somarDias, amanhaBr, isoUtc, BR } from "../tempo";

describe("tempo", () => {
  describe("agoraBr", () => {
    it("retorna objeto com dia e iso", () => {
      const resultado = agoraBr(new Date("2026-08-15T14:30:00Z"));
      expect(resultado).toHaveProperty("dia");
      expect(resultado).toHaveProperty("iso");
    });

    it("converte para fuso SP", () => {
      const resultado = agoraBr(new Date("2026-08-15T18:00:00Z")); // 15:00 em SP
      // O formato ISO deve conter offset -03:00
      expect(resultado.iso).toMatch(/[-+]\d{2}:\d{2}$/);
    });

    it("lida com hora 24 como midnight", () => {
      const resultado = agoraBr(new Date("2026-08-15T23:59:59Z"));
      // Não deve falhar
      expect(resultado.dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("hojeBr", () => {
    it("retorna data no formato YYYY-MM-DD", () => {
      const resultado = hojeBr(new Date("2026-08-15T14:00:00Z"));
      expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("retorna data correta para data em UTC", () => {
      const resultado = hojeBr(new Date("2026-08-15T03:00:00Z")); // 00:00 em SP
      expect(resultado).toBe("2026-08-15");
    });
  });

  describe("somarDias", () => {
    it("soma dias corretamente", () => {
      expect(somarDias("2026-08-15", 1)).toBe("2026-08-16");
      expect(somarDias("2026-08-15", 10)).toBe("2026-08-25");
    });

    it("lida com mudança de mês", () => {
      expect(somarDias("2026-08-30", 1)).toBe("2026-08-31");
      expect(somarDias("2026-08-31", 1)).toBe("2026-09-01");
    });

    it("lida com mudança de ano", () => {
      expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    });

    it("lida com dias negativos", () => {
      expect(somarDias("2026-08-15", -1)).toBe("2026-08-14");
      expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
    });

    it("retorna zero dias corretamente", () => {
      expect(somarDias("2026-08-15", 0)).toBe("2026-08-15");
    });
  });

  describe("amanhaBr", () => {
    it("retorna dia seguinte ao hoje", () => {
      const hoje = hojeBr(new Date("2026-08-15T14:00:00Z"));
      const amanha = amanhaBr(new Date("2026-08-15T14:00:00Z"));
      expect(amanha).toBe(somarDias(hoje, 1));
    });
  });

  describe("isoUtc", () => {
    it("retorna ISO com offset UTC", () => {
      const resultado = isoUtc(new Date("2026-08-15T14:00:00Z"));
      expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?\+\d{2}:\d{2}$/);
    });

    it("remove sufixo Z e adiciona +00:00", () => {
      const resultado = isoUtc(new Date("2026-08-15T14:00:00Z"));
      expect(resultado).not.toContain("Z");
      expect(resultado).toContain("+00:00");
    });
  });

  describe("BR timezone constant", () => {
    it("é America/Sao_Paulo", () => {
      expect(BR).toBe("America/Sao_Paulo");
    });
  });
});
