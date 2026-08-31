import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function NotFoundPage() {
  return (
    <main id="contenido-principal" className="section not-found-page">
      <Seo
        title="Página no encontrada | Zunino Remates"
        description="La página solicitada no existe. Volvé al inicio para consultar los próximos remates."
      />
      <div className="container">
        <div className="detail-shell not-found-shell">
          <p className="eyebrow">Error 404</p>
          <h1>Esta página no existe.</h1>
          <p className="not-found-copy">
            Es posible que la dirección esté mal escrita o que el contenido ya no esté disponible.
            Podés volver al inicio o consultar los próximos remates.
          </p>
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
