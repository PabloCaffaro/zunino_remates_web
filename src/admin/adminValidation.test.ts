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
      fechaHora: null,
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
      fechaHora: expect.any(String),
      subtitulo: expect.any(String),
      lugar: expect.any(String),
      ubicacionDetalle: expect.any(String),
      detalle: expect.any(String),
      descripcionLarga: expect.any(String),
      catalogoEstado: expect.any(String),
    });
  });

  it("rechaza un remate sin un instante de fecha real", () => {
    expect(validateRemateForPublish(createCompleteRemate({ fechaHora: null })).fechaHora).toBeDefined();
  });

  it("permite publicar con fecha a confirmar", () => {
    const errors = validateRemateForPublish(
      createCompleteRemate({ fechaHora: null, fechaPorConfirmar: true })
    );

    expect(errors.fechaHora).toBeUndefined();
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
