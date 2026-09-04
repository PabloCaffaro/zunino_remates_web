import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError, createAdminApi } from "./adminApi";

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(status >= 400 ? data : { data }), { status, headers: { "content-type": "application/json" } });

describe("cliente de la API administrativa", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("mantiene tokens fuera del navegador y envía el CSRF recibido", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ user: { id: "1", nombre: "Admin", rol: "administrador" }, csrf: "csrf-secreto" }))
      .mockResolvedValueOnce(jsonResponse([]));
    const api = createAdminApi();
    await api.login("admin@example.com", "clave");
    await api.request("remates", "POST", { remate: {} });
    const headers = fetchMock.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBe("csrf-secreto");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("access_token");
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it("renueva una sola vez y repite la operación rechazada antes de escribir", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "Renovar", code: "refresh_required" }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: { id: "1", nombre: "Admin", rol: "administrador" }, csrf: "nuevo" }))
      .mockResolvedValueOnce(jsonResponse({ status: "saved" }));
    const result = await createAdminApi().request<{ status: string }>("remates", "PATCH", { id: "1" });
    expect(result.status).toBe("saved");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/v1/admin/remates", "/api/v1/admin/session", "/api/v1/admin/remates"]);
  });

  it("devuelve los conflictos como resultado y no reintenta errores comunes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ data: { status: "conflict", current: null } }, 409));
    await expect(createAdminApi().request("remates", "DELETE", {})).resolves.toMatchObject({ status: "conflict" });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    await expect(createAdminApi().session()).rejects.toBeInstanceOf(AdminApiError);
  });
});
