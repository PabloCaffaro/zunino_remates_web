import { Link } from "react-router-dom";
import { formatRemateDateSummary } from "../../data/remateFormatting";
import type { Remate } from "../../types/site";

type UpcomingRematesSectionProps = {
  remates: Remate[];
};

export function UpcomingRematesSection({ remates }: UpcomingRematesSectionProps) {
  return (
    <section id="proximos" className="section">
      <div className="container">
        <div className="section-title reveal">
          <p className="eyebrow">Agenda abierta</p>
          <h2>Proximos remates en vivo</h2>
          <p>Elegi el evento y revisa el catalogo antes de venir.</p>
        </div>
        <div className="cards-grid">
          {remates.map((remate) => (
            <article key={remate.id} className="card reveal">
              <p className="card-date">
                {formatRemateDateSummary(remate.fechaCompleta, remate.fechaPorConfirmar)}
              </p>
              <h3>{remate.titulo}</h3>
              <p className="card-location">{remate.lugar}</p>
              <p>{remate.detalle}</p>
              <Link className="text-link" to={`/remates/${remate.slug}`}>
                Ver detalle del remate
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
