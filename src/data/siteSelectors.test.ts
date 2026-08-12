import { describe, expect, it } from "vitest";
import { createCompleteRemate } from "../test/fixtures";
import {
  createCatalogosFromRemates,
  getCatalogoByRemateId,
  getFeaturedRemate,
  getRemateBySlug,
} from "./siteSelectors";

describe("selectores del sitio", () => {
  const first = createCompleteRemate({ id: "primero", slug: "primero" });
  const second = createCompleteRemate({
    id: "segundo",
    slug: "segundo",
    catalogoPublicacionEstado: "preliminar",
  });

  it("elige el primer remate como destacado y contempla listas vacías", () => {
    expect(getFeaturedRemate([first, second])).toBe(first);
    expect(getFeaturedRemate([])).toBeUndefined();
  });

  it("encuentra remates por slug", () => {
    expect(getRemateBySlug([first, second], "segundo")).toBe(second);
    expect(getRemateBySlug([first, second], "inexistente")).toBeUndefined();
    expect(getRemateBySlug([first, second])).toBeUndefined();
  });

  it("genera catálogos públicos conservando el estado administrativo", () => {
    const catalogos = createCatalogosFromRemates([first, second]);

    expect(catalogos).toHaveLength(2);
    expect(catalogos[1]).toMatchObject({
      remateId: "segundo",
      estado: "preliminar",
      detalle: second.catalogoEstado,
    });
    expect(getCatalogoByRemateId(catalogos, "segundo")).toEqual(catalogos[1]);
  });
});
