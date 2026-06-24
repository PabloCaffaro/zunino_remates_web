import type { ContactInfo, SiteCopy } from "../types/site";

type LocationSectionProps = {
  contact: ContactInfo;
  copy: SiteCopy;
};

export function LocationSection({ contact, copy }: LocationSectionProps) {
  return (
    <section className="section location-section">
      <div className="container location-grid">
        <div className="location-copy reveal">
          <p className="eyebrow">Ubicación</p>
          <h2>{copy.ubicacionTitle}</h2>
          <p>{copy.ubicacionDescription}</p>
          <div className="location-card">
            <p>
              <strong>Dirección:</strong> {contact.direccion}
            </p>
            <p>
              <strong>Horario de atención:</strong> {contact.horario}
            </p>
            <a
              className="text-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.direccion)}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver ubicación en Google Maps
            </a>
          </div>
        </div>
        <div className="location-map reveal">
          <iframe
            title="Mapa de ubicación de Zunino Remates"
            src={contact.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
