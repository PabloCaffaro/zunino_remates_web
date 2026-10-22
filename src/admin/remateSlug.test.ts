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

  it("genera un slug técnico estable para títulos vacíos o compuestos por símbolos", () => {
    const id = "7ba5d85f-4507-4d1b-a26e-5a7ab6ad5b80";

    expect(createUniqueRemateSlug("", [], id)).toBe(`borrador-${id}`);
    expect(createUniqueRemateSlug("!@#$%", [], id)).toBe(`borrador-${id}`);
    expect(createUniqueRemateSlug("", [], id)).toBe(`borrador-${id}`);
  });

  it("evita colisiones del slug técnico", () => {
    const id = "7ba5d85f-4507-4d1b-a26e-5a7ab6ad5b80";
    const remates = [
      createCompleteRemate({ id: "otro", slug: `borrador-${id}` }),
    ];

    expect(createUniqueRemateSlug("", remates, id)).toBe(`borrador-${id}-2`);
  });
});
