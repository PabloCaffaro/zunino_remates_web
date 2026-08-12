import { Link } from "react-router-dom";
import { formatRemateDateDisplay } from "../../data/remateFormatting";
import type { Remate, SiteCopy } from "../../types/site";

type HeroSectionProps = {
  rematePrincipal?: Remate;
  copy: SiteCopy;
};

export function HeroSection({ rematePrincipal, copy }: HeroSectionProps) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy reveal">
          <p className="eyebrow">{copy.heroEyebrow}</p>
          <h1>{copy.heroTitle}</h1>
          <p className="lead">{copy.heroDescription}</p>
          <div className="hero-actions">
            <a className="btn" href="#proximos">
              Ver próximos remates
            </a>
          </div>
          <div className="hero-highlights">
            <div>
              <p className="highlight-title">15+ años</p>
              <p>Experiencia en remates agro, vehículos y maquinaria.</p>
            </div>
            <div>
              <p className="highlight-title">Catálogos abiertos</p>
              <p>Detalles completos antes del evento.</p>
            </div>
            <div>
              <p className="highlight-title">Equipo en sala</p>
              <p>Acompañamiento en cada etapa.</p>
            </div>
          </div>
        </div>
        <div className="hero-panel reveal">
          {rematePrincipal ? (
            <div className="hero-card">
              <p className="card-tag">Próximo remate</p>
              <h2>{rematePrincipal.titulo}</h2>
              <p className="card-meta">
                {formatRemateDateDisplay(
                  rematePrincipal.fechaHora,
                  rematePrincipal.fechaPorConfirmar
                )}
              </p>
              <p>{rematePrincipal.detalle}</p>
              <p className="hero-note">
                Sin reserva previa. Participación presencial con registro en sala.
              </p>
              <div className="card-actions">
                <Link className="btn btn-small" to={`/remates/${rematePrincipal.slug}`}>
                  Ver detalle
                </Link>
              </div>
            </div>
          ) : (
            <div className="hero-card">
              <p className="card-tag">Agenda</p>
              <h2>Próximos remates en preparación</h2>
              <p>Estamos verificando nuevas fechas y catálogos para publicar.</p>
            </div>
          )}
          <div className="hero-card ghost">
            <p className="card-tag">Recordatorio</p>
            <p>Los remates son presenciales. Consultá requisitos de participación y formas de pago.</p>
            <a className="text-link" href="#como">
              Ver requisitos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
