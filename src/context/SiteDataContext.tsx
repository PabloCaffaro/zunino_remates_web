import { useCallback, useEffect, useState, type ReactNode } from "react";
import { fetchPublicSiteData } from "../data/publicSiteApi";
import { SiteDataContext } from "./siteDataContextValue";
import type { EditableSiteContent, Remate } from "../types/site";

const emptyContent: EditableSiteContent = {
  contacto: { email: "", telefono: "", direccion: "", horario: "", mapEmbedUrl: "", formRecipientEmail: "" },
  pasos: [], faqs: [],
  copy: { heroEyebrow: "", heroTitle: "", heroDescription: "", empresaTitle: "", empresaParagraph1: "", empresaParagraph2: "", ubicacionTitle: "", ubicacionDescription: "" },
};
const adminRequired = async () => ({ status: "error" as const, message: "Ingresá al administrador para modificar datos." });

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [publicData, setPublicData] = useState<{ remates: Remate[]; content: EditableSiteContent | null; status: "loading" | "ready" | "error" }>({ remates: [], content: null, status: "loading" });
  const [requestNumber, setRequestNumber] = useState(0);
  const retryPublicData = useCallback(() => {
    setPublicData({ remates: [], content: null, status: "loading" });
    setRequestNumber((current) => current + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setPublicData({ remates: [], content: null, status: "error" });
    }, 15000);
    fetchPublicSiteData(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPublicData({ ...data, status: "ready" }); })
      .catch(() => { if (!controller.signal.aborted) setPublicData({ remates: [], content: null, status: "error" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [requestNumber]);
  return <SiteDataContext.Provider value={{
    remates: [], publishedRemates: [], content: publicData.content ?? emptyContent,
    publicContent: publicData.content, publicRemates: publicData.remates, publicDataStatus: publicData.status,
    retryPublicData, saveRemate: adminRequired, deleteRemate: adminRequired,
    changeRemateStatus: adminRequired, saveContent: adminRequired, resetDemoData: adminRequired,
  }}>{children}</SiteDataContext.Provider>;
}
