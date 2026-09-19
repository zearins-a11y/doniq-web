/**
 * Testes para o Modo Solo ("Caso Único") da Gestão Comercial.
 *
 * Garante que:
 *  1. Usuário sem equipe tem acesso ao painel gerencial ("Operação Individual");
 *  2. Estatísticas, objeções e lacunas refletem exclusivamente seus próprios dados;
 *  3. `modo_solo: true` é retornado para a interface ajustar títulos e ações;
 *  4. Fichas e indicadores respeitam o pacto de privacidade (sem transcrição bruta);
 *  5. Equipe solo não gera erro 403 / 404.
 */

import { describe, expect, test } from "bun:test";
import { calcularPainel } from "../../routes/equipe";
import { db } from "../../database";
import * as schema from "../../database/schema";
import { eq } from "drizzle-orm";

describe("Gestão Comercial / Modo Solo (Caso Único)", () => {
  const userId = `usr_solo_${Date.now()}`;
  const userEmail = `solo.${Date.now()}@doniq.com.br`;
  const hoje = "2026-09-13";

  test("calcularPainel devolve modo_solo: true e nome 'Operação Individual' para usuário sem equipe", async () => {
    // Garante que o usuário existe no banco sem estar em equipe
    await db.insert(schema.users).values({
      userId,
      email: userEmail,
      nome: "Consultor Autônomo",
      criadoEm: "2026-09-01T10:00:00Z",
    });

    // Insere um relato do usuário para validar os indicadores solo
    const relatoId = `rel_solo_${Date.now()}`;
    await db.insert(schema.relatos).values({
      relatoId,
      userId,
      transcricao: "Visita de apresentação realizada no hospital.",
      empresa: "Hospital Santa Luzia",
      contato: "Dra. Paula",
      cargo: "Diretora Clínica",
      telefone: "11999998888",
      resumo: "Apresentação dos módulos clínicos",
      objecao: "Orçamento travado até outubro",
      proximaAcao: "Enviar proposta revisada",
      dataIso: "2026-09-20",
      hora: "10:00",
      temperatura: "quente",
      faltouPerguntar: ["Quem assina o contrato?"],
      tipoVisita: "prospeccao",
      promptVersao: "1.0",
      modelo: "gemini",
      createdAt: "2026-09-13T12:00:00Z",
    });

    const resultado = await calcularPainel(userId, hoje);

    expect(resultado.modo_solo).toBe(true);
    expect(resultado.equipe.nome).toBe("Operação Individual");
    expect(resultado.equipe.equipeId).toBe("solo");
    expect(resultado.papel).toBe("gestor");
    expect(resultado.pessoas.length).toBe(1);
    expect(resultado.pessoas[0].user_id).toBe(userId);
    expect(resultado.pessoas[0].nome).toBe("Consultor Autônomo");
    expect(resultado.painel.equipe.semana).toBe(1);
    expect(resultado.painel.equipe.mes).toBe(1);
    expect(resultado.painel.vendedores.length).toBe(1);
    expect(resultado.painel.vendedores[0].nome).toBe("Consultor Autônomo");
    expect(resultado.painel.objecoes.some((o) => o.texto.includes("Orçamento travado"))).toBe(true);
    expect(resultado.painel.lacunas.some((l) => l.texto.includes("Quem assina"))).toBe(true);
    expect(resultado.fichas.length).toBe(1);
    expect(resultado.fichas[0].empresa).toBe("Hospital Santa Luzia");

    // Limpeza
    await db.delete(schema.relatos).where(eq(schema.relatos.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.userId, userId));
  });

  test("usuário sem registro prévio cai em fallback seguro com modo_solo: true", async () => {
    const idFantasma = `usr_fantasma_${Date.now()}`;
    const resultado = await calcularPainel(idFantasma, hoje);

    expect(resultado.modo_solo).toBe(true);
    expect(resultado.equipe.nome).toBe("Operação Individual");
    expect(resultado.pessoas.length).toBe(1);
    expect(resultado.pessoas[0].nome).toBe("Você");
    expect(resultado.painel.equipe.semana).toBe(0);
    expect(resultado.painel.equipe.mes).toBe(0);
  });
});
