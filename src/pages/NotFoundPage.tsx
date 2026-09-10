import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { SectionHeading } from "../components/ui/SectionHeading";

export function NotFoundPage() {
  return (
    <main id="contenido-principal" className="section public-page not-found-page">
      <Seo
        title="Página no encontrada | Zunino Remates"
        description="La página solicitada no existe. Volvé al inicio para consultar los próximos remates."
      />
      <div className="container">
        <div className="detail-shell not-found-shell surface-card">
          <SectionHeading
            eyebrow="Error 404"
            title="Esta página no existe."
            headingLevel="h1"
            description="Es posible que la dirección esté mal escrita o que el contenido ya no esté disponible. Podés volver al inicio o consultar los próximos remates."
            className="page-heading"
          />
          <div className="not-found-actions">
            <Link className="btn" to="/">
              Volver al inicio
            </Link>
            <Link className="btn btn-outline" to="/#proximos">
              Ver próximos remates
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
