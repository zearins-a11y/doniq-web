import { describe, expect, test } from "bun:test";
import {
  agruparPorDia,
  diaDaSemana,
  diasNoMes,
  diasVazios,
  gradeDoMes,
  normalizarMes,
  semanaDe,
  somarMeses,
} from "../grade";

describe("peças de calendário", () => {
  test("dias no mês, inclusive fevereiro bissexto", () => {
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2028, 2)).toBe(29);
    expect(diasNoMes(2026, 4)).toBe(30);
    expect(diasNoMes(2026, 12)).toBe(31);
  });

  test("dia da semana com 0 = domingo", () => {
    expect(diaDaSemana("2026-08-09")).toBe(0);
    expect(diaDaSemana("2026-08-11")).toBe(2);
    expect(diaDaSemana("2026-08-15")).toBe(6);
  });

  test("normaliza mês e recusa lixo", () => {
    expect(normalizarMes("2026-08-12")).toBe("2026-08");
    expect(normalizarMes("2026-08")).toBe("2026-08");
    expect(() => normalizarMes("2026-13")).toThrow();
    expect(() => normalizarMes("agosto")).toThrow();
  });

  test("somar meses vira o ano nos dois sentidos", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(somarMeses("2026-08", 5)).toBe("2027-01");
  });
});

describe("grade do mês", () => {
  test("começa no domingo e cada semana tem 7 dias", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    for (const s of g.semanas) expect(s.length).toBe(7);
    expect(g.semanas[0]?.[0]?.dia).toBe("2026-07-26");
    expect(diaDaSemana(g.inicioGrade)).toBe(0);
  });

  test("cobre o mês inteiro e marca os dias vizinhos como de fora", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    const dias = g.semanas.flat();
    const doMes = dias.filter((d) => d.doMes).map((d) => d.dia);
    expect(doMes.length).toBe(31);
    expect(doMes[0]).toBe("2026-08-01");
    expect(doMes[30]).toBe("2026-08-31");
    expect(dias.filter((d) => !d.doMes).length).toBe(dias.length - 31);
  });

  test("marca hoje uma única vez", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    const hoje = g.semanas.flat().filter((d) => d.hoje);
    expect(hoje.length).toBe(1);
    expect(hoje[0]?.dia).toBe("2026-08-11");
  });

  test("mês visto de outro mês não marca hoje nenhum", () => {
    const g = gradeDoMes("2026-12", "2026-08-11");
    expect(g.semanas.flat().some((d) => d.hoje)).toBe(false);
  });

  test("fevereiro de 28 dias começando no domingo cabe em 4 semanas exatas", () => {
    const g = gradeDoMes("2026-02", "2026-02-10");
    expect(g.semanas[0]?.[0]?.dia).toBe("2026-02-01");
    expect(g.semanas.length).toBe(4);
    expect(g.fimGrade).toBe("2026-02-28");
  });

  test("virada de ano: dezembro puxa janeiro do ano seguinte", () => {
    const g = gradeDoMes("2026-12", "2026-12-01");
    expect(g.ultimoDia).toBe("2026-12-31");
    expect(g.fimGrade >= "2026-12-31").toBe(true);
    expect(g.semanas.flat().some((d) => d.dia.startsWith("2027-01"))).toBe(true);
  });

  test("rótulo em português para o cabeçalho", () => {
    expect(gradeDoMes("2026-08", "2026-08-11").rotulo).toBe("agosto de 2026");
    expect(gradeDoMes("2026-03", "2026-08-11").rotulo).toBe("março de 2026");
  });

  test("fim de semana marcado", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    const dia15 = g.semanas.flat().find((d) => d.dia === "2026-08-15");
    const dia12 = g.semanas.flat().find((d) => d.dia === "2026-08-12");
    expect(dia15?.fimDeSemana).toBe(true);
    expect(dia12?.fimDeSemana).toBe(false);
  });
});

describe("semana do celular", () => {
  test("sete dias começando no domingo da semana do dia dado", () => {
    const s = semanaDe("2026-08-11", "2026-08-11");
    expect(s.length).toBe(7);
    expect(s[0]?.dia).toBe("2026-08-09");
    expect(s[6]?.dia).toBe("2026-08-15");
    expect(s.filter((d) => d.hoje).length).toBe(1);
  });

  test("semana que atravessa o mês continua contínua", () => {
    const s = semanaDe("2026-09-01", "2026-09-01");
    expect(s[0]?.dia).toBe("2026-08-30");
    expect(s[6]?.dia).toBe("2026-09-05");
  });
});

describe("agrupar e cobrar agenda vazia", () => {
  test("agrupa por dia e ignora item sem data", () => {
    const mapa = agruparPorDia([
      { dia: "2026-08-11", id: "a" },
      { dia: "2026-08-11", id: "b" },
      { dia: "", id: "c" },
    ]);
    expect(mapa["2026-08-11"]?.length).toBe(2);
    expect(Object.keys(mapa)).toEqual(["2026-08-11"]);
  });

  test("dia vazio só conta dia útil, daqui pra frente", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    const vazios = diasVazios(g, ["2026-08-12"], "2026-08-11");
    expect(vazios).toContain("2026-08-11");
    expect(vazios).not.toContain("2026-08-12"); // ocupado
    expect(vazios).not.toContain("2026-08-10"); // passado
    expect(vazios).not.toContain("2026-08-15"); // sábado
    expect(vazios.every((d) => d.startsWith("2026-08"))).toBe(true);
  });

  test("mês todo ocupado não sobra dia vazio", () => {
    const g = gradeDoMes("2026-08", "2026-08-11");
    const todos = g.semanas.flat().map((d) => d.dia);
    expect(diasVazios(g, todos, "2026-08-01")).toEqual([]);
  });
});
