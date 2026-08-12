import type { RemateEstadoAdmin } from "../types/site";

const allowedTransitions: Record<RemateEstadoAdmin, readonly RemateEstadoAdmin[]> = {
  borrador: ["en_revision"],
  en_revision: ["borrador", "publicado"],
  publicado: ["oculto", "finalizado", "cancelado"],
  oculto: ["publicado", "finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

export const remateStatusLabels: Record<RemateEstadoAdmin, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  publicado: "Publicado",
  oculto: "Oculto",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function canTransitionRemateStatus(
  currentStatus: RemateEstadoAdmin,
  nextStatus: RemateEstadoAdmin
): boolean {
  return currentStatus === nextStatus || allowedTransitions[currentStatus].includes(nextStatus);
}

export function canRegenerateRemateSlug(status: RemateEstadoAdmin): boolean {
  return status === "borrador" || status === "en_revision";
}

export function isPublicRemateStatus(status: RemateEstadoAdmin): boolean {
  return status === "publicado";
}
