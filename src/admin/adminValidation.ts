import type { AdminRemate } from "../types/site";
import { isValidRemateDateTime } from "../data/remateFormatting";

export type PublishValidationErrors = Record<string, string>;

export function highlightedLotNameErrorKey(lotId: string) {
  return `destacados.${lotId}.nombre`;
}

export function validateHighlightedLotNames(remate: AdminRemate): PublishValidationErrors {
  return remate.destacados.reduce<PublishValidationErrors>((errors, lot) => {
    if (!lot.nombre.trim()) {
      errors[highlightedLotNameErrorKey(lot.id)] = "Cada foto debe tener un nombre.";
    }

    return errors;
  }, {});
}

export function validateRemateForPublish(remate: AdminRemate): PublishValidationErrors {
  const errors: PublishValidationErrors = validateHighlightedLotNames(remate);

  const requiredTextFields: Array<[keyof AdminRemate, string]> = [
    ["titulo", "El título es obligatorio."],
    ["slug", "La URL del remate es obligatoria."],
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

  if (!remate.fechaPorConfirmar) {
    if (!remate.fechaCompleta.trim()) {
      errors.fechaCompleta = "La fecha y hora son obligatorias o deben marcarse como pendientes.";
    } else if (!isValidRemateDateTime(remate.fechaCompleta)) {
      errors.fechaCompleta = "Ingresá una fecha válida con el formato dd/mm/yyyy HH:mm.";
    }
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
