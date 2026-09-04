import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SiteDataContext, useSiteData, type RemateMutationResult } from "./siteDataContextValue";
import type { AdminRemate } from "../types/site";
import type { AdminApi } from "../data/adminApi";

export function AdminDataProvider({ api, onLogout, children }: { api: AdminApi; onLogout: () => Promise<void>; children: ReactNode }) {
  const publicData = useSiteData();
  const [remates, setRemates] = useState<AdminRemate[]>([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api.request<AdminRemate[]>("remates").then((data) => {
      if (active) { setRemates(data); setStatus("ready"); }
    }).catch((error: Error) => { if (active) { setError(error.message); setStatus("error"); } });
    return () => { active = false; };
  }, [api, attempt]);
  const mutate = useCallback(async (method: string, body: unknown): Promise<RemateMutationResult> => {
    try {
      const result = await api.request<RemateMutationResult>("remates", method, body);
      const updated = result.status === "saved" ? result.remate : result.status === "conflict" ? result.current : null;
      if (updated) setRemates((current) => current.some((r) => r.id === updated.id) ? current.map((r) => r.id === updated.id ? updated : r) : [updated, ...current]);
      if (result.status === "conflict" && !result.current) return { status: "error", message: "El remate ya no existe. No se guardaron tus cambios." };
      if (result.status === "saved") publicData.retryPublicData();
      return result;
    } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "No se pudo guardar." }; }
  }, [api, publicData]);

  if (status !== "ready") return <main id="contenido-principal" className="section"><div className="container detail-shell">
    <h1>{status === "error" ? "No pudimos cargar el administrador" : "Cargando administrador…"}</h1>
    {status === "error" ? <><p role="alert">{error}</p><div className="admin-actions"><button className="btn" onClick={() => { setStatus("loading"); setAttempt((n) => n + 1); }}>Reintentar</button><button className="btn btn-secondary" onClick={() => void onLogout()}>Cerrar sesión</button></div></> : null}
  </div></main>;
  return <SiteDataContext.Provider value={{
    ...publicData, remates, publishedRemates: remates.filter((r) => r.estadoAdmin === "publicado"),
    saveRemate: (remate) => mutate("POST", { remate }),
    changeRemateStatus: (id, version, status) => mutate("PATCH", { id, version, status }),
    deleteRemate: async (id, version) => {
      try {
        const result = await api.request<{ status: "saved" | "conflict" }>("remates", "DELETE", { id, version });
        if (result.status === "conflict") return { status: "error", message: "El remate cambió. Recargá el listado antes de eliminarlo." };
        setRemates((current) => current.filter((r) => r.id !== id));
        publicData.retryPublicData();
        return { status: "saved" };
      } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "No se pudo eliminar." }; }
    },
    saveContent: async () => ({ status: "error", message: "La edición de contenido general se conectará en la siguiente etapa." }),
  }}>{children}</SiteDataContext.Provider>;
}
