import { ApiError } from "./adminHttp.js";

const states = ["borrador", "en_revision", "publicado", "oculto", "finalizado", "cancelado"];
export function requireId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ApiError(400, "Identificador inválido.");
  return value;
}
export function requireVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ApiError(400, "Versión inválida.");
  return value;
}
export function requireStatus(value: unknown): string {
  if (typeof value !== "string" || !states.includes(value)) throw new ApiError(400, "Estado inválido.");
  return value;
}
export function validateRemate(body: Record<string, unknown>) {
  const input = body.remate;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Falta el remate.");
  const r = input as Record<string, unknown>;
  const result: Record<string, unknown> = { id: requireId(r.id), estadoAdmin: requireStatus(r.estadoAdmin) };
  for (const key of ["titulo", "subtitulo", "slug", "lugar", "ubicacionDetalle", "detalle", "descripcionLarga", "catalogoEstado"]) {
    if (typeof r[key] !== "string" || r[key].length > 10000) throw new ApiError(400, `Campo inválido: ${key}.`);
    result[key] = r[key];
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug as string) || (result.slug as string).length > 200) throw new ApiError(400, "La ruta del remate no es válida.");
  if (typeof r.fechaPorConfirmar !== "boolean") throw new ApiError(400, "Indicá si la fecha está confirmada.");
  if (r.fechaHora !== null && (typeof r.fechaHora !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(r.fechaHora) || !Number.isFinite(Date.parse(r.fechaHora)))) throw new ApiError(400, "Fecha inválida.");
  result.fechaHora = r.fechaPorConfirmar ? null : r.fechaHora;
  result.fechaPorConfirmar = r.fechaPorConfirmar;
  if (!["disponible", "preliminar", "proximamente"].includes(String(r.catalogoPublicacionEstado))) throw new ApiError(400, "Estado de catálogo inválido.");
  result.catalogoPublicacionEstado = r.catalogoPublicacionEstado;
  for (const key of ["requisitos", "condiciones"]) {
    const items = r[key];
    if (!Array.isArray(items) || items.length > 100 || items.some((value) => typeof value !== "string" || !value.trim() || value.length > 2000)) throw new ApiError(400, `Lista inválida: ${key}.`);
    result[key] = items;
  }
  if (!Array.isArray(r.destacados) || r.destacados.length) throw new ApiError(400, "La carga de fotos se habilitará en la etapa de Storage.");
  return { remate: result, version: requireVersion(r.version) };
}

export function databaseError(error: { code?: string }) {
  if (error.code === "23505") return new ApiError(409, "Ya existe un remate con esa ruta. Cambiá el título o recargá el listado.");
  if (error.code === "42501") return new ApiError(403, "No tenés permisos para esta operación.");
  if (["23514", "23502", "22023", "22P02", "22007", "22008"].includes(error.code ?? "")) return new ApiError(400, "Revisá los datos obligatorios, el estado y la ruta del remate. No se guardó ningún cambio.");
  return new Error("Falló la operación en la base de datos.");
}
