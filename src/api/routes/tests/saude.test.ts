import { describe, expect, test } from "bun:test";
import app from "../../index";

describe("Endpoint de Saúde / Health Check", () => {
  test("GET /api/health retorna 200 com status ok", async () => {
    const req = new Request("http://localhost:3000/api/health");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("ok");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
