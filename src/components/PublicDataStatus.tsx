import { useSiteData } from "../context/siteDataContextValue";
import { SectionHeading } from "./ui/SectionHeading";

export function PublicDataStatus() {
  const { publicDataStatus, retryPublicData } = useSiteData();
  const failed = publicDataStatus === "error";

  return (
    <main id="contenido-principal" className="section public-page public-status-page">
      <div className="container detail-shell status-shell surface-card" role={failed ? "alert" : "status"}>
        <SectionHeading
          eyebrow={failed ? "Conexión interrumpida" : "Información actualizada"}
          title={failed ? "No pudimos cargar la información." : "Cargando…"}
          headingLevel="h1"
          description={failed ? "Revisá tu conexión e intentá nuevamente." : "Estamos consultando la información actualizada de los remates."}
          className="page-heading"
        />
        {failed ? <button type="button" className="btn" onClick={retryPublicData}>Reintentar</button> : null}
      </div>
    </main>
  );
}
