import { describe, expect, mock, test } from "bun:test";
import { executarAcaoDesktop } from "../desktop";

describe("ações do desktop", () => {
  test("abre um novo relato", () => {
    const novo = mock(() => {});
    const stop = mock(() => {});

    executarAcaoDesktop("novo", { novo, stop });

    expect(novo).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  test("para a gravação", () => {
    const novo = mock(() => {});
    const stop = mock(() => {});

    executarAcaoDesktop("stop", { novo, stop });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(novo).not.toHaveBeenCalled();
  });
});
