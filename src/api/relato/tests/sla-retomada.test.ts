import { describe, expect, it } from "bun:test";
import {
  avaliarRiscoSilencio,
  diferencaDias,
  gerarMensagemReativacao,
} from "../sla-retomada";

describe("Motor de SLA de Retomada Comercial", () => {
  describe("diferencaDias", () => {
    it("calcula corretamente diferença entre datas", () => {
      expect(diferencaDias("2026-09-20", "2026-09-15")).toBe(5);
      expect(diferencaDias("2026-09-15", "2026-09-20")).toBe(-5);
      expect(diferencaDias("2026-09-20", "2026-09-20")).toBe(0);
    });

    it("trata datas com timestamp ou vazias", () => {
      expect(diferencaDias("2026-09-20T14:30:00Z", "2026-09-18T10:00:00Z")).toBe(2);
      expect(diferencaDias("", "2026-09-20")).toBe(0);
    });
  });

  describe("avaliarRiscoSilencio", () => {
    const hoje = "2026-09-20";

    it("classifica como crítico prazo de próximo passo vencido há 3 ou mais dias", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Metalúrgica ABC",
          contato: "Roberto",
          data_iso: "2026-09-16",
          created_at: "2026-09-10",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("critico");
      expect(diag.esta_atrasado).toBe(true);
      expect(diag.dias_atraso_prazo).toBe(4);
      expect(diag.rotulo_curto).toBe("Atrasado 4d");
    });

    it("classifica como atenção prazo de próximo passo vencido há 1 ou 2 dias", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Hospital Central",
          contato: "Dra. Ana",
          data_iso: "2026-09-19",
          created_at: "2026-09-15",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("atencao");
      expect(diag.esta_atrasado).toBe(true);
      expect(diag.dias_atraso_prazo).toBe(1);
      expect(diag.rotulo_curto).toBe("Venceu 1d");
    });

    it("classifica como em_dia próximo passo agendado para o futuro", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "AgroSol",
          contato: "Marcos",
          data_iso: "2026-09-25",
          created_at: "2026-09-18",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("em_dia");
      expect(diag.esta_atrasado).toBe(false);
      expect(diag.rotulo_curto).toBe("Em 5d");
    });

    it("classifica como em_dia próximo passo agendado para hoje", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "AgroSol",
          contato: "Marcos",
          data_iso: "2026-09-20",
          created_at: "2026-09-18",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("em_dia");
      expect(diag.esta_atrasado).toBe(false);
      expect(diag.rotulo_curto).toBe("Hoje");
    });

    it("alerta lead quente sem data combinada após 5 dias de silêncio (crítico)", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Clínica Bem Estar",
          contato: "Carlos",
          temperatura: "quente",
          created_at: "2026-09-14",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("critico");
      expect(diag.dias_silencio).toBe(6);
      expect(diag.rotulo_curto).toContain("6d sem contato");
    });

    it("alerta lead quente sem data combinada após 3 dias de silêncio (atenção)", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Clínica Bem Estar",
          contato: "Carlos",
          temperatura: "quente",
          created_at: "2026-09-17",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("atencao");
      expect(diag.dias_silencio).toBe(3);
      expect(diag.rotulo_curto).toBe("Esfriando 3d");
    });

    it("alerta objeção travada sem retorno há mais de 7 dias (crítico)", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Indústria Sul",
          contato: "Paulo",
          temperatura: "morna",
          objecao: "Achou a taxa de implantação muito pesada",
          created_at: "2026-09-12",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("critico");
      expect(diag.dias_silencio).toBe(8);
      expect(diag.rotulo_curto).toContain("8d travada");
    });

    it("identifica oportunidade de reativação após 25 dias de silêncio", () => {
      const diag = avaliarRiscoSilencio(
        {
          empresa: "Comércio Antigo",
          contato: "Geraldo",
          temperatura: "fria",
          created_at: "2026-08-15",
        },
        hoje,
      );
      expect(diag.gravidade).toBe("reativacao");
      expect(diag.dias_silencio).toBeGreaterThanOrEqual(25);
    });
  });

  describe("gerarMensagemReativacao", () => {
    it("gera mensagem focada em destravar objeção quando há barreira", () => {
      const msg = gerarMensagemReativacao({
        empresa: "Tech Corp",
        contato: "Dr. Marcelo Ramos",
        objecao: "Preço acima do orçamento anual",
      });
      expect(msg).toContain("Oi Marcelo!");
      expect(msg).toContain("Tech Corp");
      expect(msg).toContain("forma prática de resolver isso");
      expect(msg).toContain("5 minutos");
    });

    it("gera mensagem cordial de retomada baseada na próxima ação", () => {
      const msg = gerarMensagemReativacao({
        empresa: "Distribuidora Vale",
        contato: "Camila",
        proxima_acao: "Enviar tabela com condição para compras em escala",
      });
      expect(msg).toContain("Oi Camila!");
      expect(msg).toContain("não deixar esfriar");
      expect(msg).toContain("disponibilidade nesta semana");
    });
  });
});
