import type { SiteCopy } from "../../types/site";

export function AboutSection({ copy }: { copy: SiteCopy }) {
  return (
    <section id="empresa" className="section alt">
      <div className="container company-grid">
        <div className="company-copy reveal">
          <p className="eyebrow">La empresa</p>
          <h2>{copy.empresaTitle}</h2>
          <p>{copy.empresaParagraph1}</p>
          <p>{copy.empresaParagraph2}</p>
          <div className="company-highlights">
            <div>
              <h3>Equipo en sala</h3>
              <p>Asistencia durante todo el remate.</p>
            </div>
            <div>
              <h3>Inspecciones previas</h3>
              <p>Coordinamos visitas para ver los lotes.</p>
            </div>
            <div>
              <h3>Comunicación clara</h3>
              <p>Reglas y condiciones visibles.</p>
            </div>
          </div>
        </div>
        <div className="company-panel reveal">
          <div className="panel-box">
            <h3>Remates anteriores</h3>
            <p>
              Compartimos una selección de remates realizados para mostrar la variedad de jornadas que
              organizamos y el tipo de trabajo que desarrollamos en cada evento.
            </p>
            <ul className="list">
              <li>Maquinaria rural · Enero</li>
              <li>Stock vehículos · Febrero</li>
              <li>Herramientas de taller · Marzo</li>
            </ul>
            <p>
              Si querés conocer resultados o antecedentes de un rubro en particular, podemos enviarte
              más información.
            </p>
            <a className="text-link" href="#contacto">
              Solicitar resultados
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
