import { describe, expect, test } from "bun:test";
import { CORES_MODAL_LGPD } from "../modal-lgpd";

describe("cores do modal LGPD", () => {
  test("usa pares semânticos de superfície e texto", () => {
    expect(CORES_MODAL_LGPD.fundo).toContain("--via");
    expect(CORES_MODAL_LGPD.superficie).toContain("--superficie");
    expect(CORES_MODAL_LGPD.titulo).toContain("--tinta");
    expect(CORES_MODAL_LGPD.texto).toContain("--tinta2");
    expect(Object.values(CORES_MODAL_LGPD).join(" ")).not.toContain("currentColor");
    expect(Object.values(CORES_MODAL_LGPD).join(" ")).not.toContain("--fundo");
  });
});
