import { createContext, useContext } from "react";
import type {
  AdminRemate,
  EditableSiteContent,
  RemateEstadoAdmin,
} from "../types/site";

export type SiteDataContextValue = {
  remates: AdminRemate[];
  content: EditableSiteContent;
  publishedRemates: AdminRemate[];
  saveRemate: (remate: AdminRemate) => void;
  deleteRemate: (id: string) => void;
  changeRemateStatus: (id: string, status: RemateEstadoAdmin) => void;
  saveContent: (content: EditableSiteContent) => void;
  resetDemoData: () => void;
};

export const SiteDataContext = createContext<SiteDataContextValue | null>(null);

export function useSiteData() {
  const context = useContext(SiteDataContext);

  if (!context) {
    throw new Error("useSiteData debe utilizarse dentro de SiteDataProvider.");
  }

  return context;
}
