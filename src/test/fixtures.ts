import type { AdminRemate } from "../types/site";

export function createCompleteRemate(
  overrides: Partial<AdminRemate> = {}
): AdminRemate {
  const base: AdminRemate = {
    id: "remate-prueba",
    slug: "remate-de-prueba",
    fecha: "20 JUN · 17:00",
    fechaCompleta: "Sábado 20 de junio · 17:00",
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
    catalogoPdf: {
      url: "/catalogos/remate-prueba.pdf",
      fileName: "remate-prueba.pdf",
      label: "Descargar catálogo PDF",
    },
    estadoAdmin: "publicado",
    catalogoPublicacionEstado: "disponible",
    creadoEn: "2026-06-01T12:00:00.000Z",
    actualizadoEn: "2026-06-01T12:00:00.000Z",
  };

  return {
    ...base,
    ...overrides,
    catalogoPdf: {
      ...base.catalogoPdf,
      ...overrides.catalogoPdf,
    },
  };
}
