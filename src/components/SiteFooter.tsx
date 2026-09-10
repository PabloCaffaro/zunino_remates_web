import { BrandLockup } from "./ui/BrandLockup";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-shell">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <BrandLockup inverse subtitle="Remates presenciales" />
            <p>Remates en vivo con información clara y acompañamiento profesional.</p>
          </div>
          <nav className="footer-links" aria-label="Navegación del pie">
            <a href="/#proximos">Próximos remates</a>
            <a href="/#catalogos">Catálogos</a>
            <a href="/#como">Cómo participar</a>
            <a href="/#contacto">Contacto</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Zunino Remates. Todos los derechos reservados.</p>
          <p>Procesos presenciales con respaldo profesional.</p>
        </div>
      </div>
    </footer>
  );
}
