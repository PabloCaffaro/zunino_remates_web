import { ApiError } from "./adminHttp.js";

const text = (value: unknown, field: string, max = 10_000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ApiError(400, `Revisá el campo ${field}.`);
  }
  return value.trim();
};

export function validateContent(body: Record<string, unknown>) {
  const input = body.content;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Falta el contenido.");
  const content = input as Record<string, unknown>;
  const contacto = content.contacto as Record<string, unknown> | undefined;
  const copy = content.copy as Record<string, unknown> | undefined;
  if (!contacto || !copy) throw new ApiError(400, "El contenido está incompleto.");
  const email = text(contacto.email, "email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Ingresá un email público válido.");
  const mapEmbedUrl = text(contacto.mapEmbedUrl, "mapa", 2_000);
  let mapUrl: URL;
  try { mapUrl = new URL(mapEmbedUrl); } catch { throw new ApiError(400, "Ingresá una URL válida para el mapa."); }
  if (mapUrl.protocol !== "https:" || !["google.com", "www.google.com", "maps.google.com"].includes(mapUrl.hostname)) {
    throw new ApiError(400, "La URL del mapa debe ser HTTPS y pertenecer a Google Maps.");
  }
  if (!Array.isArray(content.faqs) || content.faqs.length > 100) throw new ApiError(400, "Las preguntas frecuentes no son válidas.");
  const faqs = content.faqs.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ApiError(400, `Revisá la pregunta ${index + 1}.`);
    const faq = item as Record<string, unknown>;
    return { pregunta: text(faq.pregunta, `pregunta ${index + 1}`, 500), respuesta: text(faq.respuesta, `respuesta ${index + 1}`, 5_000) };
  });
  return {
    contacto: {
      email, telefono: text(contacto.telefono, "teléfono", 120),
      direccion: text(contacto.direccion, "dirección", 500), horario: text(contacto.horario, "horario", 500), mapEmbedUrl,
    },
    copy: {
      heroEyebrow: text(copy.heroEyebrow, "texto superior", 500), heroTitle: text(copy.heroTitle, "título principal", 1_000),
      heroDescription: text(copy.heroDescription, "descripción principal", 5_000), empresaTitle: text(copy.empresaTitle, "título de empresa", 1_000),
      empresaParagraph1: text(copy.empresaParagraph1, "primer texto de empresa", 10_000), empresaParagraph2: text(copy.empresaParagraph2, "segundo texto de empresa", 10_000),
      ubicacionTitle: text(copy.ubicacionTitle, "título de ubicación", 1_000), ubicacionDescription: text(copy.ubicacionDescription, "descripción de ubicación", 5_000),
    },
    faqs,
  };
}
