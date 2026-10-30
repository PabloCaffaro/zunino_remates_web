import type { Remate } from "../types/site";

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
