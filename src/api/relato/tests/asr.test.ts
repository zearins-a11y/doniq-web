import { describe, expect, test } from "bun:test";
import { NoTranscriptGeneratedError } from "ai";
import {
  aplicarAliasesExplicitos,
  correcaoGrafiaSegura,
  extensao,
  limparSaida,
  textoDaTranscricao,
} from "../asr";
import { tentarModelos } from "../gateway";

describe("extensao", () => {
  test("prefere a extensão do nome do arquivo", () => {
    expect(extensao("relato.m4a", "audio/webm")).toBe("m4a");
    expect(extensao("RELATO.MP3", "")).toBe("mp3");
  });

  test("cai no content type quando o nome não ajuda", () => {
    expect(extensao("blob", "audio/mp4;codecs=mp4a")).toBe("mp4");
    expect(extensao("", "audio/ogg")).toBe("ogg");
  });

  test("desconhecido vira webm, como no export", () => {
    expect(extensao("", "application/octet-stream")).toBe("webm");
    expect(extensao("", "")).toBe("webm");
  });
});

describe("limparSaida", () => {
  test("texto normal passa limpo", () => {
    expect(limparSaida("  Visitei a Cirúrgica Paraná hoje.  ")).toBe(
      "Visitei a Cirúrgica Paraná hoje.",
    );
  });

  test("SEM_FALA vira vazio", () => {
    expect(limparSaida("SEM_FALA")).toBe("");
    expect(limparSaida("sem_fala")).toBe("");
    expect(limparSaida("Sem fala.")).toBe("");
  });

  // o modelo multimodal descreve som em vez de transcrever; o whisper-1 do export
  // devolvia "" nesses casos e o resto do fluxo depende disso
  test("descrição de som vira vazio", () => {
    expect(limparSaida("[Telefone tocando]")).toBe("");
    expect(limparSaida("(Som de telefone tocando)")).toBe("");
    expect(limparSaida("(silêncio)")).toBe("");
  });

  test("tira cerca markdown e prefixo", () => {
    expect(limparSaida("```\nvisita na loja\n```")).toBe("visita na loja");
    expect(limparSaida("Transcrição: visita na loja")).toBe("visita na loja");
  });

  test("não confunde fala que só tem parêntese no meio", () => {
    expect(limparSaida("falei com o Rodrigo (comprador) hoje")).toBe(
      "falei com o Rodrigo (comprador) hoje",
    );
  });
});

