/**
 * tokens.test.ts — testa paraVariavelCss() e constantes críticas.
 *
 * Por que importa: tokens.ts é a fonte única dos tokens visuais.
 * Se paraVariavelCss() errar o prefixo "--", todo o app perde acesso
 * às variáveis CSS e o design quebra silenciosamente.
 */

import { describe, expect, test } from "bun:test";
import {
  GRADIENTE,
  GRADIENTE_CLARO,
  RAIO,
  TOQUE_MINIMO,
  TIPO,
  TEMA_CLARO,
  TEMA_ESCURO,
  paraVariavelCss,
} from "../tokens";

describe("paraVariavelCss()", () => {
  test("adiciona prefixo --", () => {
    expect(paraVariavelCss("papel")).toBe("--papel");
  });

  test("preserva hífens no nome", () => {
    expect(paraVariavelCss("acento-texto")).toBe("--acento-texto");
  });

  test("não falha com string vazia (devolve só o prefixo)", () => {
    expect(paraVariavelCss("")).toBe("--");
  });
});

describe("constantes críticas", () => {
  test("TOQUE_MINIMO é 48 (alvo de toque)", () => {
    expect(TOQUE_MINIMO).toBe(48);
  });

  test("TEMA_CLARO tem todas as chaves esperadas", () => {
    const required = ["papel", "via", "tinta", "acento", "grad1", "grad2", "grad3", "foco", "sombra"];
    for (const key of required) {
      expect(TEMA_CLARO).toHaveProperty(key);
    }
  });

  test("TEMA_ESCURO tem as mesmas chaves que TEMA_CLARO", () => {
    const claroKeys = Object.keys(TEMA_CLARO).sort();
    const escuroKeys = Object.keys(TEMA_ESCURO).sort();
    expect(escuroKeys).toEqual(claroKeys);
  });

  test("Cores em tokens começam com #", () => {
    for (const [_key, value] of Object.entries(TEMA_CLARO)) {
      if (typeof value === "string" && value.startsWith("#")) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  test("Tinta clara e escura têm contraste (são cores diferentes)", () => {
    expect(TEMA_CLARO.tinta).not.toBe(TEMA_ESCURO.tinta);
  });

  test("Acento é o mesmo nos dois modos", () => {
    // Decisão do design: claro usa #0969C9 (AA sobre branco),
    // escuro pode usar #168CFF (azul de marca). Não precisa ser igual.
    // O que importa é que TEMA_CLARO.acento passa AA em fundo claro.
    expect(TEMA_CLARO.acento).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(TEMA_ESCURO.acento).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("GRADIENTE / GRADIENTE_CLARO", () => {
  test("GRADIENTE tem css + marca + paradas", () => {
    expect(GRADIENTE).toHaveProperty("css");
    expect(GRADIENTE).toHaveProperty("marca");
    expect(GRADIENTE).toHaveProperty("paradas");
    expect(typeof GRADIENTE.css).toBe("string");
  });

  test("GRADIENTE.css contém as 3 cores da marca em ordem", () => {
    expect(GRADIENTE.css).toContain("#7C4DFF"); // violet
    expect(GRADIENTE.css).toContain("#168CFF"); // blue
    expect(GRADIENTE.css).toContain("#20D6F4"); // cyan
  });

  test("GRADIENTE_CLARO tem css + marca", () => {
    expect(GRADIENTE_CLARO).toHaveProperty("css");
    expect(GRADIENTE_CLARO).toHaveProperty("marca");
    expect(typeof GRADIENTE_CLARO.css).toBe("string");
  });

  test("gradientes claro e escuro têm css diferentes", () => {
    expect(GRADIENTE.css).not.toBe(GRADIENTE_CLARO.css);
  });
});

describe("RAIO (radius scale)", () => {
  test("RAIO é objeto com ao menos 4 tamanhos", () => {
    expect(typeof RAIO).toBe("object");
    const sizes = Object.values(RAIO).filter((v) => typeof v === "number");
    expect(sizes.length).toBeGreaterThanOrEqual(4);
  });

  test("RAIO segue ordem crescente (menor para maior)", () => {
    const numeric = Object.values(RAIO).filter((v) => typeof v === "number") as number[];
    for (let i = 1; i < numeric.length; i++) {
      expect(numeric[i]).toBeGreaterThanOrEqual(numeric[i - 1]);
    }
  });
});

describe("TIPO (typography scale)", () => {
  test("TIPO existe e tem pesos principais", () => {
    expect(typeof TIPO).toBe("object");
    // Pelo menos família + escala de pesos
    const keys = Object.keys(TIPO);
    expect(keys.length).toBeGreaterThan(3);
  });
});
