import { describe, expect, test } from "bun:test";
import {
  MAX_TENTATIVAS_UPLOAD,
  erroUploadPermanente,
  erroUploadSemConexao,
  statusDepoisDaFalha,
} from "../upload-retry";

describe("retry do upload de áudio", () => {
  test("mantém falha transitória pendente até esgotar as tentativas", () => {
    expect(statusDepoisDaFalha({ status: 502 }, 1)).toBe("pending");
    expect(statusDepoisDaFalha({ status: 502 }, MAX_TENTATIVAS_UPLOAD)).toBe("failed");
  });

  test("encerra imediatamente para erros permanentes", () => {
    expect(erroUploadPermanente({ status: 401 })).toBe(true);
    expect(statusDepoisDaFalha({ status: 413 }, 1)).toBe("failed");
  });

  test("mantém erros de rede na fila para nova tentativa", () => {
    expect(erroUploadSemConexao(new TypeError("offline"))).toBe(true);
    expect(erroUploadPermanente(new TypeError("offline"))).toBe(false);
    expect(statusDepoisDaFalha(new TypeError("offline"), 2)).toBe("pending");
    expect(statusDepoisDaFalha({ status: 0 }, MAX_TENTATIVAS_UPLOAD)).toBe("pending");
  });
});
