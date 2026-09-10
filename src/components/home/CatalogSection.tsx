import { Link } from "react-router-dom";
import type { Catalogo, Remate } from "../../types/site";
import { SectionHeading } from "../ui/SectionHeading";

type CatalogSectionProps = {
  catalogos: Catalogo[];
  remates: Remate[];
};

export function CatalogSection({ catalogos, remates }: CatalogSectionProps) {
  return (
    <section id="catalogos" className="section alt">
      <div className="container">
        <SectionHeading eyebrow="Documentación" title="Catálogos por remate" description="Publicamos listados claros con condiciones, ubicación y detalles de cada lote." />
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
