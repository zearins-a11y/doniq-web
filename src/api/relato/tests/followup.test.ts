import { describe, expect, test } from "bun:test";
import {
  calcularMetricasTexto,
  extrairPrimeiroNome,
  formatarPrazoAmigavel,
  gerarVariantesFollowup,
  type ContextoFollowup,
} from "../followup";

describe("extrairPrimeiroNome", () => {
  test("extrai primeiro nome comum", () => {
    expect(extrairPrimeiroNome("Roberto Carlos")).toBe("Roberto");
    expect(extrairPrimeiroNome("Juliana")).toBe("Juliana");
  });

  test("remove pronomes de tratamento e títulos", () => {
    expect(extrairPrimeiroNome("Dr. Carlos Eduardo da Silva")).toBe("Carlos");
    expect(extrairPrimeiroNome("Dra. Ana Paula")).toBe("Ana");
    expect(extrairPrimeiroNome("Sr. Fernando")).toBe("Fernando");
    expect(extrairPrimeiroNome("Eng. Marcos Vinícius")).toBe("Marcos");
    expect(extrairPrimeiroNome("Engenheiro Paulo Silveira")).toBe("Paulo");
  });

  test("lida com nulos e vazios com segurança", () => {
    expect(extrairPrimeiroNome("")).toBe("");
    expect(extrairPrimeiroNome(undefined)).toBe("");
    expect(extrairPrimeiroNome("   ")).toBe("");
  });
});

describe("formatarPrazoAmigavel", () => {
  test("formata data ISO e hora inteira", () => {
    // 2026-09-18 é uma sexta-feira
    const res = formatarPrazoAmigavel("2026-09-18", "14:00");
    expect(res).toBe("até sexta-feira (18/09) às 14h");
  });

  test("formata data ISO e hora fracionada", () => {
    const res = formatarPrazoAmigavel("2026-09-18", "14:30");
    expect(res).toBe("até sexta-feira (18/09) às 14:30");
  });

  test("formata data sem hora", () => {
    const res = formatarPrazoAmigavel("2026-09-18");
    expect(res).toBe("até sexta-feira (18/09)");
  });

  test("data inválida ou vazia devolve vazio", () => {
    expect(formatarPrazoAmigavel("")).toBe("");
    expect(formatarPrazoAmigavel(undefined)).toBe("");
    expect(formatarPrazoAmigavel("invalida")).toBe("");
  });
});

describe("calcularMetricasTexto", () => {
  test("calcula palavras e tempo de leitura", () => {
    const texto = "Oi Roberto, tudo bem? Obrigado pelo papo hoje na Metalúrgica Brasil. Ficou combinado de eu enviar a proposta.";
    const metricas = calcularMetricasTexto(texto);
    expect(metricas.palavras).toBe(18);
    expect(metricas.caracteres).toBe(texto.length);
    expect(metricas.tempo_leitura_segundos).toBeGreaterThanOrEqual(5);
  });

  test("texto vazio zera métricas", () => {
    const metricas = calcularMetricasTexto("");
    expect(metricas.palavras).toBe(0);
    expect(metricas.caracteres).toBe(0);
    expect(metricas.tempo_leitura_segundos).toBe(0);
  });
});

describe("gerarVariantesFollowup", () => {
  test("visita sem objeção recomenda proximo_passo e desabilita destravar_objecao", () => {
    const ctx: ContextoFollowup = {
      contato: "Eng. Paulo Silveira",
      empresa: "Metalúrgica Progresso",
      proxima_acao: "Enviar proposta comercial revisada",
      data_iso: "2026-09-18",
      hora: "10:00",
      objecao: "",
    };

    const res = gerarVariantesFollowup(ctx, "industria");
    expect(res.tem_objecao).toBe(false);
    expect(res.recomendada).toBe("proximo_passo");

    expect(res.variantes.proximo_passo.disponivel).toBe(true);
    expect(res.variantes.proximo_passo.texto).toContain("Oi Paulo");
    expect(res.variantes.proximo_passo.texto).toContain("Metalúrgica Progresso");
    expect(res.variantes.proximo_passo.texto).toContain("enviar proposta comercial");
    expect(res.variantes.proximo_passo.texto).toContain("18/09");

    expect(res.variantes.destravar_objecao.disponivel).toBe(false);
    expect(res.variantes.destravar_objecao.motivo_indisponivel).toContain("Nenhuma objeção");

    expect(res.variantes.formal.disponivel).toBe(true);
    expect(res.variantes.formal.texto).toContain("Prezado(a) Paulo");
  });

  test("visita com objeção de preço recomenda destravar_objecao e ancora pergunta", () => {
    const ctx: ContextoFollowup = {
      contato: "Dr. Roberto Silva",
      empresa: "Hospital Central",
      proxima_acao: "Apresentar análise de custo",
      data_iso: "2026-09-22",
      hora: "15:00",
      objecao: "Achou o valor do kit cirúrgico muito caro para o orçamento deste trimestre",
    };

    const res = gerarVariantesFollowup(ctx, "opme");
    expect(res.tem_objecao).toBe(true);
    expect(res.recomendada).toBe("destravar_objecao");

    const vObj = res.variantes.destravar_objecao;
    expect(vObj.disponivel).toBe(true);
    expect(vObj.texto).toContain("Oi Roberto");
    expect(vObj.texto).toContain("orçamento");
    // Na vertical opme/saude, traz a pergunta sobre glosa ou custo por procedimento
    expect(vObj.texto.toLowerCase()).toMatch(/procedimento|glosa|diferen/);
    expect(vObj.palavras).toBeGreaterThan(15);
  });

  test("vertical agro especializa argumentos de objeção", () => {
    const ctx: ContextoFollowup = {
      contato: "Marcos Fazendeiro",
      empresa: "Fazenda Boa Vista",
      objecao: "Disse que o concorrente da cooperativa dá 10% de desconto e frete grátis",
    };

    const res = gerarVariantesFollowup(ctx, "agro");
    expect(res.recomendada).toBe("destravar_objecao");
    const texto = res.variantes.destravar_objecao.texto;
    expect(texto).toContain("Oi Marcos");
    expect(texto.toLowerCase()).toMatch(/fornecedor|parceiro|cooperativa|safra|concorrente/);
  });

  test("não contém clichês corporativos proibidos", () => {
    const ctx: ContextoFollowup = {
      contato: "Carlos",
      empresa: "Acme",
      proxima_acao: "Mandar tabela",
      objecao: "Sem verba agora",
    };

    const res = gerarVariantesFollowup(ctx);
    for (const v of Object.values(res.variantes)) {
      if (!v.texto) continue;
      const lower = v.texto.toLowerCase();
      expect(lower).not.toContain("venho por meio desta");
      expect(lower).not.toContain("espero que este e-mail o encontre bem");
      expect(lower).not.toContain("conforme alinhado");
      expect(lower).not.toContain("aproveito a oportunidade");
    }
  });

  test("lida com dados vazios sem quebrar nem gerar undefined", () => {
    const res = gerarVariantesFollowup({});
    expect(res.recomendada).toBe("proximo_passo");
    expect(res.variantes.proximo_passo.texto).not.toContain("undefined");
    expect(res.variantes.proximo_passo.texto).not.toContain("null");
    expect(res.variantes.formal.texto).not.toContain("undefined");
  });
});
