import { describe, expect, it } from "vitest";
import {
  remateHasPublishErrors,
  validateRemateForPublish,
} from "./adminValidation";
import { createCompleteRemate } from "../test/fixtures";

describe("validateRemateForPublish", () => {
  it("acepta un remate con todos los campos obligatorios", () => {
    const errors = validateRemateForPublish(createCompleteRemate());

    expect(errors).toEqual({});
    expect(remateHasPublishErrors(createCompleteRemate())).toBe(false);
  });

  it("informa todos los campos de texto obligatorios vacíos", () => {
    const remate = createCompleteRemate({
      titulo: " ",
      slug: "",
      fecha: "",
      fechaCompleta: "",
      subtitulo: "",
      lugar: "",
      ubicacionDetalle: "",
      detalle: "",
      descripcionLarga: "",
      catalogoEstado: "",
    });

    const errors = validateRemateForPublish(remate);

    expect(errors).toMatchObject({
      titulo: expect.any(String),
      slug: expect.any(String),
      fecha: expect.any(String),
      fechaCompleta: expect.any(String),
      subtitulo: expect.any(String),
      lugar: expect.any(String),
      ubicacionDetalle: expect.any(String),
      detalle: expect.any(String),
      descripcionLarga: expect.any(String),
      catalogoEstado: expect.any(String),
    });
  });

  it("rechaza catálogo, requisitos y condiciones incompletos", () => {
    const remate = createCompleteRemate({
      catalogoPdf: { url: "", fileName: "", label: "Descargar catálogo PDF" },
      requisitos: ["  "],
      condiciones: [],
    });

    const errors = validateRemateForPublish(remate);

    expect(errors.catalogoPdfUrl).toBeDefined();
    expect(errors.catalogoPdfFileName).toBeDefined();
    expect(errors.requisitos).toBeDefined();
    expect(errors.condiciones).toBeDefined();
    expect(remateHasPublishErrors(remate)).toBe(true);
  });
});
