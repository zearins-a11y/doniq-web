import { describe, expect, it } from "bun:test";
import {
  ARRASTO_DESLIGA,
  ARRASTO_MINIMO,
  DICAS,
  GUIA_CHAVE,
  GUIA_NOME,
  GUIA_PADRAO_LIGADO,
  type PassoGuia,
  RESUMO_PASSO,
  arrastoEhRolagem,
  dicasDoPasso,
  dispensaPorArrasto,
  opacidadeArrasto,
} from "../guia";

const PASSOS: PassoGuia[] = ["falar", "revisar", "feito"];

describe("guia — tom e forma", () => {
  it("tem dicas em todas as etapas", () => {
    for (const p of PASSOS) {
      expect(DICAS[p].length).toBeGreaterThan(2);
      expect(RESUMO_PASSO[p].length).toBeGreaterThan(10);
    }
  });

  it("nunca usa emoji nem exclamação — o guia é colega, não mascote de banco", () => {
    const tudo = [...PASSOS.flatMap((p) => DICAS[p].map((d) => d.texto + " " + d.fonte)), ...Object.values(RESUMO_PASSO)];
    for (const frase of tudo) {
      expect(frase).not.toMatch(/!/);
      expect(frase).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("mantém a frase curta — cabe em duas linhas de bolha", () => {
    for (const p of PASSOS) {
      for (const d of DICAS[p]) {
        expect(d.texto.length).toBeLessThanOrEqual(96);
        expect(d.fonte.length).toBeLessThanOrEqual(28);
      }
    }
  });

  it("nunca fala de si mesmo nem se apresenta", () => {
    for (const p of PASSOS) {
      for (const d of DICAS[p]) expect(d.texto.toLowerCase()).not.toContain("dôni");
    }
  });

  it("chama o relatório de relatório, nunca de ficha", () => {
    const tudo = PASSOS.flatMap((p) => DICAS[p].map((d) => d.texto)).concat(Object.values(RESUMO_PASSO));
    for (const frase of tudo) expect(frase.toLowerCase()).not.toContain("ficha");
  });

  it("põe a dica do tipo de visita na frente, só na etapa de falar", () => {
    const comTipo = dicasDoPasso("falar", "Primeira conversa: descubra quem decide.");
    expect(comTipo[0]?.fonte).toBe("nesta visita");
    expect(comTipo.length).toBe(DICAS.falar.length + 1);
    expect(dicasDoPasso("revisar", "Primeira conversa: descubra quem decide.")).toEqual(DICAS.revisar);
    expect(dicasDoPasso("falar", "   ")).toEqual(DICAS.falar);
    expect(dicasDoPasso("falar")).toEqual(DICAS.falar);
  });

  it("expõe nome, chave e padrão da preferência", () => {
    expect(GUIA_NOME).toBe("Dôni");
    expect(GUIA_CHAVE).toBe("doniq_guia");
    expect(GUIA_PADRAO_LIGADO).toBe(true);
  });

  /* O gesto de dispensar é a única saída que o dedo encontra sozinho, e no
     aparelho não dá para conferir em tela (o preview web do React Native não
     recebe gesto sintético). Então a regra é testada aqui, e site e app
     importam esta mesma função — não existe segunda versão para divergir. */
  it("só dispensa o guia depois de um arrasto longo o bastante", () => {
    expect(dispensaPorArrasto(ARRASTO_DESLIGA)).toBe(true);
    expect(dispensaPorArrasto(-ARRASTO_DESLIGA)).toBe(true);
    expect(dispensaPorArrasto(ARRASTO_DESLIGA - 1)).toBe(false);
    expect(dispensaPorArrasto(0)).toBe(false);
  });

  it("não confunde toque com arrasto", () => {
    expect(ARRASTO_MINIMO).toBeLessThan(ARRASTO_DESLIGA);
    expect(dispensaPorArrasto(ARRASTO_MINIMO)).toBe(false);
  });

  it("trata gesto vertical como rolagem da tela", () => {
    expect(arrastoEhRolagem(10, 40)).toBe(true);
    expect(arrastoEhRolagem(40, 10)).toBe(false);
    expect(arrastoEhRolagem(-40, 10)).toBe(false);
    // Empate não é rolagem: o guia segue o dedo e a pessoa decide soltando.
    expect(arrastoEhRolagem(20, 20)).toBe(false);
  });

  it("apaga o guia durante o arrasto sem nunca sumir de vez", () => {
    expect(opacidadeArrasto(0)).toBe(1);
    expect(opacidadeArrasto(ARRASTO_DESLIGA)).toBeLessThan(1);
    expect(opacidadeArrasto(ARRASTO_DESLIGA)).toBeGreaterThanOrEqual(0.25);
    expect(opacidadeArrasto(9999)).toBe(0.25);
    expect(opacidadeArrasto(-9999)).toBe(0.25);
  });
});
