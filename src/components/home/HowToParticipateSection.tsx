import type { Paso } from "../../types/site";

type HowToParticipateSectionProps = {
  pasos: Paso[];
};

export function HowToParticipateSection({ pasos }: HowToParticipateSectionProps) {
  return (
    <section id="como" className="section">
      <div className="container">
        <div className="section-title reveal">
          <p className="eyebrow">Paso a paso</p>
          <h2>Cómo participar en un remate</h2>
          <p>Proceso simple para que llegues preparado el día del evento.</p>
        </div>
        <div className="steps-grid">
          {pasos.map((paso) => (
            <div key={paso.id} className="step-card reveal">
              <span className="step-number">{paso.numero}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.detalle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
