import { ApiError } from "./adminHttp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireId } from "./adminRemates.js";

const MAX_IMAGE_BYTES = 700_000;
const MAX_LOTS = 8;
const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

const isSignatureValid = (bytes: Uint8Array, mime: keyof typeof types) => mime === "image/jpeg"
  ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  : mime === "image/png"
    ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

function decodeDataUrl(url: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
  if (!match) throw new ApiError(400, "Una de las imágenes no tiene un formato válido.");
  const mime = match[1] as keyof typeof types;
  let binary: string;
  try { binary = atob(match[2]); } catch { throw new ApiError(400, "No se pudo leer una de las imágenes."); }
  if (binary.length === 0 || binary.length > MAX_IMAGE_BYTES) throw new ApiError(413, "Cada imagen puede pesar hasta 700.000 bytes.");
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (!isSignatureValid(bytes, mime)) throw new ApiError(400, "El contenido de una imagen no coincide con su formato.");
  return { bytes, mime, extension: types[mime] };
}

export async function prepareLots(supabase: SupabaseClient, remateIdValue: unknown, lotsValue: unknown) {
  const remateId = requireId(remateIdValue);
  if (!Array.isArray(lotsValue) || lotsValue.length > MAX_LOTS) throw new ApiError(400, "Podés cargar hasta 8 lotes destacados por remate.");
  const uploaded: string[] = [];
  const lots = [];
  try {
    for (const [index, value] of lotsValue.entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, `Revisá el lote ${index + 1}.`);
      const lot = value as Record<string, unknown>;
      const nombre = typeof lot.nombre === "string" ? lot.nombre.trim() : "";
      const image = lot.imagen as Record<string, unknown> | undefined;
      if (!nombre || nombre.length > 500 || !image || typeof image.alt !== "string") throw new ApiError(400, `Revisá el nombre del lote ${index + 1}.`);
      if (typeof image.url === "string" && image.url.startsWith("data:")) {
        const decoded = decodeDataUrl(image.url);
        const id = crypto.randomUUID();
        const path = `${remateId}/${id}.${decoded.extension}`;
        const { error } = await supabase.storage.from("lotes-remates").upload(path, decoded.bytes, { contentType: decoded.mime, upsert: false });
        if (error) throw new Error("No se pudo subir una imagen.");
        uploaded.push(path);
        lots.push({ id, nombre, storagePath: path, imagen: { url: "", alt: image.alt.trim() || `Imagen de ${nombre}` } });
      } else {
        const id = requireId(lot.id);
        const path = typeof lot.storagePath === "string" ? lot.storagePath : "";
        if (!new RegExp(`^${remateId}/${id}\\.(?:jpg|jpeg|png|webp)$`, "i").test(path)) throw new ApiError(400, `La imagen del lote ${index + 1} no es válida.`);
        lots.push({ id, nombre, storagePath: path, imagen: { url: "", alt: image.alt.trim() || `Imagen de ${nombre}` } });
      }
    }
    return { lots, uploaded };
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("lotes-remates").remove(uploaded);
    throw error;
  }
}

export async function removeStoragePaths(supabase: SupabaseClient, paths: string[]) {
  if (paths.length) await supabase.storage.from("lotes-remates").remove(paths);
}

export async function signLots<T extends { destacados?: Array<{ storagePath?: string; imagen: { url: string } }> }>(supabase: SupabaseClient, remate: T | null): Promise<T | null> {
  if (!remate?.destacados?.length) return remate;
  const paths = remate.destacados.map((lot) => lot.storagePath ?? "");
  const { data, error } = await supabase.storage.from("lotes-remates").createSignedUrls(paths, 3600);
  if (error || !data || data.some((item) => item.error || !item.signedUrl)) throw new Error("No se pudieron firmar las imágenes.");
  return { ...remate, destacados: remate.destacados.map((lot, index) => ({ ...lot, imagen: { ...lot.imagen, url: data[index]?.signedUrl ?? "" } })) };
}
