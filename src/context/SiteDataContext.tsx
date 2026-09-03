import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { canRegenerateRemateSlug, canTransitionRemateStatus } from "../admin/remateWorkflow";
import { remateDateTimeInputToIso } from "../data/remateFormatting";
import { siteContent } from "../data/siteContent";
import { defaultSiteCopy } from "../data/siteCopy";
import { fetchPublicSiteData } from "../data/publicSiteApi";
import { SiteDataContext, type SiteDataContextValue } from "./siteDataContextValue";
import type {
  AdminRemate,
  EditableSiteContent,
  Remate,
  RemateEstadoAdmin,
} from "../types/site";

const STORAGE_KEY = "zunino-remates-admin-data-v3";
const LEGACY_STORAGE_KEY = "zunino-remates-admin-data-v2";

type StoredSiteData = {
  remates: AdminRemate[];
  content: EditableSiteContent;
};

type PublicSiteDataState = {
  remates: Remate[];
  content: EditableSiteContent;
  status: "loading" | "ready" | "fallback";
};

type LegacyAdminRemate = Omit<AdminRemate, "fechaHora" | "version"> & {
  fechaHora?: string | null;
  fechaCompleta?: string;
  version?: number;
};

function createPendingRemate(): AdminRemate {
  const now = new Date().toISOString();

  return {
    id: "precarga-remate-especial",
    slug: "remate-especial-activos-varios",
    fechaHora: null,
    fechaPorConfirmar: true,
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
    estadoAdmin: "en_revision",
    catalogoPublicacionEstado: "proximamente",
    version: 1,
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
      version: 1,
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

function normalizeStoredRemate(remate: LegacyAdminRemate): AdminRemate {
  const { fechaCompleta, ...current } = remate;
  const legacyDate = fechaCompleta ? remateDateTimeInputToIso(fechaCompleta) : null;

  return {
    ...current,
    fechaHora: current.fechaHora ?? legacyDate,
    version:
      typeof current.version === "number" && current.version > 0 ? current.version : 1,
  } as AdminRemate;
}

function readStoredData(): StoredSiteData {
  try {
    const storedValue =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!storedValue) return createInitialData();

    const parsed = JSON.parse(storedValue) as Partial<StoredSiteData> & {
      remates?: LegacyAdminRemate[];
    };
    if (!Array.isArray(parsed.remates) || !parsed.content) return createInitialData();

    return {
      remates: parsed.remates.map(normalizeStoredRemate),
      content: parsed.content,
    };
  } catch {
    return createInitialData();
  }
}

function storageErrorMessage() {
  return "No se pudieron guardar los cambios en este navegador. Revisá el espacio disponible e intentá nuevamente.";
}

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredSiteData>(readStoredData);
  const dataRef = useRef(data);
  const [publicData, setPublicData] = useState<PublicSiteDataState>(() => ({
    remates: data.remates.filter((item) => item.estadoAdmin === "publicado"),
    content: data.content,
    status: import.meta.env.MODE === "test" ? "fallback" : "loading",
  }));

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      return;
    }

    const controller = new AbortController();

    fetchPublicSiteData(controller.signal)
      .then((remoteData) => {
        setPublicData({ ...remoteData, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPublicData((current) => ({ ...current, status: "fallback" }));
        }
      });

    return () => controller.abort();
  }, []);

  const effectivePublicData = useMemo<PublicSiteDataState>(
    () =>
      publicData.status === "ready"
        ? publicData
        : {
            remates: data.remates.filter((item) => item.estadoAdmin === "publicado"),
            content: data.content,
            status: publicData.status,
          },
    [data, publicData],
  );

  const value = useMemo<SiteDataContextValue>(() => {
    const commitData = (nextData: StoredSiteData) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
        dataRef.current = nextData;
        setData(nextData);
        return { status: "saved" as const };
      } catch {
        return { status: "error" as const, message: storageErrorMessage() };
      }
    };

    const saveRemate = async (remate: AdminRemate) => {
      const current = dataRef.current;
      const existing = current.remates.find((item) => item.id === remate.id);

      if (existing && existing.version !== remate.version) {
        return { status: "conflict" as const, current: existing };
      }

      if (existing && !canTransitionRemateStatus(existing.estadoAdmin, remate.estadoAdmin)) {
        return {
          status: "invalid_transition" as const,
          current: existing,
          message: "El cambio de estado solicitado no está permitido.",
        };
      }

      const now = new Date().toISOString();
      const savedRemate: AdminRemate = {
        ...remate,
        slug:
          existing && !canRegenerateRemateSlug(existing.estadoAdmin)
            ? existing.slug
            : remate.slug,
        version: existing ? existing.version + 1 : 1,
        creadoEn: existing?.creadoEn ?? remate.creadoEn,
        actualizadoEn: now,
      };
      const nextRemates = existing
        ? current.remates.map((item) => (item.id === savedRemate.id ? savedRemate : item))
        : [...current.remates, savedRemate];
      const commitResult = commitData({ ...current, remates: nextRemates });

      return commitResult.status === "saved"
        ? { status: "saved" as const, remate: savedRemate }
        : commitResult;
    };

    const deleteRemate = async (id: string, expectedVersion: number) => {
      const current = dataRef.current;
      const existing = current.remates.find((item) => item.id === id);
      if (!existing || existing.version !== expectedVersion) {
        return {
          status: "error" as const,
          message: "El remate cambió antes de eliminarse. Actualizá el listado e intentá nuevamente.",
        };
      }

      return commitData({
        ...current,
        remates: current.remates.filter((item) => item.id !== id),
      });
    };

    const changeRemateStatus = async (
      id: string,
      expectedVersion: number,
      status: RemateEstadoAdmin
    ) => {
      const existing = dataRef.current.remates.find((item) => item.id === id);
      if (!existing || existing.version !== expectedVersion) {
        return existing
          ? { status: "conflict" as const, current: existing }
          : { status: "error" as const, message: "No se encontró el remate solicitado." };
      }

      return saveRemate({ ...existing, estadoAdmin: status });
    };

    const saveContent = async (content: EditableSiteContent) =>
      commitData({ ...dataRef.current, content });

    const resetDemoData = async () => commitData(createInitialData());

    return {
      ...data,
      publishedRemates: data.remates.filter((item) => item.estadoAdmin === "publicado"),
      publicContent: effectivePublicData.content,
      publicRemates: effectivePublicData.remates,
      publicDataStatus: effectivePublicData.status,
      saveRemate,
      deleteRemate,
      changeRemateStatus,
      saveContent,
      resetDemoData,
    };
  }, [data, effectivePublicData]);

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}
