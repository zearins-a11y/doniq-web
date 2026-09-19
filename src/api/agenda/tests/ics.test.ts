import { describe, expect, test } from "bun:test";
import {
  calendarioIcs,
  carimboUtc,
  dobrarLinha,
  escaparTexto,
  fimLocal,
  linhasEvento,
} from "../ics";

const AGORA = new Date("2026-08-11T20:30:00.000Z");

describe("escape de texto", () => {
  test("escapa o que o formato exige", () => {
    expect(escaparTexto("Ferragens; Silva, Ltda \\ ok")).toBe(
      "Ferragens\\; Silva\\, Ltda \\\\ ok",
    );
  });

  test("quebra de linha vira \\n literal", () => {
    expect(escaparTexto("linha 1\nlinha 2")).toBe("linha 1\\nlinha 2");
    expect(escaparTexto("linha 1\r\nlinha 2")).toBe("linha 1\\nlinha 2");
  });

  test("não escapa dois-pontos — escapar estraga a hora na descrição", () => {
    expect(escaparTexto("Retorno às 14:30")).toBe("Retorno às 14:30");
  });
});

describe("dobra de linha", () => {
  test("linha curta fica intacta", () => {
    expect(dobrarLinha("SUMMARY:Ferragens Silva")).toBe("SUMMARY:Ferragens Silva");
  });

  test("nenhuma linha passa de 75 octetos, contando bytes de UTF-8", () => {
    const linha = `DESCRIPTION:${"ação de cobrança à vista ".repeat(8)}`;
    const partes = dobrarLinha(linha).split("\r\n");
    expect(partes.length).toBeGreaterThan(1);
    for (const p of partes) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    }
  });

  test("continuação começa com espaço e o texto volta inteiro ao ser remontado", () => {
    const original = `SUMMARY:${"Distribuidora São José de Móveis e Estofados ".repeat(3)}`;
    const partes = dobrarLinha(original).split("\r\n");
    for (const p of partes.slice(1)) expect(p.startsWith(" ")).toBe(true);
    const remontado = partes.map((p, i) => (i === 0 ? p : p.slice(1))).join("");
    expect(remontado).toBe(original);
  });

  test("não parte caractere acentuado no meio (senão o cliente mostra lixo)", () => {
    const linha = `SUMMARY:${"ç".repeat(60)}`;
    const partes = dobrarLinha(linha).split("\r\n");
    for (const p of partes) expect(p.includes("�")).toBe(false);
    expect(partes.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(linha);
  });
});

describe("datas", () => {
  test("carimbo em UTC no formato do padrão", () => {
    expect(carimboUtc(AGORA)).toBe("20260811T203000Z");
  });

  test("fim local soma minutos e vira o dia quando precisa", () => {
    expect(fimLocal("2026-08-12", "14:30", 60)).toBe("20260812T153000");
    expect(fimLocal("2026-08-12", "23:30", 60)).toBe("20260813T003000");
    expect(fimLocal("2026-12-31", "23:00", 120)).toBe("20270101T010000");
  });
});

describe("evento", () => {
  test("com hora usa TZID e DTEND pela duração", () => {
    const linhas = linhasEvento(
      {
        uid: "compromisso-cmp_1@doniq.com.br",
        dia: "2026-08-12",
        hora: "14:30",
        minutos: 45,
        titulo: "Ferragens Silva",
      },
      AGORA,
    );
    expect(linhas).toContain("DTSTART;TZID=America/Sao_Paulo:20260812T143000");
    expect(linhas).toContain("DTEND;TZID=America/Sao_Paulo:20260812T151500");
    expect(linhas).toContain("STATUS:CONFIRMED");
  });

  test("sem hora vira dia inteiro com DTEND no dia seguinte (é exclusivo)", () => {
    const linhas = linhasEvento(
      { uid: "u@doniq.com.br", dia: "2026-08-31", hora: "", titulo: "Passar lá" },
      AGORA,
    );
    expect(linhas).toContain("DTSTART;VALUE=DATE:20260831");
    expect(linhas).toContain("DTEND;VALUE=DATE:20260901");
    expect(linhas.some((l) => l.startsWith("DTSTART;TZID"))).toBe(false);
  });

  test("alarme só existe quando há hora marcada", () => {
    const comHora = linhasEvento(
      { uid: "u@d", dia: "2026-08-12", hora: "09:00", titulo: "X", alarmeMin: 30 },
      AGORA,
    );
    expect(comHora).toContain("TRIGGER:-PT30M");
    const semHora = linhasEvento(
      { uid: "u@d", dia: "2026-08-12", hora: "", titulo: "X", alarmeMin: 30 },
      AGORA,
    );
    expect(semHora.some((l) => l.startsWith("BEGIN:VALARM"))).toBe(false);
  });

  test("cancelado sai como CANCELLED para o evento desaparecer de quem sincronizou", () => {
    const linhas = linhasEvento(
      { uid: "u@d", dia: "2026-08-12", hora: "09:00", titulo: "X", cancelado: true },
      AGORA,
    );
    expect(linhas).toContain("STATUS:CANCELLED");
  });
});

describe("calendário inteiro", () => {
  const texto = calendarioIcs(
    [
      {
        uid: "relato-r1@doniq.com.br",
        dia: "2026-08-12",
        hora: "14:30",
        titulo: "Ferragens Silva",
        descricao: "Levar proposta às 14:30",
      },
      { uid: "compromisso-c1@doniq.com.br", dia: "2026-08-13", hora: "", titulo: "Passar lá" },
    ],
    { nome: "Visitas — doniq", ttlHoras: 4, agora: AGORA },
  );

  test("termina com CRLF e não tem nenhum LF solto (Outlook rejeita)", () => {
    expect(texto.endsWith("\r\n")).toBe(true);
    expect(texto.replace(/\r\n/g, "")).not.toContain("\n");
  });

  test("abre e fecha o envelope e carrega o VTIMEZONE que Apple e Outlook exigem", () => {
    const linhas = texto.split("\r\n");
    expect(linhas[0]).toBe("BEGIN:VCALENDAR");
    expect(linhas.filter((l) => l === "END:VCALENDAR").length).toBe(1);
    expect(linhas).toContain("BEGIN:VTIMEZONE");
    expect(linhas).toContain("TZID:America/Sao_Paulo");
    expect(linhas).toContain("TZOFFSETTO:-0300");
  });

  test("um BEGIN:VEVENT por evento", () => {
    expect(texto.split("BEGIN:VEVENT").length - 1).toBe(2);
  });

  test("dica de atualização vai nos dois cabeçalhos, para clientes diferentes", () => {
    expect(texto).toContain("X-PUBLISHED-TTL:PT4H");
    expect(texto).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT4H");
  });

  test("nenhuma linha do arquivo passa de 75 octetos", () => {
    for (const l of texto.split("\r\n")) {
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    }
  });
});