describe("correção de grafia", () => {
  const termos = [
    "CME",
    "OPME",
    "SIMPRO",
    "tabela Brasíndice",
    "SUSEP",
    "ITBI",
    "matrícula",
    "habite-se",
  ];

  test("aceita somente substituições posicionais por termos conhecidos", () => {
    expect(
      correcaoGrafiaSegura(
        "Falei com o CIMIA sobre OPMI e SINPRO",
        "Falei com o CME sobre OPME e SIMPRO",
        termos,
      ),
    ).toBe(true);
  });

  test("recusa alteração de palavra comum", () => {
    expect(
      correcaoGrafiaSegura(
        "Revimos a apólice e as regras da Susep",
        "Revinmos a apólice e as regras da SUSEP",
        termos,
      ),
    ).toBe(false);
  });

  test("recusa termo permitido sem semelhança fonética com o original", () => {
    expect(
      correcaoGrafiaSegura(
        "Falei com Ana sobre prazo",
        "Falei com CME sobre OPME",
        termos,
      ),
    ).toBe(false);
    expect(correcaoGrafiaSegura("Ela disse sim", "Ela disse CME", termos)).toBe(false);
  });

  test("aceita unir ou separar tokens somente para formar termos permitidos", () => {
    expect(
      correcaoGrafiaSegura(
        "tabela Brasa Índice, ITB, Immatrícula e Abitse",
        "tabela Brasíndice, ITBI, matrícula e habite-se",
        termos,
      ),
    ).toBe(true);
  });

  test("recusa remoção de número mesmo com correções permitidas", () => {
    expect(
      correcaoGrafiaSegura(
        "tabela SINPRO Brasil índice 2 caixas",
        "tabela SIMPRO Brasíndice caixas",
        termos,
      ),
    ).toBe(false);
  });

  test("recusa união ou separação que não forma termo permitido", () => {
    expect(
      correcaoGrafiaSegura(
        "Falei com Ana Maria sobre prazo",
        "Falei com CME sobre OPME",
        termos,
      ),
    ).toBe(false);
  });

  test("recusa remover negação ao unir tokens", () => {
    expect(correcaoGrafiaSegura("não SIMPRO", "SIMPRO", termos)).toBe(false);
    expect(correcaoGrafiaSegura("não matrícula", "matrícula", termos)).toBe(false);
    expect(correcaoGrafiaSegura("A SIMPRO revisou", "SIMPRO revisou", termos)).toBe(false);
    expect(
      correcaoGrafiaSegura(
        "matrícula",
        "não matrícula",
        ["não matrícula"],
      ),
    ).toBe(false);
  });

  test("recusa transformar palavras comuns em sigla do glossário", () => {
    expect(
      correcaoGrafiaSegura(
        "Falei com a equipe",
        "Falei CME equipe",
        termos,
      ),
    ).toBe(false);
    expect(
      correcaoGrafiaSegura(
        "Paciente em coma",
        "Paciente em CME",
        termos,
      ),
    ).toBe(false);
    expect(
      correcaoGrafiaSegura(
        "PACIENTE EM COMA",
        "PACIENTE EM CME",
        termos,
      ),
    ).toBe(false);
  });

  test("recusa mudança de pontuação ou acento fora do glossário", () => {
    expect(
      correcaoGrafiaSegura(
        "Não. Aprovar pedido.",
        "Não aprovar pedido.",
        termos,
      ),
    ).toBe(false);
    expect(
      correcaoGrafiaSegura(
        "Ele pôde aprovar.",
        "Ele pode aprovar.",
        termos,
      ),
    ).toBe(false);
  });

  test("recusa promover parte de termo composto a termo independente", () => {
    expect(
      correcaoGrafiaSegura(
        "Usei Brasi Índice hoje.",
        "Usei Brasíndice hoje.",
        ["tabela Brasíndice"],
      ),
    ).toBe(false);
  });

  test("recusa formar sigla por união sem alias explícito", () => {
    expect(
      correcaoGrafiaSegura(
        "Usamos sim pro cadastro",
        "Usamos SIMPRO cadastro",
        termos,
      ),
    ).toBe(false);
  });

  test("aplica localmente somente aliases explícitos de erros observados", () => {
    expect(
      aplicarAliasesExplicitos(
        "Falamos de OpenMe, Tabela Brasil Índice, ITB, Imatrícula e Abits.",
        ["OPME", "tabela Brasíndice", "ITBI", "matrícula", "habite-se"],
      ),
    ).toBe(
      "Falamos de OPME, tabela Brasíndice, ITBI, matrícula e habite-se.",
    );
    expect(
      aplicarAliasesExplicitos(
        "Usamos tabela Brasinse e o documento saiu como Abitc.",
        ["tabela Brasíndice", "habite-se"],
      ),
    ).toBe(
      "Usamos tabela Brasíndice e o documento saiu como habite-se.",
    );
    expect(
      aplicarAliasesExplicitos(
        "Paciente em COMA e usamos sim pro cadastro.",
        ["CME", "SIMPRO"],
      ),
    ).toBe("Paciente em COMA e usamos sim pro cadastro.");
    expect(
      aplicarAliasesExplicitos(
        "Tabela. Brasil Índice separado. A bits por segundo.",
        ["tabela Brasíndice", "habite-se"],
      ),
    ).toBe("Tabela. Brasil Índice separado. A bits por segundo.");
  });
});

describe("textoDaTranscricao", () => {
  test("ausência de transcrição no primeiro modelo aciona fallback", async () => {
    const erro = new NoTranscriptGeneratedError({ responses: [] });
    let chamadas = 0;

    const resposta = await tentarModelos(
      () =>
        textoDaTranscricao(async () => {
          chamadas++;
          if (chamadas === 1) throw erro;
          return { text: "Visitei a Cirúrgica Paraná hoje." };
        }),
      ["primario", "fallback"],
    );

    expect(chamadas).toBe(2);
    expect(resposta.modelo).toBe("fallback");
    expect(resposta.resultado).toBe("Visitei a Cirúrgica Paraná hoje.");
  });

  test("resposta vazia do primeiro modelo também aciona fallback", async () => {
    let chamadas = 0;

    const resposta = await tentarModelos(
      () =>
        textoDaTranscricao(async () => ({
          text: ++chamadas === 1 ? "" : "Visitei a Fazenda Boa Esperança.",
        })),
      ["primario", "fallback"],
    );

    expect(chamadas).toBe(2);
    expect(resposta.modelo).toBe("fallback");
    expect(resposta.resultado).toBe("Visitei a Fazenda Boa Esperança.");
  });

  test("todos os modelos vazios viram falha em vez de apagar o áudio", async () => {
    await expect(
      tentarModelos(
        () => textoDaTranscricao(async () => ({ text: "" })),
        ["primario", "fallback"],
      ),
    ).rejects.toThrow("Todos os modelos falharam");
  });

  test("propaga falha real do provedor", async () => {
    await expect(
      textoDaTranscricao(async () => {
        throw new Error("gateway indisponível");
      }),
    ).rejects.toThrow("gateway indisponível");
  });
});
