import { expect, test } from "bun:test";
import {
  camposParaRevisar,
  lista,
  normalizarRelato,
  normalizarTelefone,
} from "../validators";

const HOJE = "2026-08-04";
const FALA =
  "passei na cirurgica parana agora, falei com o marcelo do cme, " +
  "ele achou o preco salgado, ta comparando com a medstar, " +
  "pediu proposta ate dia 12, falou em umas 40 unidades por mes";

function base(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    empresa: "Cirúrgica Paraná",
    contato: "Marcelo",
    cargo: "CME",
    resumo: "achou caro",
    objecao: "preço",
    proxima_acao: "mandar proposta",
    data_iso: "2026-08-12",
    evidencia: {
      empresa: "passei na cirurgica parana",
      contato: "falei com o marcelo",
      cargo: "marcelo do cme",
      objecao: "achou o preco salgado",
      proxima_acao: "pediu proposta",
      data_iso: "ate dia 12",
    },
    confianca: {
      empresa: "alta",
      contato: "alta",
      cargo: "alta",
      objecao: "alta",
      proxima_acao: "alta",
      data_iso: "alta",
    },
    ...extra,
  };
}

test("caminho feliz", () => {
  const r = normalizarRelato(base(), HOJE, FALA);
  expect(r.empresa).toBe("Cirúrgica Paraná");
  expect(r.data_iso).toBe("2026-08-12");
  expect(r.hora).toBe("09:00"); // default quando há data e não há hora
  expect(r.precisa_confirmar).toBe(false);
  expect(camposParaRevisar(r)).toEqual([]);
});

test("temperatura inválida cai para morna", () => {
  expect(normalizarRelato(base({ temperatura: "quente|morna|fria" }), HOJE, FALA).temperatura).toBe("morna");
  expect(normalizarRelato(base({ temperatura: "Quente" }), HOJE, FALA).temperatura).toBe("quente");
  expect(normalizarRelato(base({ temperatura: "fervendo" }), HOJE, FALA).temperatura).toBe("morna");
});

test("sem data força confirmação", () => {
  const r = normalizarRelato(base({ data_iso: "" }), HOJE, FALA);
  expect(r.data_iso).toBe("");
  expect(r.hora).toBe("");
  expect(r.precisa_confirmar).toBe(true);
  expect(r.campo_a_confirmar).toBe("data");
});

test("texto de 'não sei' vira vazio", () => {
  const r = normalizarRelato(base({ cargo: "não informado", contato: "N/A" }), HOJE, FALA);
  expect(r.cargo).toBe("");
  expect(r.contato).toBe("");
});

test("lista aceita string", () => {
  expect(lista("quem decide?; qual o volume?", 3)).toEqual(["quem decide?", "qual o volume?"]);
  expect(lista(null, 3)).toEqual([]);
  expect(lista(["a", "a", "b"], 3)).toEqual(["a", "b"]); // sem repetição
  expect(lista(["a", "b", "c", "d"], 3).length).toBe(3); // respeita o teto
});

test("telefone", () => {
  expect(normalizarTelefone("41991234567")).toBe("(41) 99123-4567");
  expect(normalizarTelefone("+55 41 99123-4567")).toBe("(41) 99123-4567");
  expect(normalizarTelefone("liga pra mim")).toBe("");
});

test("audio ininteligível zera tudo", () => {
  const r = normalizarRelato({ audio_ininteligivel: true, empresa: "Fantasma" }, HOJE, FALA);
  expect(r.audio_ininteligivel).toBe(true);
  expect(r.empresa).toBe("");
});

test("relato sem nada é descartado", () => {
  const r = normalizarRelato({ empresa: "", contato: "", resumo: "" }, HOJE, "ahn");
  expect(r.audio_ininteligivel).toBe(true);
});

test("tag inventada é descartada", () => {
  const r = normalizarRelato(base({ tags: ["apressado", "eufórico", "decisor"] }), HOJE, FALA);
  expect(r.tags).toEqual(["apressado", "decisor"]);
});
