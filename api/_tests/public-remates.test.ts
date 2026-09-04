import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublishedRemates } from "../_lib/publicData.js";
import handler from "../v1/public/remates.js";

vi.mock("../_lib/publicData.js", () => ({ getPublishedRemates: vi.fn() }));

const mockedGetPublishedRemates = vi.mocked(getPublishedRemates);

describe("GET /api/v1/public/remates", () => {
  beforeEach(() => {
    mockedGetPublishedRemates.mockReset();
  });

  it("devuelve solamente el contrato público preparado por el servicio", async () => {
    mockedGetPublishedRemates.mockResolvedValue([]);

    const response = await handler.fetch(new Request("http://localhost/api/v1/public/remates"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rechaza escrituras", async () => {
    const response = await handler.fetch(
      new Request("http://localhost/api/v1/public/remates", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(mockedGetPublishedRemates).not.toHaveBeenCalled();
  });
});
