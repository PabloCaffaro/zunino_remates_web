import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          className="logo"
          to="/"
          onClick={() => {
            closeMenu();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="logo-mark">ZR</span>
          <div>
            <p className="logo-title">Zunino Remates</p>
            <p className="logo-subtitle">Remates en vivo</p>
          </div>
        </Link>
        <nav id="menu-principal" className={`nav ${menuOpen ? "open" : ""}`}>
          <a href="/#proximos" onClick={closeMenu}>
            Próximos remates
          </a>
          <a href="/#catalogos" onClick={closeMenu}>
            Catálogos
          </a>
          <a href="/#como" onClick={closeMenu}>
            Cómo participar
          </a>
          <a href="/#empresa" onClick={closeMenu}>
            La empresa
          </a>
          <a href="/#contacto" className="btn btn-small" onClick={closeMenu}>
            Contactar
          </a>
        </nav>
        <button
          className="menu-toggle"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Cerrar" : "Menú"}
        </button>
      </div>
    </header>
  );
}
