/**
 * A política de privacidade agora é recitada em dois lugares (site e app), a
 * partir de uma fonte só. Estes testes prendem o que estraga política: item pela
 * metade, lista que ficou vazia depois de uma refatoração, e — o pior — política
 * que promete uma coisa e landing que promete outra.
 */

import { describe, expect, test } from "bun:test";
import { PRIVACIDADE_LANDING } from "../landing-app";
import {
  BASES_LEGAIS,
  CONTROLADOR,
  DADOS,
  DIREITOS,
  ENCARREGADO,
  NAO_FAZEMOS,
  POLITICA_ATUALIZADA_EM,
  POLITICA_VERSAO,
  PRAZOS,
  SUBPROCESSADORES,
} from "../politica";

const cheio = (s: unknown) => typeof s === "string" && s.trim().length > 10;
/** Rótulo curto ainda é rótulo: "Correção" e "30 dias" são respostas legítimas. */
const preenchido = (s: unknown) => typeof s === "string" && s.trim().length > 2;

describe("política de privacidade", () => {
  test("nenhuma lista da política pode chegar vazia na tela", () => {
    expect(DADOS.length).toBeGreaterThan(0);
    expect(SUBPROCESSADORES.length).toBeGreaterThan(0);
    expect(BASES_LEGAIS.length).toBeGreaterThan(0);
    expect(NAO_FAZEMOS.length).toBeGreaterThan(0);
    expect(DIREITOS.length).toBeGreaterThan(0);
  });

  test("cada dado guardado diz o que é, onde fica e por quanto tempo", () => {
    for (const d of DADOS) {
      expect(cheio(d.titulo)).toBe(true);
      expect(cheio(d.onde)).toBe(true);
      expect(cheio(d.quanto)).toBe(true);
    }
  });

  test("cada terceiro diz o papel dele, e cada finalidade diz a base legal", () => {
    for (const s of SUBPROCESSADORES) {
      expect(cheio(s.nome)).toBe(true);
      expect(cheio(s.papel)).toBe(true);
    }
    for (const b of BASES_LEGAIS) {
      expect(cheio(b.finalidade)).toBe(true);
      expect(cheio(b.base)).toBe(true);
    }
  });

  test("a lista identifica o gateway e os provedores de IA usados pelo produto", () => {
    const nomes = SUBPROCESSADORES.map((s) => s.nome).join(" ");
    for (const provedor of ["Vercel AI Gateway", "OpenAI", "Google", "Anthropic", "Groq"]) {
      expect(nomes).toContain(provedor);
    }
  });

  test("a política informa os provedores de métricas e diagnóstico", () => {
    const nomes = SUBPROCESSADORES.map((s) => s.nome).join(" ");
    for (const provedor of ["Runable", "OneDollarStats", "Sentry"]) {
      expect(nomes).toContain(provedor);
    }
    expect(DADOS.some((d) => d.titulo === "Métricas técnicas e falhas")).toBe(true);
  });

  test("cada direito vem com o caminho prático de exercer, não só o nome", () => {
    for (const d of DIREITOS) {
      expect(preenchido(d.direito)).toBe(true);
      expect(cheio(d.como)).toBe(true);
    }
  });

  test("controlador identificado e canal do encarregado com e-mail válido", () => {
    expect(preenchido(CONTROLADOR.nome)).toBe(true);
    expect(cheio(CONTROLADOR.descricao)).toBe(true);
    expect(ENCARREGADO.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  test("versão e data existem: política sem data não dá para auditar", () => {
    expect(POLITICA_VERSAO).toMatch(/^\d+\.\d+$/);
    expect(POLITICA_ATUALIZADA_EM).toMatch(/\d{4}$/);
    expect(preenchido(PRAZOS.respostaPedido)).toBe(true);
    expect(preenchido(PRAZOS.exclusaoConta)).toBe(true);
    expect(preenchido(PRAZOS.sessao)).toBe(true);
  });

  test("as três linhas da landing não contradizem a política", () => {
    const politica = [
      ...NAO_FAZEMOS,
      ...DADOS.map((d) => `${d.titulo} ${d.onde} ${d.quanto}`),
      ...DIREITOS.map((d) => d.como),
    ]
      .join(" ")
      .toLowerCase();

    // landing: "o áudio não fica guardado no servidor"
    expect(politica).toContain("não gravamos o áudio bruto no servidor");
    // landing: "campo que você não falou fica vazio"
    expect(politica).toContain("não preenchemos campo com informação que não foi dita");
    // landing: "o gestor lê a ficha, nunca a gravação"
    expect(politica).toContain("relato de outra conta");
    // landing: exportação em JSON
    expect(politica).toContain("json");

    expect(PRIVACIDADE_LANDING.length).toBe(3);
    for (const linha of PRIVACIDADE_LANDING) expect(cheio(linha)).toBe(true);
  });

  test("política não vende: nada de linguagem de marketing onde se fala de dado", () => {
    const tudo = [
      CONTROLADOR.descricao,
      ...NAO_FAZEMOS,
      ...DADOS.map((d) => `${d.onde} ${d.quanto}`),
      ...SUBPROCESSADORES.map((s) => s.papel),
      ...DIREITOS.map((d) => d.como),
    ]
      .join(" ")
      .toLowerCase();
    for (const proibido of ["100% seguro", "totalmente seguro", "impossível", "garantimos"]) {
      expect(tudo).not.toContain(proibido);
    }
  });
});
