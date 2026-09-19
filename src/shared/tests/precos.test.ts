/**
 * precos.test.ts — regras de pricing que custam dinheiro se quebrarem.
 *
 * Por que importa: se alguém editar `planos.ts` com um valor errado, o copy
 * da landing vai mostrar "R$ 8,90 por vendedor/mês" e o vendedor pensa
 * que é mentira. Se o cálculo de economia anual estiver errado, o vendedor
 * escolhe errado entre plano mensal e anual.
 *
 * Casos cobertos:
 *  - preços não são negativos nem zero (não tem graça vender de graça)
 *  - anual < mensal (desconto real)
 *  - texto da landing bate com constantes (não tem divergência)
 *  - dias de teste é positivo e finito (não vira "1000 dias")
 *  - mínimo de vendedores é ≥ 1 (não aceita equipe vazia)
 *  - copy do CTA menciona os dias de teste
 *  - formato de moeda (R$ xx) está consistente
 */

import { describe, expect, test } from "bun:test";
import {
  ANUAL,
  DIAS_TESTE,
  MENSAL,
  MINIMO_VENDEDORES,
} from "../planos";
import { chamadaDoBotao, linhaDePreco } from "../landing-app";

describe("constantes de preço", () => {
  test("MENSAL é positivo e finito (não 0, negativo, NaN)", () => {
    expect(MENSAL).toBeGreaterThan(0);
    expect(Number.isFinite(MENSAL)).toBe(true);
  });

  test("ANUAL é positivo e finito", () => {
    expect(ANUAL).toBeGreaterThan(0);
    expect(Number.isFinite(ANUAL)).toBe(true);
  });

  test("ANUAL é menor que MENSAL (desconto real, não armadilha)", () => {
    expect(ANUAL).toBeLessThan(MENSAL);
  });

  test("ANUAL é pelo menos 10% mais barato que MENSAL", () => {
    // Garante que o desconto não virou cosmético (R$ 1,00 de diferença)
    const economia = ((MENSAL - ANUAL) / MENSAL) * 100;
    expect(economia).toBeGreaterThanOrEqual(10);
  });

  test("Economia anual por vendedor é pelo menos R$ 100/ano", () => {
    // 12 meses × (MENSAL - ANUAL)
    const economiaAnual = 12 * (MENSAL - ANUAL);
    expect(economiaAnual).toBeGreaterThanOrEqual(100);
  });

  test("DIAS_TESTE é positivo e finito", () => {
    expect(DIAS_TESTE).toBeGreaterThan(0);
    expect(Number.isFinite(DIAS_TESTE)).toBe(true);
    expect(DIAS_TESTE).toBeLessThan(365); // não vira "1 ano de teste grátis"
  });

  test("MINIMO_VENDEDORES é pelo menos 1 (não aceita equipe vazia)", () => {
    expect(MINIMO_VENDEDORES).toBeGreaterThanOrEqual(1);
  });
});

describe("copy da landing bate com constantes", () => {
  test("linhaDePreco() inclui MENSAL e ANUAL no formato correto", () => {
    const linha = linhaDePreco();
    expect(linha).toContain(`R$ ${MENSAL}`);
    expect(linha).toContain(`R$ ${ANUAL}`);
  });

  test("linhaDePreco() inclui os dias de teste", () => {
    const linha = linhaDePreco();
    expect(linha).toContain(`${DIAS_TESTE} dias`);
  });

  test("linhaDePreco() promete 'sem cartão' (gatilho de aquisição)", () => {
    expect(linhaDePreco()).toContain("sem cartão");
  });

  test("chamadaDoBotao() menciona os dias de teste", () => {
    expect(chamadaDoBotao()).toContain(`${DIAS_TESTE} dias`);
  });

  test("chamadaDoBotao() promete 'sem cartão' (gatilho de aquisição)", () => {
    expect(chamadaDoBotao()).toContain("sem cartão");
  });

  test("Copy não usa palavras proibidas (marketing agressivo)", () => {
    // A marca é direta, inteligente, confiante — sem promessas vazias
    const proibe = ["garantido", "100% garantido", "milagroso", "promoção por tempo limitado"];
    for (const termo of proibe) {
      expect(linhaDePreco().toLowerCase()).not.toContain(termo);
      expect(chamadaDoBotao().toLowerCase()).not.toContain(termo);
    }
  });
});

describe("cálculo de economia (simples)", () => {
  test("anual custa 12 × ANUAL por vendedor/ano", () => {
    const custoAnual = 12 * ANUAL;
    // Para o vendedor individual
    expect(custoAnual).toBeGreaterThan(0);
    expect(custoAnual).toBeLessThan(12 * MENSAL); // sempre mais barato
  });

  test("anual é mais barato que 12 meses no mensal", () => {
    const custoAnual = 12 * ANUAL;
    const custoMensal12m = 12 * MENSAL;
    expect(custoAnual).toBeLessThan(custoMensal12m);
  });

  test("economia anual por vendedor é mensurável", () => {
    const economiaAnual = 12 * (MENSAL - ANUAL);
    expect(economiaAnual).toBeGreaterThan(0);
    // Sanity check: razoável para o mercado brasileiro
    expect(economiaAnual).toBeLessThan(12 * MENSAL); // não pode ser mais que 100%
  });
});

describe("validação de formato", () => {
  test("MENSAL e ANUAL são inteiros (sem centavos quebrados)", () => {
    expect(Number.isInteger(MENSAL)).toBe(true);
    expect(Number.isInteger(ANUAL)).toBe(true);
  });

  test("DIAS_TESTE é inteiro", () => {
    expect(Number.isInteger(DIAS_TESTE)).toBe(true);
  });

  test("MINIMO_VENDEDORES é inteiro", () => {
    expect(Number.isInteger(MINIMO_VENDEDORES)).toBe(true);
  });

  test("linhaDePreco() não tem R$ sem valor (placeholder não preenchido)", () => {
    expect(linhaDePreco()).not.toMatch(/R\$\s*$/);
    // R$ deve ser seguido por dígito (não R$ + espaço + letra)
    expect(linhaDePreco()).toMatch(/R\$\s?\d/);
  });
});
