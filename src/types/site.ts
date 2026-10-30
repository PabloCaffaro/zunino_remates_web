export type ImageAsset = {
  url: string;
  alt: string;
};

export type HighlightedLot = {
  id: string;
  nombre: string;
  imagen: ImageAsset;
  storagePath?: string;
};


export type RemateEstadoAdmin =
  | "borrador"
  | "en_revision"
  | "publicado"
  | "oculto"
  | "finalizado"
  | "cancelado";

export type Remate = {
  id: string;
  slug: string;
  fechaHora: string | null;
  fechaPorConfirmar: boolean;
  titulo: string;
  subtitulo: string;
  lugar: string;
  ubicacionDetalle: string;
  detalle: string;
  descripcionLarga: string;
  destacados: HighlightedLot[];
  requisitos: string[];
  condiciones: string[];
};

export type AdminRemate = Remate & {
  estadoAdmin: RemateEstadoAdmin;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
};

export type Paso = {
  id: string;
  numero: string;
  titulo: string;
  detalle: string;
};

export type FaqItem = {
  id: string;
  pregunta: string;
  respuesta: string;
};

export type ContactInfo = {
  email: string;
  telefono: string;
  direccion: string;
  horario: string;
  mapEmbedUrl: string;
};

export type SiteContent = {
  remates: Remate[];
  pasos: Paso[];
  faqs: FaqItem[];
  contacto: ContactInfo;
};

export type SiteCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  empresaTitle: string;
  empresaParagraph1: string;
  empresaParagraph2: string;
  ubicacionTitle: string;
  ubicacionDescription: string;
};

export type EditableSiteContent = {
  contacto: ContactInfo;
  pasos: Paso[];
  faqs: FaqItem[];
  copy: SiteCopy;
};

export type FormFields = {
  name: string;
  email: string;
  message: string;
};
