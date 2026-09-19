import { describe, expect, test } from "bun:test";
import {
  encerrarTodasAsSessoes,
  podeConcluirLogoutNaInterface,
} from "../logout";

describe("encerrarTodasAsSessoes", () => {
  test("revoga a sessão do app e a do Better Auth antes de limpar o estado local", async () => {
    const etapas: string[] = [];

    await encerrarTodasAsSessoes({
      revogarSessaoAplicativo: () => etapas.push("app"),
      revogarSessaoBetterAuth: () => etapas.push("better-auth"),
      limparSessaoGerenciada: () => etapas.push("gerenciada"),
      limparSessaoLocal: () => etapas.push("local"),
    });

    expect(etapas).toEqual(["app", "better-auth", "gerenciada", "local"]);
  });

  test("espera a revogação do app antes de invalidar a credencial do Better Auth", async () => {
    const etapas: string[] = [];
    let concluirRevogacaoAplicativo: (() => void) | undefined;
    const revogacaoAplicativo = new Promise<void>((resolver) => {
      concluirRevogacaoAplicativo = resolver;
    });

    const logout = encerrarTodasAsSessoes({
      revogarSessaoAplicativo: () => {
        etapas.push("app-inicio");
        return revogacaoAplicativo.then(() => etapas.push("app-fim"));
      },
      revogarSessaoBetterAuth: () => etapas.push("better-auth"),
      limparSessaoGerenciada: () => etapas.push("gerenciada"),
      limparSessaoLocal: () => etapas.push("local"),
    });
    await Promise.resolve();

    expect(etapas).toEqual(["app-inicio"]);
    concluirRevogacaoAplicativo?.();
    await logout;
    expect(etapas).toEqual(["app-inicio", "app-fim", "better-auth", "gerenciada", "local"]);
  });

  test("continua o logout quando uma revogação remota falha", async () => {
    const etapas: string[] = [];

    const resultado = await encerrarTodasAsSessoes({
      revogarSessaoAplicativo: () => {
        etapas.push("app");
        throw new Error("sem rede");
      },
      revogarSessaoBetterAuth: () => {
        etapas.push("better-auth");
        return { error: { message: "sessão já encerrada" } };
      },
      limparSessaoGerenciada: () => etapas.push("gerenciada"),
      limparSessaoLocal: () => etapas.push("local"),
    });

    expect(resultado).toEqual({
      sessaoAplicativoRevogada: false,
      sessaoBetterAuthRevogada: false,
    });
    expect(etapas).toEqual(["app", "better-auth", "gerenciada", "local"]);
  });

  test("limpa os tokens mesmo quando uma revogação remota nunca responde", async () => {
    const etapas: string[] = [];

    const resultado = await encerrarTodasAsSessoes(
      {
        revogarSessaoAplicativo: () => etapas.push("app"),
        revogarSessaoBetterAuth: () => new Promise(() => {}),
        limparSessaoGerenciada: () => etapas.push("gerenciada"),
        limparSessaoLocal: () => etapas.push("local"),
      },
      10,
    );

    expect(resultado).toEqual({
      sessaoAplicativoRevogada: true,
      sessaoBetterAuthRevogada: false,
    });
    expect(etapas).toContain("gerenciada");
    expect(etapas).toContain("local");
  });
});

describe("podeConcluirLogoutNaInterface", () => {
  test("mantém a interface autenticada quando o cookie não foi revogado", () => {
    expect(
      podeConcluirLogoutNaInterface(
        {
          sessaoAplicativoRevogada: true,
          sessaoBetterAuthRevogada: false,
        },
        true,
      ),
    ).toBe(false);
  });

  test("conclui o logout quando o cookie foi revogado", () => {
    expect(
      podeConcluirLogoutNaInterface(
        {
          sessaoAplicativoRevogada: true,
          sessaoBetterAuthRevogada: true,
        },
        true,
      ),
    ).toBe(true);
  });

  test("permite logout local quando a autenticação não usa cookie", () => {
    expect(
      podeConcluirLogoutNaInterface(
        {
          sessaoAplicativoRevogada: false,
          sessaoBetterAuthRevogada: false,
        },
        false,
      ),
    ).toBe(true);
  });
});
