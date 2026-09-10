import type { FaqItem } from "../../types/site";
import { SectionHeading } from "../ui/SectionHeading";

type FaqSectionProps = {
  faqs: FaqItem[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  return (
    <section id="faq" className="section">
      <div className="container">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Todo lo que necesitás saber" />
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details key={faq.id} className="faq-detail reveal" open={index === 0}>
              <summary id={`faq-trigger-${index}`} className="faq-item">
                <span>{faq.pregunta}</span>
                <span className="faq-icon">+</span>
              </summary>
              <div
                id={`faq-panel-${index}`}
                className="faq-content faq-content-open"
                role="region"
                aria-labelledby={`faq-trigger-${index}`}
              >
                <p>{faq.respuesta}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
