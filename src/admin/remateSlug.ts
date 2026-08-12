import type { AdminRemate } from "../types/site";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUniqueRemateSlug(
  title: string,
  remates: AdminRemate[],
  currentRemateId?: string
): string {
  // Reserva el slug base para el primer remate y agrega índices correlativos en duplicados.
  const baseSlug = slugify(title);
  if (!baseSlug) return "";

  const usedSlugs = new Set(
    remates
      .filter((remate) => remate.id !== currentRemateId)
      .map((remate) => remate.slug)
  );

  if (!usedSlugs.has(baseSlug)) return baseSlug;

  let index = 2;
  while (usedSlugs.has(`${baseSlug}-${index}`)) index += 1;
  return `${baseSlug}-${index}`;
}
