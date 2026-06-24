import type { AdminRemate } from "../types/site";

export type PublishValidationErrors = Record<string, string>;

export function validateRemateForPublish(remate: AdminRemate): PublishValidationErrors {
  const errors: PublishValidationErrors = {};

  const requiredTextFields: Array<[keyof AdminRemate, string]> = [
    ["titulo", "El título es obligatorio."],
    ["slug", "La URL del remate es obligatoria."],
    ["fecha", "La fecha resumida es obligatoria."],
    ["fechaCompleta", "La fecha y hora completas son obligatorias."],
    ["subtitulo", "El subtítulo es obligatorio."],
    ["lugar", "El lugar resumido es obligatorio."],
    ["ubicacionDetalle", "La ubicación detallada es obligatoria."],
    ["detalle", "La descripción breve es obligatoria."],
    ["descripcionLarga", "La descripción completa es obligatoria."],
    ["catalogoEstado", "El texto sobre el estado del catálogo es obligatorio."],
  ];

  requiredTextFields.forEach(([field, message]) => {
    const value = remate[field];
    if (typeof value === "string" && !value.trim()) {
      errors[field] = message;
    }
  });

  if (!remate.catalogoPdf.url.trim()) {
    errors.catalogoPdfUrl = "Debe cargarse una URL, ruta o archivo PDF del catálogo.";
  }

  if (!remate.catalogoPdf.fileName.trim()) {
    errors.catalogoPdfFileName = "El nombre del archivo PDF es obligatorio.";
  }

  if (!remate.requisitos.some((item) => item.trim())) {
    errors.requisitos = "Debe indicarse al menos un requisito para participar.";
  }

  if (!remate.condiciones.some((item) => item.trim())) {
    errors.condiciones = "Debe indicarse al menos una condición del remate.";
  }

  return errors;
}

export function remateHasPublishErrors(remate: AdminRemate) {
  return Object.keys(validateRemateForPublish(remate)).length > 0;
}
