import { describe, expect, it } from "bun:test";
import type { Relato } from "../api";
import {
  aplicarCampoRevisado,
  aplicarConfirmacaoRevisaoLocal,
  criarMudancasRevisao,
} from "../revisao-relato";

const relatoBase = {
  relato_id: "relato-1",
  user_id: "user-1",
  transcricao: "Conversa inicial",
  empresa: "Padaria São Bento",
  contato: "Carlos Mendes",
  cargo: "Proprietário",
  telefone: "(11) 99999-0000",
  proxima_acao: "Enviar amostra",
  resumo: "Conversa inicial",
  resumo_narrativo: "Conversa inicial com o proprietário.",
  email_cliente: "carlos@padariasaobento.com.br",
  proximas_perguntas: ["Qual o volume semanal?"],
  objecao: "Prazo de entrega",
  data_iso: "2026-09-12",
  hora: "09:00",
  temperatura: "quente",
  faltou_perguntar: [],
  followup: "",
  precisa_confirmar: false,
  campo_a_confirmar: "",
  audio_ininteligivel: false,
  tags: [],
  concorrentes: [],
  numeros: [],
  evidencia: { resumo: "trecho original" },
  confianca: { empresa: "alta", resumo: "baixa" },
  revisado: false,
  campos_a_revisar: ["resumo"],
  tipo_visita: "prospeccao",
  roteiro: [],
  prompt_versao: "teste",
  modelo: "teste",
  tokens_input: 0,
  tokens_output: 0,
  duracao_ms: 0,
  cache_key: "teste",
  created_at: "2026-09-11T12:00:00.000Z",
} satisfies Relato;

describe("revisão do relato", () => {
  it("aplica a correção ao relato que seguirá para confirmação", () => {
    const revisado = aplicarCampoRevisado(relatoBase, "empresa", "Mercado Horizonte");

    expect(revisado.empresa).toBe("Mercado Horizonte");
    expect(revisado.contato).toBe("Carlos Mendes");
    expect(relatoBase.empresa).toBe("Padaria São Bento");
  });

  it("atualiza todos os campos editáveis sem alterar os demais", () => {
    const alteracoes = [
      ["contato", "Marina Lopes"],
      ["proxima_acao", "Retornar na sexta-feira"],
      ["resumo", "Cliente pediu nova condição"],
      ["objecao", "Orçamento limitado"],
    ] as const;

    const revisado = alteracoes.reduce<Relato>(
      (atual, [chave, valor]) => aplicarCampoRevisado(atual, chave, valor),
      relatoBase,
    );

    expect(revisado).toMatchObject({
      empresa: "Padaria São Bento",
      contato: "Marina Lopes",
      proxima_acao: "Retornar na sexta-feira",
      resumo: "Cliente pediu nova condição",
      objecao: "Orçamento limitado",
    });
  });

  it("prepara todos os campos visíveis para persistência antes da tela Feito", () => {
    expect(criarMudancasRevisao(relatoBase)).toEqual({
      empresa: "Padaria São Bento",
      contato: "Carlos Mendes",
      proxima_acao: "Enviar amostra",
      resumo: "Conversa inicial",
      objecao: "Prazo de entrega",
    });
  });

  it("simula no modo de desenvolvimento os metadados retornados pelo servidor", () => {
    const confirmado = aplicarConfirmacaoRevisaoLocal(relatoBase);

    expect(confirmado.campos_a_revisar).toEqual([]);
    expect(confirmado.confianca.resumo).toBe("alta");
    expect(confirmado.evidencia.resumo).toBe("corrigido pelo vendedor");
    expect(relatoBase.campos_a_revisar).toEqual(["resumo"]);
  });
});
