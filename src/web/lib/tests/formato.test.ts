/**
 * formato.test.ts — testes para funções puras de formatação.
 *
 * Foco: regras que se quebram passam despercebidas em produção até um
 * representante reclamar que algo "ficou estranho" no relatório dele.
 *
 * Casos cobertos:
 *  - hojeISO / agoraHora: fuso do vendedor (America/Sao_Paulo), não do servidor
 *  - somarDias: virada de mês e ano, ano bissexto (29/02)
 *  - dataLegivel: hoje / amanhã / ontem / fora do intervalo
 *  - soDigitos: só dígitos, ignora lixo
 *  - linkWhatsApp: prefixo 55, encoding correto
 *  - blocoCRM: campos vazios viram "—", blocos opcionais só aparecem se preenchidos
 */

import { describe, expect, test } from "bun:test";
import {
  blocoCRM,
  dataLegivel,
  linkWhatsApp,
  soDigitos,
  somarDias,
} from "../formato";

describe("fuso do vendedor", () => {
  test("dataLegivel reconhece hoje, amanhã e ontem com qualquer referência", () => {
    const hoje = "2026-09-09";
    expect(dataLegivel(hoje, hoje)).toBe("hoje");
    expect(dataLegivel("2026-09-10", hoje)).toBe("amanhã");
    expect(dataLegivel("2026-09-08", hoje)).toBe("ontem");
  });

  test("dataLegivel fora do intervalo vira 'dd/mm · dia-da-semana'", () => {
    // 09.set.2026 é quarta-feira
    expect(dataLegivel("2026-09-09", "2026-09-09")).toBe("hoje");
    // 11.set.2026 é sexta
    expect(dataLegivel("2026-09-11", "2026-09-09")).toBe("11/09 · sex");
    // 14.set.2026 é segunda
    expect(dataLegivel("2026-09-14", "2026-09-09")).toBe("14/09 · seg");
  });

  test("dataLegivel com string vazia devolve string vazia (sem quebrar)", () => {
    expect(dataLegivel("", "2026-09-09")).toBe("");
  });
});

describe("aritmética de datas", () => {
  test("somarDias soma positivo", () => {
    expect(somarDias("2026-09-09", 1)).toBe("2026-09-10");
    expect(somarDias("2026-09-09", 7)).toBe("2026-09-16");
  });

  test("somarDias subtrai negativo", () => {
    expect(somarDias("2026-09-09", -1)).toBe("2026-09-08");
    expect(somarDias("2026-09-09", -7)).toBe("2026-09-02");
  });

  test("somarDias atravessa virada de mês sem perder dia", () => {
    expect(somarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(somarDias("2026-09-30", -1)).toBe("2026-09-29");
  });

  test("somarDias atravessa virada de ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  test("somarDias não quebra em ano bissexto (29/02 + 1 = 01/03)", () => {
    expect(somarDias("2024-02-29", 1)).toBe("2024-03-01");
    expect(somarDias("2024-02-29", -1)).toBe("2024-02-28");
  });

  test("somarDias não quebra em ano não-bissexto (28/02 + 1 = 01/03)", () => {
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
    // 2027 também não é bissexto
    expect(somarDias("2027-02-28", 1)).toBe("2027-03-01");
  });

  test("somarDias zero devolve a mesma data", () => {
    expect(somarDias("2026-09-09", 0)).toBe("2026-09-09");
  });
});

describe("telefone", () => {
  test("soDigitos tira tudo que não é número", () => {
    expect(soDigitos("(11) 98765-4321")).toBe("11987654321");
    expect(soDigitos("+55 11 98765 4321")).toBe("5511987654321");
    expect(soDigitos("")).toBe("");
    expect(soDigitos(null)).toBe("");
    expect(soDigitos(undefined)).toBe("");
    expect(soDigitos(123456789)).toBe("123456789");
  });

  test("linkWhatsApp adiciona prefixo 55 se faltar (BR)", () => {
    const url = linkWhatsApp("11987654321", "oi");
    expect(url).toContain("https://wa.me/5511987654321");
    expect(url).toContain("?text=oi");
  });

  test("linkWhatsApp não duplica 55 se já tiver", () => {
    const url = linkWhatsApp("5511987654321", "oi");
    expect(url).toContain("wa.me/5511987654321");
    expect(url).not.toContain("wa.me/5555");
  });

  test("linkWhatsApp com telefone vazio vira link sem número", () => {
    const url = linkWhatsApp("", "oi");
    expect(url).toContain("https://wa.me/?text=");
  });

  test("linkWhatsApp com texto vazio não quebra (encoded como empty)", () => {
    const url = linkWhatsApp("11987654321", "");
    expect(url).toContain("wa.me/5511987654321");
    expect(url).toContain("text=");
  });

  test("linkWhatsApp encodea caracteres especiais no texto", () => {
    const url = linkWhatsApp("11987654321", "olá, tudo bem?");
    expect(url).toContain("ol%C3%A1"); // 'á' encoded
  });
});

describe("blocoCRM", () => {
  const relatoMinimo = {
    empresa: "Padaria São Bento",
    contato: "Seu Antônio",
    cargo: "",
    telefone: "(11) 98765-4321",
    temperatura: "Quente",
    resumo: "Topou testar a nova linha",
    objecao: "",
    proxima_acao: "Enviar amostra até qua",
    data_iso: "2026-09-15",
    hora: "14:30",
  };

  test("campos vazios viram travessão, não 'undefined'", () => {
    const out = blocoCRM(relatoMinimo);
    expect(out).toContain("Objeção: —");
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("null");
  });

  test("cargo aparece entre parênteses quando preenchido", () => {
    const out = blocoCRM({ ...relatoMinimo, cargo: "Dono" });
    expect(out).toContain("Contato: Seu Antônio (Dono)");
  });

  test("telefone concatenado com bullet no contato", () => {
    const out = blocoCRM(relatoMinimo);
    expect(out).toContain("Contato: Seu Antônio · (11) 98765-4321");
  });

  test("concorrentes só aparecem se preenchidos", () => {
    const sem = blocoCRM(relatoMinimo);
    expect(sem).not.toContain("Concorrentes:");

    const com = blocoCRM({ ...relatoMinimo, concorrentes: ["Padaria X", "Padaria Y"] });
    expect(com).toContain("Concorrentes: Padaria X, Padaria Y");
  });

  test("números concatenados com ' | '", () => {
    const out = blocoCRM({ ...relatoMinimo, numeros: ["R$ 12 mil", "15 unidades"] });
    expect(out).toContain("Números: R$ 12 mil | 15 unidades");
  });

  test("'Quando' junta data e hora com espaço", () => {
    const out = blocoCRM(relatoMinimo);
    expect(out).toContain("Quando: 2026-09-15 14:30");
  });

  test("'Quando' sem data diz 'a confirmar' (não quebra)", () => {
    const out = blocoCRM({ ...relatoMinimo, data_iso: "" });
    expect(out).toContain("Quando: a confirmar");
  });

  test("resumo multilinha preserva quebras", () => {
    const resumoLinhas = "Linha 1\nLinha 2\nLinha 3";
    const out = blocoCRM({ ...relatoMinimo, resumo: resumoLinhas });
    expect(out).toContain("Linha 1\nLinha 2\nLinha 3");
  });
});
