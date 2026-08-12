import { describe, expect, it } from "vitest";
import {
  highlightedLotNameErrorKey,
  remateHasPublishErrors,
  validateHighlightedLotNames,
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
      fechaCompleta: expect.any(String),
      subtitulo: expect.any(String),
      lugar: expect.any(String),
      ubicacionDetalle: expect.any(String),
      detalle: expect.any(String),
      descripcionLarga: expect.any(String),
      catalogoEstado: expect.any(String),
    });
  });

  it("rechaza fechas libres, horas inválidas y días inexistentes", () => {
    expect(
      validateRemateForPublish(createCompleteRemate({ fechaCompleta: "Cualquier cosa" }))
        .fechaCompleta
    ).toBeDefined();
    expect(
      validateRemateForPublish(createCompleteRemate({ fechaCompleta: "20/06/2026 25:00" }))
        .fechaCompleta
    ).toBeDefined();
    expect(
      validateRemateForPublish(createCompleteRemate({ fechaCompleta: "31/02/2026 17:00" }))
        .fechaCompleta
    ).toBeDefined();
  });

  it("permite publicar con fecha a confirmar", () => {
    const errors = validateRemateForPublish(
      createCompleteRemate({ fechaCompleta: "", fechaPorConfirmar: true })
    );

    expect(errors.fechaCompleta).toBeUndefined();
  });

  it("rechaza requisitos y condiciones incompletos", () => {
    const remate = createCompleteRemate({ requisitos: ["  "], condiciones: [] });
    const errors = validateRemateForPublish(remate);

    expect(errors.requisitos).toBeDefined();
    expect(errors.condiciones).toBeDefined();
    expect(remateHasPublishErrors(remate)).toBe(true);
  });

  it("exige un nombre para cada foto de lote destacado", () => {
    const remate = createCompleteRemate({
      destacados: [
        {
          id: "lote-sin-nombre",
          nombre: " ",
          imagen: { url: "data:image/webp;base64,AA==", alt: "Vista previa" },
        },
      ],
    });

    const errors = validateHighlightedLotNames(remate);

    expect(errors[highlightedLotNameErrorKey("lote-sin-nombre")]).toBeDefined();
    expect(validateRemateForPublish(remate)).toMatchObject(errors);
  });
});
