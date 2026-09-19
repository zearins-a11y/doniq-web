import { describe, expect, test } from "bun:test";
import app from "../../index";

describe("Lista de espera / Cadastro de piloto B2B", () => {
  test("rejeita e-mail mal formatado com 400", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalido", nome: "Teste" }),
      }),
    );

    expect(res.status).toBe(400);
    const corpo = await res.json();
    expect(corpo.detail).toContain("E-mail inválido");
  });

  test("aceita cadastro corporativo e processa lead com 200", async () => {
    const emailUnico = `gestor.teste.${Date.now()}@empresaagro.com.br`;
    const res = await app.fetch(
      new Request("http://localhost/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailUnico,
          nome: "Roberto Silva",
          empresa: "AgroSol Distribuidora",
          tamanho: "5 a 15 vendedores",
          crm: "pipedrive",
          telefone: "(41) 99999-7777",
        }),
      }),
    );

    expect(res.status).toBe(200);

    // Reenvio imediato não gera erro (idempotência / onConflictDoNothing)
    const reenvio = await app.fetch(
      new Request("http://localhost/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailUnico,
          nome: "Roberto Silva",
          empresa: "AgroSol Distribuidora",
        }),
      }),
    );
    expect(reenvio.status).toBe(200);
  });
});
