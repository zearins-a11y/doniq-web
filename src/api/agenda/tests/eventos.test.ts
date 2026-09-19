import { describe, expect, test } from "bun:test";
import {
  type LinhaCompromisso,
  type LinhaRelato,
  deCompromisso,
  deRelato,
  descricaoEvento,
  linkGoogle,
  ordenarEventos,
  paraIcs,
  selo,
  unirEventos,
} from "../eventos";

const relato = (over: Partial<LinhaRelato> = {}): LinhaRelato => ({
  relatoId: "r1",
  empresa: "Ferragens Silva",
  contato: "João",
  telefone: "(11) 99999-0000",
  proximaAcao: "Levar proposta de 200 unidades",
  resumo: "Cliente pediu prazo",
  dataIso: "2026-08-12",
  hora: "14:30",
  createdAt: "2026-08-11T20:00:00+00:00",
  ...over,
});

const compromisso = (over: Partial<LinhaCompromisso> = {}): LinhaCompromisso => ({
  compromissoId: "c1",
  empresa: "Metalúrgica Norte",
  contato: "Ana",
  telefone: "",
  objetivo: "Primeira visita",
  endereco: "Av. Brasil, 100",
  dataIso: "2026-08-12",
  hora: "09:00",
  minutos: 30,
  status: "aberto",
  relatoId: "",
  atualizadoEm: "2026-08-11T21:00:00+00:00",
  ...over,
});

describe("de onde vem o evento", () => {
  test("relato traz próxima ação como detalhe e se marca como gravado", () => {
    const ev = deRelato(relato());
    expect(ev.id).toBe("relato:r1");
    expect(ev.origem).toBe("relato");
    expect(ev.detalhe).toBe("Levar proposta de 200 unidades");
    expect(selo(ev)).toBe("gravada");
  });

  test("relato sem próxima ação cai no resumo", () => {
    expect(deRelato(relato({ proximaAcao: "" })).detalhe).toBe("Cliente pediu prazo");
  });

  test("relato sem empresa usa o contato, e não fica sem título", () => {
    expect(deRelato(relato({ empresa: "" })).titulo).toBe("João");
    expect(deRelato(relato({ empresa: "", contato: "" })).titulo).toBe("Visita sem empresa");
  });

  test("compromisso é intenção: selo 'a fazer' enquanto está aberto", () => {
    const ev = deCompromisso(compromisso());
    expect(ev.origem).toBe("compromisso");
    expect(ev.minutos).toBe(30);
    expect(ev.local).toBe("Av. Brasil, 100");
    expect(selo(ev)).toBe("a fazer");
  });

  test("status vira estado do cartão", () => {
    expect(selo(deCompromisso(compromisso({ status: "feito" })))).toBe("feita");
    expect(selo(deCompromisso(compromisso({ status: "cancelado" })))).toBe("cancelada");
  });

  test("minutos inválidos caem no padrão de uma hora", () => {
    expect(deCompromisso(compromisso({ minutos: 0 })).minutos).toBe(60);
  });
});

describe("juntar as duas origens", () => {
  test("compromisso que já virou relato gravado não aparece duas vezes", () => {
    const eventos = unirEventos([relato()], [compromisso({ relatoId: "r1" })]);
    expect(eventos.length).toBe(1);
    expect(eventos[0]?.origem).toBe("relato");
  });

  test("compromisso apontando para relato que não está na faixa continua aparecendo", () => {
    const eventos = unirEventos([relato()], [compromisso({ relatoId: "r9" })]);
    expect(eventos.length).toBe(2);
  });

  test("ordena por dia e hora, e quem não tem hora vai para o fim do dia", () => {
    const eventos = unirEventos(
      [relato({ relatoId: "r2", empresa: "Sem hora", hora: "" }), relato()],
      [compromisso()],
    );
    expect(eventos.map((e) => e.titulo)).toEqual([
      "Metalúrgica Norte",
      "Ferragens Silva",
      "Sem hora",
    ]);
  });

  test("empate de hora resolve por nome, em português", () => {
    const eventos = ordenarEventos([
      deRelato(relato({ relatoId: "b", empresa: "Ótica Lima" })),
      deRelato(relato({ relatoId: "a", empresa: "Alfa Peças" })),
    ]);
    expect(eventos.map((e) => e.titulo)).toEqual(["Alfa Peças", "Ótica Lima"]);
  });
});

describe("o que vai para o calendário", () => {
  test("descrição leva contato e telefone, nunca a transcrição", () => {
    const texto = descricaoEvento(deRelato(relato()));
    expect(texto).toContain("Levar proposta de 200 unidades");
    expect(texto).toContain("Contato: João — (11) 99999-0000");
    expect(texto).toContain("doniq");
  });

  test("UID é estável e não repete entre origens", () => {
    expect(paraIcs(deRelato(relato())).uid).toBe("relato-r1@doniq.com.br");
    expect(paraIcs(deCompromisso(compromisso())).uid).toBe("compromisso-c1@doniq.com.br");
    expect(paraIcs(deRelato(relato())).uid).toBe(paraIcs(deRelato(relato())).uid);
  });

  test("evento sem hora avisa no título, para não parecer horário de meia-noite", () => {
    const ics = paraIcs(deRelato(relato({ hora: "" })));
    expect(ics.titulo).toBe("Ferragens Silva (sem hora combinada)");
    expect(ics.hora).toBe("");
  });

  test("compromisso cancelado chega ao .ics marcado como cancelado", () => {
    expect(paraIcs(deCompromisso(compromisso({ status: "cancelado" }))).cancelado).toBe(true);
  });

  test("link do Google leva faixa de hora, fuso do Brasil e o local", () => {
    const url = new URL(linkGoogle(deCompromisso(compromisso())));
    expect(url.searchParams.get("dates")).toBe("20260812T090000/20260812T093000");
    expect(url.searchParams.get("ctz")).toBe("America/Sao_Paulo");
    expect(url.searchParams.get("location")).toBe("Av. Brasil, 100");
    expect(url.searchParams.get("text")).toBe("Metalúrgica Norte");
  });

  test("link do Google de evento sem hora usa só a data", () => {
    const url = new URL(linkGoogle(deCompromisso(compromisso({ hora: "" }))));
    expect(url.searchParams.get("dates")).toBe("20260812/20260812");
  });

  test("visita que passa da meia-noite não gera hora inválida no link", () => {
    const url = new URL(linkGoogle(deCompromisso(compromisso({ hora: "23:30", minutos: 60 }))));
    expect(url.searchParams.get("dates")).toBe("20260812T233000/20260812T003000");
  });
});
