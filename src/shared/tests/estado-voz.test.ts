import { describe, expect, test } from "bun:test";
import {
  nivelVozDeDecibeis,
  resolverEstadoVoz,
} from "../estado-voz";

const base = {
  erro: false,
  gravando: false,
  pausado: false,
  pendentes: 0,
  online: true,
  concluido: false,
};

describe("resolverEstadoVoz", () => {
  test("respeita a prioridade operacional dos sete estados", () => {
    expect(resolverEstadoVoz(base)).toBe("pronto");
    expect(resolverEstadoVoz({ ...base, gravando: true })).toBe("gravando");
    expect(
      resolverEstadoVoz({ ...base, gravando: true, pausado: true }),
    ).toBe("pausado");
    expect(resolverEstadoVoz({ ...base, pendentes: 1 })).toBe("processando");
    expect(
      resolverEstadoVoz({ ...base, pendentes: 1, online: false }),
    ).toBe("offline");
    expect(resolverEstadoVoz({ ...base, concluido: true })).toBe("concluido");
    expect(resolverEstadoVoz({ ...base, erro: true })).toBe("erro");
  });

  test("erro prevalece sobre qualquer outro estado", () => {
    expect(
      resolverEstadoVoz({
        ...base,
        erro: true,
        gravando: true,
        pausado: true,
        pendentes: 2,
        online: false,
        concluido: true,
      }),
    ).toBe("erro");
  });
});

describe("nivelVozDeDecibeis", () => {
  test("normaliza metering do mobile entre zero e um", () => {
    expect(nivelVozDeDecibeis(-160)).toBe(0);
    expect(nivelVozDeDecibeis(-30)).toBe(0.5);
    expect(nivelVozDeDecibeis(0)).toBe(1);
    expect(nivelVozDeDecibeis(undefined)).toBe(0);
  });
});
