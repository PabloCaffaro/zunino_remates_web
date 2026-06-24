import type { FaqItem } from "../../types/site";

type FaqSectionProps = {
  faqs: FaqItem[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  return (
    <section id="faq" className="section">
      <div className="container">
        <div className="section-title reveal">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2>Todo lo que necesitás saber</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details key={faq.id} className="faq-detail reveal">
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
