import { describe, expect, it } from "bun:test";
import { classificarCategoriaObjecao } from "../objecoes";
import type { EventoAgenda, Relato } from "../api";

describe("Lógica de Qualificação de Leads & Filtros Comerciais", () => {
  const relatosExemplo: Partial<Relato>[] = [
    {
      relato_id: "1",
      empresa: "Metalúrgica São Paulo",
      contato: "Carlos",
      temperatura: "quente",
      proxima_acao: "Enviar proposta técnica revisada",
      data_iso: "2026-09-20",
      objecao: "",
    },
    {
      relato_id: "2",
      empresa: "Hospital Santa Clara",
      contato: "Dra. Renata",
      temperatura: "quente",
      proxima_acao: "Ligar para agendar reunião clínica",
      data_iso: "", // Prazo pendente
      objecao: "Achou a mensalidade cara e o orçamento está apertado neste trimestre",
    },
    {
      relato_id: "3",
      empresa: "Agro Sol Alimentos",
      contato: "Marcos",
      temperatura: "morna",
      proxima_acao: "Apresentar para o sócio diretor",
      data_iso: "2026-09-25",
      objecao: "Depende da aprovação da diretoria e do comitê",
    },
    {
      relato_id: "4",
      empresa: "Transportes Rápido",
      contato: "Fernando",
      temperatura: "fria",
      proxima_acao: "Retomar no próximo ano fiscal",
      data_iso: "", // Prazo pendente
      objecao: "Projeto em standby, pedir para ligar ano que vem",
    },
    {
      relato_id: "5",
      empresa: "Clínica Vida",
      contato: "Mariana",
      temperatura: "morna",
      proxima_acao: "Demonstrar migração sem riscos",
      data_iso: "2026-09-22",
      objecao: "Medo que o sistema pare o atendimento no consultório",
    },
    {
      relato_id: "6",
      empresa: "Distribuidora Vale",
      contato: "Roberto",
      temperatura: "quente",
      proxima_acao: "Confirmar se diretoria assina na quarta",
      data_iso: "2026-09-21",
      precisa_confirmar: true, // Prazo pendente por confirmação
      objecao: "",
    },
  ];

  it("classifica corretamente as famílias de objeção dos relatos", () => {
    expect(classificarCategoriaObjecao(relatosExemplo[1].objecao!)).toBe("preco");
    expect(classificarCategoriaObjecao(relatosExemplo[2].objecao!)).toBe("decisor");
    expect(classificarCategoriaObjecao(relatosExemplo[3].objecao!)).toBe("timing");
    expect(classificarCategoriaObjecao(relatosExemplo[4].objecao!)).toBe("risco");
  });

  it("identifica corretamente visitas com objeções registradas", () => {
    const comObjecao = relatosExemplo.filter((r) => Boolean(r.objecao?.trim()));
    expect(comObjecao.length).toBe(4);
    expect(comObjecao.map((r) => r.empresa)).toEqual([
      "Hospital Santa Clara",
      "Agro Sol Alimentos",
      "Transportes Rápido",
      "Clínica Vida",
    ]);
  });

  it("filtra visitas por subcategoria específica de objeção", () => {
    const comPreco = relatosExemplo.filter(
      (r) => r.objecao && classificarCategoriaObjecao(r.objecao) === "preco",
    );
    expect(comPreco.length).toBe(1);
    expect(comPreco[0].empresa).toBe("Hospital Santa Clara");

    const comDecisor = relatosExemplo.filter(
      (r) => r.objecao && classificarCategoriaObjecao(r.objecao) === "decisor",
    );
    expect(comDecisor.length).toBe(1);
    expect(comDecisor[0].empresa).toBe("Agro Sol Alimentos");
  });

  it("identifica visitas com prazo de próximo passo pendente", () => {
    const pendentes = relatosExemplo.filter(
      (r) => Boolean(r.proxima_acao) && (!r.data_iso || Boolean(r.precisa_confirmar)),
    );
    expect(pendentes.length).toBe(3);
    expect(pendentes.map((r) => r.empresa)).toEqual([
      "Hospital Santa Clara",
      "Transportes Rápido",
      "Distribuidora Vale",
    ]);
  });

  it("filtra pendências da agenda combinando temperatura e objeção", () => {
    const eventosAgenda: Partial<EventoAgenda>[] = [
      { id: "1", titulo: "Hospital Santa Clara", temperatura: "quente", objecao: "Preço alto" },
      { id: "2", titulo: "Transportes Rápido", temperatura: "fria", objecao: "Ligar ano que vem" },
      { id: "3", titulo: "Comercial Alfa", temperatura: "quente", objecao: "" },
      { id: "4", titulo: "Beta Serviços", temperatura: "morna", objecao: "" },
    ];

    const quentes = eventosAgenda.filter((e) => e.temperatura === "quente");
    expect(quentes.length).toBe(2);

    const comObjecao = eventosAgenda.filter((e) => Boolean(e.objecao?.trim()));
    expect(comObjecao.length).toBe(2);

    const quentesComObjecao = eventosAgenda.filter(
      (e) => e.temperatura === "quente" && Boolean(e.objecao?.trim()),
    );
    expect(quentesComObjecao.length).toBe(1);
    expect(quentesComObjecao[0].titulo).toBe("Hospital Santa Clara");
  });
});
