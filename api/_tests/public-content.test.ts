import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicContent } from "../_lib/publicData.js";
import handler from "../v1/public/content.js";

vi.mock("../_lib/publicData.js", () => ({ getPublicContent: vi.fn() }));

const mockedGetPublicContent = vi.mocked(getPublicContent);

describe("GET /api/v1/public/content", () => {
  beforeEach(() => {
    mockedGetPublicContent.mockReset();
  });

  it("devuelve el contenido público", async () => {
    mockedGetPublicContent.mockResolvedValue({
      contacto: { email: "a@b.com", telefono: "1", direccion: "d", horario: "h", mapEmbedUrl: "m" },
      pasos: [],
      faqs: [],
      copy: {
        heroEyebrow: "e",
        heroTitle: "t",
        heroDescription: "d",
        empresaTitle: "e",
        empresaParagraph1: "p1",
        empresaParagraph2: "p2",
        ubicacionTitle: "u",
        ubicacionDescription: "d",
      },
    });

    const response = await handler.fetch(new Request("http://localhost/api/v1/public/content"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.copy.heroTitle).toBe("t");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
  });

  it("no expone el error interno", async () => {
    mockedGetPublicContent.mockRejectedValue(new Error("dato privado"));

    const response = await handler.fetch(new Request("http://localhost/api/v1/public/content"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("dato privado");
  });
});
