/**
 * A promessa feita ao vendedor: o gestor lê a ficha, nunca a fala.
 *
 * O teste que importa de verdade é o último: um campo novo, inventado agora,
 * não pode aparecer na saída. É isso que separa allowlist de blocklist — com
 * blocklist, o campo novo com fala bruta vazaria em silêncio.
 */
import { expect, test } from "bun:test";
import {
  CAMPOS_VISIVEIS_AO_GESTOR,
  NEGADOS_AO_GESTOR,
  fichaParaGestor,
  fichasParaGestor,
} from "../ficha-gestor";

const relato = {
  relato_id: "r1",
  user_id: "v1",
  empresa: "Hospital Santa Clara",
  contato: "Dra. Marina",
  cargo: "Chefe de compras",
  resumo: "Pediu proposta com prazo de entrega.",
  objecao: "Preço acima do concorrente",
  proxima_acao: "Enviar proposta na segunda",
  data_iso: "2026-08-10",
  hora: "14:30",
  temperatura: "quente",
  faltou_perguntar: ["prazo de pagamento"],
  precisa_confirmar: "sim",
  campo_a_confirmar: "empresa",
  tags: ["opme"],
  concorrentes: ["Concorrente X"],
  revisado: "nao",
  campos_a_revisar: [],
  created_at: "2026-08-10T17:31:00Z",
  // tudo daqui para baixo é proibido ao gestor
  transcricao: "então doutora eu acho que a gente consegue baixar uns dez por cento",
  evidencia: { empresa: "aqui no Santa Clara", objecao: "tá caro demais" },
  telefone: "11999998888",
  followup: "lembrar que ela odeia ligação de manhã",
  numeros: ["10%", "R$ 4.200"],
  confianca: { empresa: "alta" },
  audio_ininteligivel: "nao",
  prompt_versao: "2026-08-10.1",
  modelo: "gpt-x",
};

test("a fala bruta não sai: nem transcrição, nem evidência", () => {
  const ficha = fichaParaGestor(relato);
  expect(ficha.transcricao).toBeUndefined();
  expect(ficha.evidencia).toBeUndefined();
  expect("transcricao" in ficha).toBe(false);
  expect("evidencia" in ficha).toBe(false);
});

test("nenhum campo da lista de negados aparece na ficha", () => {
  const ficha = fichaParaGestor(relato);
  for (const campo of Object.keys(NEGADOS_AO_GESTOR)) {
    expect(campo in ficha).toBe(false);
  }
});

test("nenhum trecho literal da transcrição sobra na saída serializada", () => {
  const json = JSON.stringify(fichaParaGestor(relato));
  expect(json).not.toContain("dez por cento");
  expect(json).not.toContain("tá caro demais");
  expect(json).not.toContain("odeia ligação");
  expect(json).not.toContain("11999998888");
});

test("o que o gestor precisa para gerir continua na ficha", () => {
  const ficha = fichaParaGestor(relato);
  expect(ficha.empresa).toBe("Hospital Santa Clara");
  expect(ficha.objecao).toBe("Preço acima do concorrente");
  expect(ficha.proxima_acao).toBe("Enviar proposta na segunda");
  expect(ficha.faltou_perguntar).toEqual(["prazo de pagamento"]);
  expect(ficha.user_id).toBe("v1");
  expect(ficha.data_iso).toBe("2026-08-10");
});

test("campo novo na ficha começa invisível ao gestor", () => {
  const comCampoNovo = { ...relato, audio_url: "https://exemplo/audio.m4a", nota_privada: "cliente chato" };
  const ficha = fichaParaGestor(comCampoNovo);
  expect("audio_url" in ficha).toBe(false);
  expect("nota_privada" in ficha).toBe(false);
});

test("campo ausente na origem não é inventado na saída", () => {
  const ficha = fichaParaGestor({ relato_id: "r2", user_id: "v9" });
  expect(Object.keys(ficha).sort()).toEqual(["relato_id", "user_id"]);
  expect("empresa" in ficha).toBe(false);
});

test("a allowlist e a lista de negados não se contradizem", () => {
  for (const campo of Object.keys(NEGADOS_AO_GESTOR)) {
    expect(CAMPOS_VISIVEIS_AO_GESTOR).not.toContain(campo);
  }
});

test("a lista em lote aplica a mesma regra de item em item", () => {
  const fichas = fichasParaGestor([relato, { ...relato, relato_id: "r3" }]);
  expect(fichas.length).toBe(2);
  for (const f of fichas) {
    expect("transcricao" in f).toBe(false);
    expect("evidencia" in f).toBe(false);
  }
  expect(fichas[1]?.relato_id).toBe("r3");
});

test("o gestor vê o roteiro da visita, que é catálogo, e nunca a fala junto", () => {
  const ficha = fichaParaGestor({
    ...relato,
    tipo_visita: "fechamento",
    roteiro: [
      { id: "proximo_passo", pergunta: "O que ficou combinado, com data?", coberto: true, como: "ficha" },
      { id: "objecao_aberta", pergunta: "O que ainda pesa contra fechar com a gente?", coberto: false, como: "" },
    ],
    transcricao: "o cara reclamou de preço e xingou o concorrente",
  });
  expect(ficha.tipo_visita).toBe("fechamento");
  expect((ficha.roteiro as { id: string }[]).length).toBe(2);
  // roteiro carrega pergunta de catálogo e sim/não — nunca trecho da fala
  expect("transcricao" in ficha).toBe(false);
  expect("evidencia" in ficha).toBe(false);
});

test("o gestor acompanha o status de sincronização CRM da visita sem vazar fala", () => {
  const ficha = fichaParaGestor({
    ...relato,
    crm_status: [
      { provedor: "pipedrive", status: "enviado", atualizado_em: "2026-08-10T17:35:00Z" },
      { provedor: "rdstation", status: "erro", erro: "Token inválido" },
    ],
    transcricao: "áudio confidencial não pode vazar",
  });
  expect(ficha.crm_status).toEqual([
    { provedor: "pipedrive", status: "enviado", atualizado_em: "2026-08-10T17:35:00Z" },
    { provedor: "rdstation", status: "erro", erro: "Token inválido" },
  ]);
  expect("transcricao" in ficha).toBe(false);
  expect("evidencia" in ficha).toBe(false);
});
