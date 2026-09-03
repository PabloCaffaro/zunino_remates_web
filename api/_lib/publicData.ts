import { createServerSupabaseClient } from "./supabase.js";

type PublicContent = {
  contacto: {
    email: string;
    telefono: string;
    direccion: string;
    horario: string;
    mapEmbedUrl: string;
  };
  pasos: Array<{ id: string; numero: string; titulo: string; detalle: string }>;
  faqs: Array<{ id: string; pregunta: string; respuesta: string }>;
  copy: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    empresaTitle: string;
    empresaParagraph1: string;
    empresaParagraph2: string;
    ubicacionTitle: string;
    ubicacionDescription: string;
  };
};

type PublicRemate = {
  id: string;
  slug: string;
  fechaHora: string | null;
  fechaPorConfirmar: boolean;
  titulo: string;
  subtitulo: string;
  lugar: string;
  ubicacionDetalle: string;
  detalle: string;
  enlace: string;
  catalogoEstado: string;
  catalogoPublicacionEstado: "disponible" | "proximamente" | "preliminar";
  descripcionLarga: string;
  destacados: never[];
  requisitos: string[];
  condiciones: string[];
};

const requireData = <Data>(data: Data | null, error: unknown): Data => {
  if (error || data === null) {
    throw new Error("No se pudieron consultar los datos públicos.");
  }

  return data;
};

export const getPublicContent = async (): Promise<PublicContent> => {
  const supabase = createServerSupabaseClient();
  const [configurationResult, faqResult, stepsResult] = await Promise.all([
    supabase
      .from("configuracion_sitio")
      .select(
        "hero_eyebrow, hero_titulo, hero_descripcion, empresa_titulo, empresa_parrafo_1, empresa_parrafo_2, ubicacion_titulo, ubicacion_descripcion, email_publico, telefono_publico, direccion, horario, map_embed_url",
      )
      .eq("id", "principal")
      .single(),
    supabase
      .from("preguntas_frecuentes")
      .select("id, pregunta, respuesta, orden")
      .eq("visible", true)
      .order("orden", { ascending: true }),
    supabase
      .from("pasos_participacion")
      .select("id, numero, titulo, detalle, orden")
      .eq("visible", true)
      .order("orden", { ascending: true }),
  ]);

  const configuration = requireData(
    configurationResult.data,
    configurationResult.error,
  );
  const faqs = requireData(faqResult.data, faqResult.error);
  const pasos = requireData(stepsResult.data, stepsResult.error);

  return {
    contacto: {
      email: configuration.email_publico,
      telefono: configuration.telefono_publico,
      direccion: configuration.direccion,
      horario: configuration.horario,
      mapEmbedUrl: configuration.map_embed_url,
    },
    pasos: pasos.map(({ id, numero, titulo, detalle }) => ({
      id,
      numero,
      titulo,
      detalle,
    })),
    faqs: faqs.map(({ id, pregunta, respuesta }) => ({
      id,
      pregunta,
      respuesta,
    })),
    copy: {
      heroEyebrow: configuration.hero_eyebrow,
      heroTitle: configuration.hero_titulo,
      heroDescription: configuration.hero_descripcion,
      empresaTitle: configuration.empresa_titulo,
      empresaParagraph1: configuration.empresa_parrafo_1,
      empresaParagraph2: configuration.empresa_parrafo_2,
      ubicacionTitle: configuration.ubicacion_titulo,
      ubicacionDescription: configuration.ubicacion_descripcion,
    },
  };
};

export const getPublishedRemates = async (): Promise<PublicRemate[]> => {
  const supabase = createServerSupabaseClient();
  const [rematesResult, requirementsResult, conditionsResult] = await Promise.all([
    supabase
      .from("remates")
      .select(
        "id, slug, titulo, subtitulo, fecha_hora, fecha_por_confirmar, lugar, ubicacion_detalle, detalle, descripcion_larga, catalogo_descripcion, catalogo_estado, destacado, orden",
      )
      .eq("estado", "publicado")
      .order("destacado", { ascending: false })
      .order("orden", { ascending: true }),
    supabase
      .from("remate_requisitos")
      .select("remate_id, contenido, orden")
      .order("orden", { ascending: true }),
    supabase
      .from("remate_condiciones")
      .select("remate_id, contenido, orden")
      .order("orden", { ascending: true }),
  ]);

  const remates = requireData(rematesResult.data, rematesResult.error);
  const requirements = requireData(
    requirementsResult.data,
    requirementsResult.error,
  );
  const conditions = requireData(conditionsResult.data, conditionsResult.error);

  return remates.map((remate) => ({
    id: remate.id,
    slug: remate.slug,
    fechaHora: remate.fecha_hora,
    fechaPorConfirmar: remate.fecha_por_confirmar,
    titulo: remate.titulo,
    subtitulo: remate.subtitulo,
    lugar: remate.lugar,
    ubicacionDetalle: remate.ubicacion_detalle,
    detalle: remate.detalle,
    enlace:
      remate.catalogo_estado === "disponible"
        ? "Catálogo disponible"
        : "Catálogo próximamente",
    catalogoEstado: remate.catalogo_descripcion,
    catalogoPublicacionEstado: remate.catalogo_estado,
    descripcionLarga: remate.descripcion_larga,
    // Las imágenes se conectarán cuando se implemente el bloque de Storage.
    destacados: [],
    requisitos: requirements
      .filter((item) => item.remate_id === remate.id)
      .map((item) => item.contenido),
    condiciones: conditions
      .filter((item) => item.remate_id === remate.id)
      .map((item) => item.contenido),
  }));
};
