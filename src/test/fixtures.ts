import type { AdminRemate } from "../types/site";

export function createCompleteRemate(
  overrides: Partial<AdminRemate> = {}
): AdminRemate {
  const base: AdminRemate = {
    id: "remate-prueba",
    slug: "remate-de-prueba",
    fechaCompleta: "20/06/2026 17:00",
    fechaPorConfirmar: false,
    titulo: "Remate de prueba",
    subtitulo: "Activos seleccionados",
    lugar: "Salón de prueba",
    ubicacionDetalle: "Salón de prueba, Montevideo",
    detalle: "Descripción breve del remate.",
    enlace: "Catálogo disponible",
    catalogoEstado: "Catálogo completo y verificado.",
    descripcionLarga: "Descripción completa del remate utilizada por la página de detalle.",
    destacados: [],
    requisitos: ["Documento de identidad"],
    condiciones: ["Pago dentro del plazo indicado"],
    estadoAdmin: "publicado",
    catalogoPublicacionEstado: "disponible",
    creadoEn: "2026-06-01T12:00:00.000Z",
    actualizadoEn: "2026-06-01T12:00:00.000Z",
  };

  return { ...base, ...overrides };
}
