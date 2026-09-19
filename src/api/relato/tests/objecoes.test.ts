import { describe, expect, test } from "bun:test";
import {
  analisarObjecao,
  classificarCategoriaObjecao,
  obterPlaybookObjecao,
  type CategoriaObjecao,
} from "../objecoes";

describe("classificarCategoriaObjecao", () => {
  test("texto vazio ou em branco devolve indefinida", () => {
    expect(classificarCategoriaObjecao("")).toBe("indefinida");
    expect(classificarCategoriaObjecao("   ")).toBe("indefinida");
  });

  test("classifica sinais clássicos de preço", () => {
    expect(classificarCategoriaObjecao("Achou o valor muito caro")).toBe("preco");
    expect(classificarCategoriaObjecao("Orçamento apertado para este trimestre")).toBe("preco");
    expect(classificarCategoriaObjecao("Pediu desconto de 20% na mensalidade")).toBe("preco");
    expect(classificarCategoriaObjecao("Sem verba e sem fluxo de caixa")).toBe("preco");
    expect(classificarCategoriaObjecao("Achou o preço salgado")).toBe("preco");
  });

  test("classifica sinais de concorrente e contrato vigente", () => {
    expect(classificarCategoriaObjecao("Já temos contrato com a Totvs")).toBe("concorrente");
    expect(classificarCategoriaObjecao("Atendido pelo concorrente há 5 anos")).toBe("concorrente");
    expect(classificarCategoriaObjecao("Usam SAP e têm fidelidade até o fim do ano")).toBe("concorrente");
    expect(classificarCategoriaObjecao("Preferem manter o parceiro atual")).toBe("concorrente");
  });

  test("classifica sinais de timing e prioridade", () => {
    expect(classificarCategoriaObjecao("Pediu para ligar ano que vem")).toBe("timing");
    expect(classificarCategoriaObjecao("Deixar para o segundo semestre")).toBe("timing");
    expect(classificarCategoriaObjecao("Agora não é prioridade da empresa")).toBe("timing");
    expect(classificarCategoriaObjecao("Projeto congelado em standby")).toBe("timing");
  });

  test("classifica sinais de decisor e governança", () => {
    expect(classificarCategoriaObjecao("Precisa levar para aprovação da diretoria")).toBe("decisor");
    expect(classificarCategoriaObjecao("O sócio precisa assinar junto")).toBe("decisor");
    expect(classificarCategoriaObjecao("Depende do comitê de compras da matriz")).toBe("decisor");
    expect(classificarCategoriaObjecao("Não tem autonomia para fechar sozinho")).toBe("decisor");
  });

  test("classifica sinais de risco e transição", () => {
    expect(classificarCategoriaObjecao("Medo de parar a fábrica na troca")).toBe("risco");
    expect(classificarCategoriaObjecao("Receio que a equipe não se adapte ao sistema")).toBe("risco");
    expect(classificarCategoriaObjecao("Preocupação com suporte e instabilidade")).toBe("risco");
    expect(classificarCategoriaObjecao("Processo de migração parece complexo demais")).toBe("risco");
  });

  test("frase aleatória sem palavras-chave vira indefinida", () => {
    expect(classificarCategoriaObjecao("Reunião tranquila no escritório")).toBe("indefinida");
    expect(classificarCategoriaObjecao("Tomamos um café e conversamos sobre o tempo")).toBe("indefinida");
  });

  test("ignora acentos e caixa alta", () => {
    expect(classificarCategoriaObjecao("PREÇO MUITO CARO")).toBe("preco");
    expect(classificarCategoriaObjecao("Orçamento está congelado no COMITÊ")).toBeDefined();
  });
});

describe("obterPlaybookObjecao & verticalização", () => {
  const categorias: CategoriaObjecao[] = [
    "preco",
    "concorrente",
    "timing",
    "decisor",
    "risco",
    "indefinida",
  ];

  test("todas as categorias geram estrutura completa e perguntas com interrogação", () => {
    for (const cat of categorias) {
      const pb = obterPlaybookObjecao(cat, "geral");
      expect(pb.categoria).toBe(cat);
      expect(pb.rotulo_categoria.length).toBeGreaterThan(0);
      expect(pb.diagnostico.length).toBeGreaterThan(10);
      expect(pb.contra_argumentos.length).toBeGreaterThanOrEqual(2);
      expect(pb.perguntas_destravamento.length).toBeGreaterThanOrEqual(1);
      expect(pb.orientacao_gestor.length).toBeGreaterThan(10);
      for (const p of pb.perguntas_destravamento) {
        expect(p.endsWith("?")).toBe(true);
      }
    }
  });

  test("vertical industria especializa argumentos de preço com OEE / MTBF / parada", () => {
    const pb = obterPlaybookObjecao("preco", "industria");
    const textoCompleto = JSON.stringify(pb);
    expect(textoCompleto.includes("parada") || textoCompleto.includes("OEE")).toBe(true);
    expect(textoCompleto.includes("manutenção") || textoCompleto.includes("PCM")).toBe(true);
  });

  test("vertical servicos especializa argumentos de preço com horas e processos manuais", () => {
    const pb = obterPlaybookObjecao("preco", "servicos");
    const textoCompleto = JSON.stringify(pb);
    expect(textoCompleto.includes("horas") || textoCompleto.includes("manual")).toBe(true);
    expect(textoCompleto.includes("piloto") || textoCompleto.includes("modular")).toBe(true);
  });

  test("vertical agro especializa argumentos de preço com safra / sacas", () => {
    const pb = obterPlaybookObjecao("preco", "agro");
    const textoCompleto = JSON.stringify(pb);
    expect(textoCompleto.includes("safra") || textoCompleto.includes("sacas")).toBe(true);
  });

  test("vertical saude especializa argumentos de preço com glosa / procedimento", () => {
    const pb = obterPlaybookObjecao("preco", "saude");
    const textoCompleto = JSON.stringify(pb);
    expect(textoCompleto.includes("glosa") || textoCompleto.includes("procedimento")).toBe(true);
  });

  test("analisarObjecao embute o texto original e preserva integridade", () => {
    const res = analisarObjecao("O cliente achou a mensalidade salgada", "servicos");
    expect(res.categoria).toBe("preco");
    expect(res.texto_original).toBe("O cliente achou a mensalidade salgada");
    expect(res.cor).toBe("amber");
    expect(res.perguntas_destravamento.length).toBeGreaterThan(0);
  });
});
