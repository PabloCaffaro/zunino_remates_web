import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "../_lib/adminSession.js";
import handler from "../v1/admin/remates.js";

vi.mock("../_lib/adminSession.js", () => ({ requireAdmin: vi.fn() }));
vi.mock("../_lib/adminStorage.js", () => ({
  prepareLots: vi.fn(),
  removeStoragePaths: vi.fn(),
  signLots: vi.fn(async (_supabase, remate) => remate),
}));

describe("PATCH /api/v1/admin/remates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("compara en PostgreSQL exactamente la versión recibida y propaga el conflicto", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "conflict", current: { id: "10000000-0000-4000-8000-000000000001", version: 12 } },
      error: null,
    });
    vi.mocked(requireAdmin).mockResolvedValue({
      supabase: { rpc },
      user: { id: "20000000-0000-4000-8000-000000000001", nombre: "QA", rol: "editor" },
    } as never);

    const response = await handler.fetch(new Request("https://preview.example/api/v1/admin/remates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "10000000-0000-4000-8000-000000000001",
        version: 11,
        status: "oculto",
      }),
    }));

    expect(rpc).toHaveBeenCalledWith("admin_change_remate_status", {
      p_id: "10000000-0000-4000-8000-000000000001",
      p_expected_version: 11,
      p_status: "oculto",
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: "conflict", current: { version: 12 } },
    });
  });
});
