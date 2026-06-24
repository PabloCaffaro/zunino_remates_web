import { useEffect, useMemo, useState, type ReactNode } from "react";
import { siteContent } from "../data/siteContent";
import { defaultSiteCopy } from "../data/siteCopy";
import { SiteDataContext, type SiteDataContextValue } from "./siteDataContextValue";
import type {
  AdminRemate,
  EditableSiteContent,
  RemateEstadoAdmin,
} from "../types/site";

const STORAGE_KEY = "zunino-remates-admin-data-v1";

type StoredSiteData = {
  remates: AdminRemate[];
  content: EditableSiteContent;
};

function createPendingRemate(): AdminRemate {
  const now = new Date().toISOString();

  return {
    id: "precarga-remate-especial",
    slug: "remate-especial-activos-varios",
    fecha: "",
    fechaCompleta: "",
    titulo: "Remate especial de activos varios",
    subtitulo: "Carga inicial pendiente de verificación",
    lugar: "",
    ubicacionDetalle: "",
    detalle: "Pre-carga recibida. Falta verificar fecha, lugar, condiciones y catálogo.",
    enlace: "Catálogo pendiente",
    catalogoEstado: "El catálogo todavía no fue cargado.",
    descripcionLarga: "",
    destacados: [],
    requisitos: [],
    condiciones: [],
    catalogoPdf: {
      url: "",
      fileName: "",
      label: "Descargar catálogo PDF",
    },
    estadoAdmin: "en_revision",
    catalogoPublicacionEstado: "proximamente",
    creadoEn: now,
    actualizadoEn: now,
  };
}

function createInitialData(): StoredSiteData {
  const now = new Date().toISOString();
  const adminRemates = siteContent.remates.map<AdminRemate>((remate) => {
    const catalogo = siteContent.catalogos.find((item) => item.remateId === remate.id);

    return {
      ...remate,
      estadoAdmin: "publicado",
      catalogoPublicacionEstado: catalogo?.estado ?? "disponible",
      creadoEn: now,
      actualizadoEn: now,
    };
  });

  return {
    remates: [...adminRemates, createPendingRemate()],
    content: {
      contacto: siteContent.contacto,
      pasos: siteContent.pasos,
      faqs: siteContent.faqs,
      copy: defaultSiteCopy,
    },
  };
}

function readStoredData(): StoredSiteData {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return createInitialData();
    }

    const parsed = JSON.parse(storedValue) as Partial<StoredSiteData>;
    if (!Array.isArray(parsed.remates) || !parsed.content) {
      return createInitialData();
    }

    return parsed as StoredSiteData;
  } catch {
    return createInitialData();
  }
}

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredSiteData>(readStoredData);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const value = useMemo<SiteDataContextValue>(() => {
    const saveRemate = (remate: AdminRemate) => {
      setData((current) => {
        const exists = current.remates.some((item) => item.id === remate.id);
        const nextRemates = exists
          ? current.remates.map((item) => (item.id === remate.id ? remate : item))
          : [...current.remates, remate];

        return { ...current, remates: nextRemates };
      });
    };

    const deleteRemate = (id: string) => {
      setData((current) => ({
        ...current,
        remates: current.remates.filter((item) => item.id !== id),
      }));
    };

    const changeRemateStatus = (id: string, status: RemateEstadoAdmin) => {
      setData((current) => ({
        ...current,
        remates: current.remates.map((item) =>
          item.id === id
            ? { ...item, estadoAdmin: status, actualizadoEn: new Date().toISOString() }
            : item
        ),
      }));
    };

    const saveContent = (content: EditableSiteContent) => {
      setData((current) => ({ ...current, content }));
    };

    const resetDemoData = () => setData(createInitialData());

    return {
      ...data,
      publishedRemates: data.remates.filter((item) => item.estadoAdmin === "publicado"),
      saveRemate,
      deleteRemate,
      changeRemateStatus,
      saveContent,
      resetDemoData,
    };
  }, [data]);

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}
