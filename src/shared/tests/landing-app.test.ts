/**
 * A landing do app é peça de aquisição: o que ela promete, o suporte paga.
 * Estes testes prendem as três coisas que costumam desandar em copy — id de ramo
 * que não existe no produto, preço escrito à mão e promessa que o app não cumpre.
 */

import { describe, expect, test } from "bun:test";
import { listarVerticais } from "../../api/relato/verticais";
import { ANUAL, DIAS_TESTE, MENSAL } from "../planos";
import {
  ETAPAS_LANDING,
  PRIVACIDADE_LANDING,
  RAMOS_LANDING,
  chamadaDoBotao,
  copyDaLanding,
  linhaDePreco,
  ramoInicial,
  ramosDaLanding,
} from "../landing-app";

describe("landing do app", () => {
  test("todo ramo da landing existe de verdade no produto", () => {
    const doProduto = listarVerticais().map((v) => v.id);
    for (const id of RAMOS_LANDING) expect(doProduto).toContain(id);
  });

  test("geral é o padrão e vem primeiro nos chips", () => {
    expect(ramosDaLanding()[0]?.id).toBe("geral");
  });

  test("ramo desconhecido, vazio ou lixo cai em geral em vez de quebrar a tela", () => {
    for (const entrada of [undefined, null, "", "cripto", 7, {}, "OPME "]) {
      expect(copyDaLanding(entrada).id).toBe("geral");
    }
  });

  test("ramo escrito certo entrega a copy daquele ramo", () => {
    expect(copyDaLanding("opme").titulo).toContain("hospital");
    expect(copyDaLanding("agro").termos).toContain("talhão");
    expect(copyDaLanding("seguros").exemplo.faltou).toContain("vidas");
  });

  test("nenhum ramo entra na tela com campo vazio", () => {
    for (const c of ramosDaLanding()) {
      expect(c.chip.length).toBeGreaterThan(1);
      expect(c.titulo.length).toBeGreaterThan(20);
      expect(c.sub.length).toBeGreaterThan(30);
      expect(c.dor.length).toBeGreaterThan(20);
      expect(c.termos.length).toBeGreaterThanOrEqual(4);
      expect(c.exemplo.empresa.length).toBeGreaterThan(3);
      expect(c.exemplo.objecao.length).toBeGreaterThan(3);
      expect(c.exemplo.proximaAcao.length).toBeGreaterThan(3);
      expect(c.exemplo.faltou.endsWith("?")).toBe(true);
    }
  });

  test("o exemplo de relatório é diferente em cada ramo — senão o vertical é enfeite", () => {
    const empresas = ramosDaLanding().map((c) => c.exemplo.empresa);
    expect(new Set(empresas).size).toBe(empresas.length);
    const titulos = ramosDaLanding().map((c) => c.titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  test("o preço da landing é o preço do sistema", () => {
    const linha = linhaDePreco();
    expect(linha).toContain(`R$ ${MENSAL}`);
    expect(linha).toContain(`R$ ${ANUAL}`);
    expect(linha).toContain(`${DIAS_TESTE} dias`);
    expect(chamadaDoBotao()).toContain(`${DIAS_TESTE} dias`);
  });

  test("a landing não promete cartão nem cobrança no teste", () => {
    expect(linhaDePreco().toLowerCase()).toContain("sem cartão");
    expect(chamadaDoBotao().toLowerCase()).toContain("sem cartão");
  });

  test("nada na landing promete ilimitado, garantia de venda ou IA que decide", () => {
    const tudo = [
      ...ramosDaLanding().flatMap((c) => [c.titulo, c.sub, c.dor, ...c.termos]),
      ...ETAPAS_LANDING.flatMap((e) => [e.titulo, e.texto]),
      ...PRIVACIDADE_LANDING,
      linhaDePreco(),
      chamadaDoBotao(),
    ]
      .join(" ")
      .toLowerCase();
    for (const proibido of ["ilimitado", "garantia de venda", "vende para você", "100%", "dobre suas vendas"]) {
      expect(tudo).not.toContain(proibido);
    }
  });

  test("a promessa de privacidade repete o que o código já faz", () => {
    const texto = PRIVACIDADE_LANDING.join(" ").toLowerCase();
    // áudio não guardado, campo vazio quando não foi dito, gestor sem a gravação
    expect(texto).toContain("áudio não fica guardado no servidor");
    expect(texto).toContain("fica vazio");
    expect(texto).toContain("nunca a sua gravação");
    expect(PRIVACIDADE_LANDING.length).toBeGreaterThanOrEqual(3);
  });

  test("o ramo da landing sugere o onboarding de quem ainda não se cadastrou", () => {
    expect(ramoInicial({ produto: "", verticalDoServidor: "geral", daLanding: "opme" })).toBe("opme");
    expect(ramoInicial({ produto: null, verticalDoServidor: null, daLanding: "agro" })).toBe("agro");
  });

  test("depois do cadastro quem manda é o servidor, senão ninguém troca de ramo", () => {
    expect(ramoInicial({ produto: "stents", verticalDoServidor: "opme", daLanding: "agro" })).toBe("opme");
    expect(ramoInicial({ produto: "stents", verticalDoServidor: "geral", daLanding: "opme" })).toBe("geral");
  });

  test("sem landing e sem servidor, cai em geral", () => {
    expect(ramoInicial({})).toBe("geral");
    expect(ramoInicial({ produto: "", verticalDoServidor: "", daLanding: "" })).toBe("geral");
  });

  test("as três etapas continuam três — falar, virar relatório, virar funil", () => {
    expect(ETAPAS_LANDING.length).toBe(3);
    expect(ETAPAS_LANDING.map((e) => e.titulo)).toEqual(["Você fala", "Vira relatório", "Vira funil"]);
  });
});
