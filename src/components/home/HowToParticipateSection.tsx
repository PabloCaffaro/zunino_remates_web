import type { Paso } from "../../types/site";
import { SectionHeading } from "../ui/SectionHeading";

type HowToParticipateSectionProps = {
  pasos: Paso[];
};

export function HowToParticipateSection({ pasos }: HowToParticipateSectionProps) {
  return (
    <section id="como" className="section">
      <div className="container">
        <SectionHeading eyebrow="Paso a paso" title="Cómo participar en un remate" description="Proceso simple para que llegues preparado el día del evento." />
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
