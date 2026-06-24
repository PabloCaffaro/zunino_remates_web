import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ADMIN_PATH } from "./admin/adminConfig";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { RemateDetailPage } from "./pages/RemateDetailPage";

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    // Si la URL incluye un hash, hace scroll a esa sección cuando la ruta ya terminó de renderizar.
    if (location.hash) {
      const target = document.querySelector(location.hash);

      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      return;
    }

    // Las rutas sin hash vuelven arriba para que cada página arranque en una posición predecible.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.hash, location.pathname]);

  return null;
}

function RevealManager() {
  const location = useLocation();

  useEffect(() => {
    // Los elementos marcados como "reveal" se animan solo la primera vez que entran al viewport.
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries, current) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            current.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((item) => observer.observe(item));

    // Reconstruye el observer al cambiar de ruta porque el DOM renderizado cambia entre páginas.
    return () => observer.disconnect();
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname === ADMIN_PATH;

  return (
    <>
      <div className="ambient"></div>
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>
      <ScrollManager />
      <RevealManager />
      {!isAdminRoute ? <SiteHeader /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/remates/:slug" element={<RemateDetailPage />} />
        <Route path={ADMIN_PATH} element={<AdminPage />} />
      </Routes>
      {!isAdminRoute ? <SiteFooter /> : null}
    </>
  );
}

export default App;
