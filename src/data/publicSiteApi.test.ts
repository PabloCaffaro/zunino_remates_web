import { describe, expect, it, vi } from "vitest";
import { fetchPublicSiteData } from "./publicSiteApi";

describe("cliente de datos públicos", () => {
  it("evita reutilizar una respuesta anterior al recargar remates", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      new Response(JSON.stringify({
        data: String(url).endsWith("/remates") ? [] : {
          contacto: {}, pasos: [], faqs: [], copy: {},
        },
      }))
    );

    await fetchPublicSiteData(new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toMatchObject({ cache: "no-store" });
    }
  });
});
