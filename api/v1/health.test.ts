import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSupabaseConnection } from "../_lib/supabase.js";
import handler from "./health.js";

vi.mock("../_lib/supabase.js", () => ({
  checkSupabaseConnection: vi.fn(),
}));

const mockedCheckSupabaseConnection = vi.mocked(checkSupabaseConnection);

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    mockedCheckSupabaseConnection.mockReset();
  });

  it("informa que la API y Supabase están disponibles", async () => {
    mockedCheckSupabaseConnection.mockResolvedValue();

    const response = await handler.fetch(
      new Request("http://localhost/api/v1/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ok",
      checks: { api: "ok", database: "ok" },
    });
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
  });

  it("no expone detalles cuando Supabase no está disponible", async () => {
    mockedCheckSupabaseConnection.mockRejectedValue(
      new Error("Detalle interno que no debe responderse"),
    );

    const response = await handler.fetch(
      new Request("http://localhost/api/v1/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("Detalle interno");
    expect(body).toMatchObject({
      status: "unavailable",
      checks: { api: "ok", database: "unavailable" },
    });
  });

  it("rechaza métodos distintos de GET", async () => {
    const response = await handler.fetch(
      new Request("http://localhost/api/v1/health", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(mockedCheckSupabaseConnection).not.toHaveBeenCalled();
  });
});
