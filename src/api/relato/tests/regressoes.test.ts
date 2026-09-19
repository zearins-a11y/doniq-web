/** Regressões encontradas depurando. Cada teste aqui existe porque o bug existiu. */
import { expect, test } from "bun:test";
import { getTableName } from "drizzle-orm";
import { relatos, sessions, users } from "../../database/schema";
import { camposParaRevisar, normalizarRelato } from "../validators";

const HOJE = "2026-08-04";
const VAGO = "passei la hoje, o cara gostou, mandei o preco";

test("nomes de tabela vêm de um lugar só", () => {
  // Bug real: os índices foram criados em 'reports' enquanto todas as queries
  // batiam em 'relatos'. Nenhum erro, nenhum log — só varredura de tabela.
  expect(getTableName(relatos)).toBe("relatos");
  expect([getTableName(users), getTableName(sessions)]).toEqual(["users", "sessions"]);
});

test("modelo alucinando com confiança alta cai na fila", () => {
  // O caso que o vendedor vai encontrar: relato vago, modelo inventa a conta.
  const bruto = {
    empresa: "Hospital Santa Cruz",
    contato: "Roberto",
    cargo: "Comprador",
    resumo: "visita ao Hospital Santa Cruz",
    temperatura: "quente",
    evidencia: {
      empresa: "o vendedor visitou o Hospital Santa Cruz",
      contato: "conversou com Roberto",
      cargo: "Roberto e comprador",
    },
    confianca: { empresa: "alta", contato: "alta", cargo: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, VAGO);
  for (const c of ["empresa", "contato", "cargo"]) expect(camposParaRevisar(r)).toContain(c);
  expect(r.temperatura).toBe("quente"); // temperatura não é campo de fato
  expect(r.precisa_confirmar).toBe(true); // sem data
});

test("relato vago com modelo honesto não gera fila", () => {
  // Campo vazio é resultado correto — não deve pedir revisão de nada.
  const bruto = {
    empresa: "",
    contato: "",
    resumo: "visita rapida, cliente gostou, preco enviado",
    evidencia: {},
    confianca: {},
  };
  const r = normalizarRelato(bruto, HOJE, VAGO);
  expect(camposParaRevisar(r)).toEqual([]);
  expect(r.audio_ininteligivel).toBe(false);
});

test("limite conhecido: evidência válida não garante valor correto", () => {
  /*
   * LIMITAÇÃO DOCUMENTADA, não bug.
   *
   * O portão confere se o trecho citado existe na fala — não se o trecho
   * sustenta a interpretação. Aqui "mandei o preco" foi realmente dito, mas
   * o modelo concluiu "aguardar retorno" a partir dele. Passa.
   *
   * Fabricação de FATO (nome, data, empresa) é barrada, que é onde o dano
   * mora. Interpretação exagerada de um trecho verdadeiro, não. Se este teste
   * quebrar porque alguém apertou o portão, ótimo — atualize a expectativa.
   */
  const bruto = {
    proxima_acao: "aguardar retorno do cliente",
    resumo: "x",
    evidencia: { proxima_acao: "mandei o preco" },
    confianca: { proxima_acao: "alta" },
  };
  const r = normalizarRelato(bruto, HOJE, VAGO);
  expect(r.confianca.proxima_acao).toBe("alta");
  expect(camposParaRevisar(r)).not.toContain("proxima_acao");
});
