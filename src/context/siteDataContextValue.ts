import { createContext, useContext } from "react";
import type {
  AdminRemate,
  EditableSiteContent,
  RemateEstadoAdmin,
} from "../types/site";

export type DataOperationResult =
  | { status: "saved" }
  | { status: "error"; message: string };

export type RemateMutationResult =
  | { status: "saved"; remate: AdminRemate }
  | { status: "conflict"; current: AdminRemate }
  | { status: "invalid_transition"; current: AdminRemate; message: string }
  | { status: "error"; message: string };

export type SiteDataContextValue = {
  remates: AdminRemate[];
  content: EditableSiteContent;
  publishedRemates: AdminRemate[];
  saveRemate: (remate: AdminRemate) => Promise<RemateMutationResult>;
  deleteRemate: (id: string, expectedVersion: number) => Promise<DataOperationResult>;
  changeRemateStatus: (
    id: string,
    expectedVersion: number,
    status: RemateEstadoAdmin
  ) => Promise<RemateMutationResult>;
  saveContent: (content: EditableSiteContent) => Promise<DataOperationResult>;
  resetDemoData: () => Promise<DataOperationResult>;
};

export const SiteDataContext = createContext<SiteDataContextValue | null>(null);

export function useSiteData() {
  const context = useContext(SiteDataContext);

  if (!context) {
    throw new Error("useSiteData debe utilizarse dentro de SiteDataProvider.");
  }

  return context;
}
