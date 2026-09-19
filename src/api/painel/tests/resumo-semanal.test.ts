/**
 * Resumo semanal por e-mail.
 *
 * O que estes testes protegem:
 *   - quem não registrou visita aparece com nome: é o ponto do resumo, porque o
 *     gargalo declarado do produto é hábito, não caixa;
 *   - semana vazia tem tom próprio, sem número fantasma;
 *   - a fala do vendedor não vaza para o e-mail do gestor, nem por engano;
 *   - o corpo cabe num e-mail lido no celular.
 */
import { expect, test } from "bun:test";
import type { Painel } from "../indicadores";
import { LIMITE_LISTA, diaCurto, montarResumoSemanal } from "../resumo-semanal";

function painel(p: Partial<Painel> = {}): Painel {
  return {
    hoje: "2026-08-11",
    equipe: { semana: 0, mes: 0, total: 0 },
    vendedores: [],
    objecoes: [],
    lacunas: [],
    sem_visita_na_semana: 0,
    ...p,
  };
}

const LINK = "https://doniq.com.br/equipe";

test("semana com visita traz o número da semana e o do mês", () => {
  const r = montarResumoSemanal({
    painel: painel({ equipe: { semana: 12, mes: 40, total: 90 } }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.semana_vazia).toBe(false);
  expect(r.assunto).toBe("Equipe Sul: 12 visitas na semana");
  expect(r.texto).toContain("12 visitas registradas");
  expect(r.texto).toContain("No mês: 40");
});

test("uma visita não vira '1 visitas'", () => {
  const r = montarResumoSemanal({
    painel: painel({ equipe: { semana: 1, mes: 1, total: 1 } }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.assunto).toContain("1 visita na");
  expect(r.texto).toContain("1 visita registrada");
});

test("semana vazia diz isso na cara, sem número fantasma", () => {
  const r = montarResumoSemanal({ painel: painel(), nomeEquipe: "Equipe Sul", linkPainel: LINK });
  expect(r.semana_vazia).toBe(true);
  expect(r.assunto).toContain("nenhuma visita");
  expect(r.texto).toContain("Nenhuma visita foi registrada");
});

test("quem está em silêncio aparece com nome e com a data da última visita", () => {
  const r = montarResumoSemanal({
    painel: painel({
      equipe: { semana: 3, mes: 9, total: 20 },
      sem_visita_na_semana: 1,
      vendedores: [
        { user_id: "u1", nome: "Carla", semana: 3, mes: 8, total: 18, ultima_visita: "2026-08-10" },
        { user_id: "u2", nome: "Marcos", semana: 0, mes: 1, total: 2, ultima_visita: "2026-07-28" },
      ],
    }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.texto).toContain("Carla: 3 visitas");
  expect(r.texto).toContain("Sem nenhuma visita registrada nos últimos 7 dias");
  expect(r.texto).toContain("Marcos (última em 28/07)");
});

test("vendedor que nunca registrou não fica com data em branco pendurada", () => {
  const r = montarResumoSemanal({
    painel: painel({
      vendedores: [{ user_id: "u3", nome: "Novato", semana: 0, mes: 0, total: 0, ultima_visita: "" }],
    }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.texto).toContain("Novato (nenhuma até hoje)");
  expect(r.texto).not.toContain("última em )");
});

test("equipe sem ninguém convida em vez de mostrar lista vazia", () => {
  const r = montarResumoSemanal({ painel: painel(), nomeEquipe: "Equipe Sul", linkPainel: LINK });
  expect(r.texto).toContain("ainda não tem vendedor");
});

test("objeções e lacunas entram contadas e limitadas ao que se lê no celular", () => {
  const muitas = Array.from({ length: 12 }, (_, n) => ({ texto: `motivo ${n}`, vezes: 12 - n }));
  const r = montarResumoSemanal({
    painel: painel({
      equipe: { semana: 5, mes: 5, total: 5 },
      objecoes: muitas,
      lacunas: [{ texto: "quem decide", vezes: 1 }],
    }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.texto).toContain("motivo 0 (12 vezes)");
  expect(r.texto).not.toContain(`motivo ${LIMITE_LISTA}`);
  expect(r.texto).toContain("quem decide (1 vez)");
});

test("lista vazia não deixa título órfão no corpo", () => {
  const r = montarResumoSemanal({
    painel: painel({ equipe: { semana: 2, mes: 2, total: 2 } }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.texto).not.toContain("clientes mais alegaram");
  expect(r.texto).not.toContain("faltou perguntar");
});

test("o resumo repete o limite de privacidade: gestor lê ficha, não gravação", () => {
  const r = montarResumoSemanal({ painel: painel(), nomeEquipe: "Equipe Sul", linkPainel: LINK });
  expect(r.texto).toContain("não aparecem para você");
});

test("sem nome de equipe o texto não fica com buraco", () => {
  const r = montarResumoSemanal({ painel: painel(), nomeEquipe: "", linkPainel: "" });
  expect(r.assunto).toContain("sua equipe");
  expect(r.texto.toLowerCase()).not.toContain("undefined");
  expect(r.texto).not.toContain("Painel completo:");
});

test("o corpo continua do tamanho de um e-mail, não de um relatório", () => {
  const r = montarResumoSemanal({
    painel: painel({
      equipe: { semana: 30, mes: 100, total: 400 },
      vendedores: Array.from({ length: 10 }, (_, n) => ({
        user_id: `u${n}`,
        nome: `Vendedor ${n}`,
        semana: n % 3,
        mes: n,
        total: n * 2,
        ultima_visita: "2026-08-09",
      })),
      objecoes: Array.from({ length: 8 }, (_, n) => ({ texto: `objeção ${n}`, vezes: 8 - n })),
      lacunas: Array.from({ length: 8 }, (_, n) => ({ texto: `lacuna ${n}`, vezes: 8 - n })),
    }),
    nomeEquipe: "Equipe Sul",
    linkPainel: LINK,
  });
  expect(r.texto.split("\n").length).toBeLessThan(45);
});

test("diaCurto vira dia/mês e não quebra com lixo", () => {
  expect(diaCurto("2026-08-11")).toBe("11/08");
  expect(diaCurto("")).toBe("");
  expect(diaCurto("nada")).toBe("nada");
});
