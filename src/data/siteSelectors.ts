import type { Catalogo, CatalogoEstado, Remate } from "../types/site";

export function getFeaturedRemate(remates: Remate[]): Remate | undefined {
  // Mantiene la decisión de cuál es el remate destacado en un solo lugar, sin dispersar accesos al array por toda la UI.
  return remates[0];
}

export function getRemateBySlug(remates: Remate[], slug?: string): Remate | undefined {
  if (!slug) {
    return undefined;
  }

  return remates.find((item) => item.slug === slug);
}

export function getCatalogoByRemateId(
  catalogos: Catalogo[],
  remateId: Remate["id"]
): Catalogo | undefined {
  // Los catálogos se vinculan por id de remate para que la página de detalle resuelva su documento sin duplicar datos.
  return catalogos.find((item) => item.remateId === remateId);
}

export function createCatalogosFromRemates(remates: Remate[]): Catalogo[] {
  return remates.map((remate) => {
    const estado: CatalogoEstado =
      "catalogoPublicacionEstado" in remate
        ? (remate.catalogoPublicacionEstado as CatalogoEstado)
        : "disponible";

    return {
      id: `catalogo-${remate.id}`,
      remateId: remate.id,
      titulo: remate.titulo,
      detalle: remate.catalogoEstado,
      accion: "Descargar PDF",
      secundaria: "Ver detalle",
      estado,
      pdf: remate.catalogoPdf,
    };
  });
}
