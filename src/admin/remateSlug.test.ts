import { describe, expect, it } from "vitest";
import { createCompleteRemate } from "../test/fixtures";
import { createUniqueRemateSlug, slugify } from "./remateSlug";

describe("slug de remates", () => {
  it("normaliza el título y elimina tildes", () => {
    expect(slugify("  Vehículos y Camión  ")).toBe("vehiculos-y-camion");
  });

  it("agrega un índice cuando el slug ya existe", () => {
    const remates = [
      createCompleteRemate({ id: "1", slug: "remate-especial" }),
      createCompleteRemate({ id: "2", slug: "remate-especial-2" }),
    ];

    expect(createUniqueRemateSlug("Remate especial", remates, "3")).toBe(
      "remate-especial-3"
    );
  });

  it("ignora al remate actual al recalcular su título", () => {
    const remate = createCompleteRemate({ id: "1", slug: "remate-especial" });
    expect(createUniqueRemateSlug("Remate especial", [remate], "1")).toBe(
      "remate-especial"
    );
  });
});
