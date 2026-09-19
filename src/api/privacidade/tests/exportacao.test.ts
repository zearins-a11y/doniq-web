import { describe, expect, it } from "bun:test";
import type { Usuario } from "../../auth-dispositivo";
import {
  CHAVES_PROIBIDAS,
  VERSAO_EXPORTACAO,
  limparSegredos,
  montarExportacao,
  nomeArquivo,
} from "../exportacao";

const AGORA = "2026-08-10T14:30:00Z";

const usuario: Usuario = {
  user_id: "usr_abc123",
  email: "jose.moreira@exemplo.com.br",
  nome: "José Moreira",
  produto: "kit de artroscopia",
  vertical: "opme",
  criado_em: "2026-01-04T09:00:00Z",
};

const relato = {
  relato_id: "rel_01",
  empresa: "Hospital Santa Clara",
  contato: "Dra. Renata",
  transcricao: "visita de hoje...",
  evidencia: { empresa: "Hospital Santa Clara" },
  confianca: { empresa: "alta" },
};

const integracao = {
  provedor: "agendor",
  nome: "Agendor",
  token_mascarado: "••••9f2a",
  mapa_campos: { temperatura: "cf_1" },
  funil_id: "1",
  etapa_id: "2",
  ativa: true,
  atualizado_em: AGORA,
};

describe("exportação de dados do titular", () => {
  it("leva usuário, relatos e integrações com os totais certos", () => {
    const e = montarExportacao(usuario, [relato], [integracao], AGORA);
    expect(e.versao).toBe(VERSAO_EXPORTACAO);
    expect(e.gerado_em).toBe(AGORA);
    expect(e.totais).toEqual({ relatos: 1, integracoes: 1 });
    expect(e.usuario.email).toBe(usuario.email);
    expect(e.relatos[0]?.empresa).toBe("Hospital Santa Clara");
    expect(e.integracoes[0]?.token_mascarado).toBe("••••9f2a");
  });

  it("avisa que o arquivo tem dado de terceiro", () => {
    const e = montarExportacao(usuario, [], [], AGORA);
    expect(e.aviso).toContain("dados pessoais de terceiros");
  });

  it("nenhuma chave proibida sobrevive, em qualquer profundidade", () => {
    const sujo = {
      relato_id: "rel_02",
      credenciais: "v1.aaa.bbb.ccc",
      interno: { token: "segredo", authorization: "Bearer x", ok: 1 },
      lista: [{ senha: "123", visivel: true }],
    };
    const e = montarExportacao(usuario, [sujo], [integracao], AGORA);
    const texto = JSON.stringify(e);
    for (const chave of CHAVES_PROIBIDAS) {
      expect(texto.includes(`"${chave}"`)).toBe(false);
    }
    // a chave some com o valor junto: credencial cifrada não sai nem em pedaço
    expect(texto).not.toContain("v1.aaa");
    // o resto do objeto continua inteiro
    const saida = e.relatos[0] as Record<string, unknown>;
    expect(saida.relato_id).toBe("rel_02");
    expect((saida.interno as Record<string, unknown>).ok).toBe(1);
    expect((saida.lista as Record<string, unknown>[])[0]?.visivel).toBe(true);
  });

  it("token_mascarado não é confundido com token", () => {
    expect(limparSegredos({ token_mascarado: "••••9f2a" })).toEqual({ token_mascarado: "••••9f2a" });
    const comMaiuscula: Record<string, unknown> = { Token: "segredo" };
    expect(limparSegredos(comMaiuscula)).toEqual({});
  });

  it("não inventa dado quando a conta está vazia", () => {
    const e = montarExportacao(usuario, [], [], AGORA);
    expect(e.relatos).toEqual([]);
    expect(e.integracoes).toEqual([]);
    expect(e.totais).toEqual({ relatos: 0, integracoes: 0 });
  });

  it("preserva valores primitivos e nulos", () => {
    expect(limparSegredos("texto")).toBe("texto");
    expect(limparSegredos(null)).toBe(null);
    expect(limparSegredos(7)).toBe(7);
  });

  it("nome do arquivo carrega apelido e dia", () => {
    expect(nomeArquivo(usuario, AGORA)).toBe("doniq-meus-dados-jose-moreira-2026-08-10.json");
  });

  it("e-mail estranho não vira nome de arquivo estranho", () => {
    expect(nomeArquivo({ email: "A+B_c@x.com" }, AGORA)).toBe("doniq-meus-dados-a-b-c-2026-08-10.json");
    expect(nomeArquivo({ email: "" }, AGORA)).toBe("doniq-meus-dados-conta-2026-08-10.json");
  });
});
