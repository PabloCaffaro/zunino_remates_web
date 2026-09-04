import { useEffect } from "react";
import { PublicDataStatus } from "../components/PublicDataStatus";
import { ContactSection } from "../components/ContactSection";
import { LocationSection } from "../components/LocationSection";
import { Seo } from "../components/Seo";
import { AboutSection } from "../components/home/AboutSection";
import { CatalogSection } from "../components/home/CatalogSection";
import { FaqSection } from "../components/home/FaqSection";
import { HeroSection } from "../components/home/HeroSection";
import { HowToParticipateSection } from "../components/home/HowToParticipateSection";
import { UpcomingRematesSection } from "../components/home/UpcomingRematesSection";
import { useSiteData } from "../context/siteDataContextValue";
import { createCatalogosFromRemates, getFeaturedRemate } from "../data/siteSelectors";

export function HomePage() {
  const { publicRemates: remates, publicContent: content, publicDataStatus } = useSiteData();
  const catalogos = createCatalogosFromRemates(remates);
  // El remate destacado se resuelve con un selector para que la home no dependa directamente del orden del array.
  const rematePrincipal = getFeaturedRemate(remates);

  useEffect(() => {
    // Las secciones de la home se animan al aparecer para darle más ritmo a la landing.
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
      { threshold: 0.2 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [publicDataStatus]);

  if (publicDataStatus !== "ready" || !content) return <PublicDataStatus />;
  const { pasos, faqs, contacto, copy } = content;

  return (
    <main id="contenido-principal">
      <Seo
        title="Zunino Remates | Remates en vivo y catálogos"
        description="Remates presenciales con catálogos claros, requisitos visibles y atención cercana para compradores y vendedores."
        path="/"
      />
      <HeroSection rematePrincipal={rematePrincipal} copy={copy} />
      <UpcomingRematesSection remates={remates} />
      <CatalogSection catalogos={catalogos} remates={remates} />
      <HowToParticipateSection pasos={pasos} />
      <AboutSection copy={copy} />
      <FaqSection faqs={faqs} />
      <ContactSection contact={contacto} />
      <LocationSection contact={contacto} copy={copy} />
    </main>
  );
}
