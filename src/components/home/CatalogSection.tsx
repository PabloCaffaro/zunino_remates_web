import { Link } from "react-router-dom";
import type { Catalogo, Remate } from "../../types/site";

type CatalogSectionProps = {
  catalogos: Catalogo[];
  remates: Remate[];
};

export function CatalogSection({ catalogos, remates }: CatalogSectionProps) {
  return (
    <section id="catalogos" className="section alt">
      <div className="container">
        <div className="section-title reveal">
          <p className="eyebrow">Documentación</p>
          <h2>Catálogos por remate</h2>
          <p>Publicamos listados claros con condiciones, ubicación y detalles de cada lote.</p>
        </div>
        <div className="catalog-grid">
          {catalogos.map((catalogo) => {
            const remate = remates.find((item) => item.id === catalogo.remateId);
            if (!remate) {
              return null;
            }

            return (
              <div key={catalogo.id} className="catalog-card reveal">
                <p className={`catalog-status catalog-status-${catalogo.estado}`}>{catalogo.estado}</p>
                <h3>{catalogo.titulo}</h3>
                <p>{catalogo.detalle}</p>
                <div className="card-actions">
                  <Link className="btn btn-outline btn-small" to={`/remates/${remate.slug}`}>
                    Ver detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
