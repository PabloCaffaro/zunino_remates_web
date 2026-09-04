import { useSiteData } from "../context/siteDataContextValue";

export function PublicDataStatus() {
  const { publicDataStatus, retryPublicData } = useSiteData();
  const failed = publicDataStatus === "error";

  return (
    <main id="contenido-principal" className="section">
      <div className="container detail-shell" role={failed ? "alert" : "status"}>
        <h1>{failed ? "No pudimos cargar la información." : "Cargando…"}</h1>
        <p>{failed ? "Revisá tu conexión e intentá nuevamente." : "Estamos consultando la información actualizada de los remates."}</p>
        {failed ? <button type="button" className="btn" onClick={retryPublicData}>Reintentar</button> : null}
      </div>
    </main>
  );
}
