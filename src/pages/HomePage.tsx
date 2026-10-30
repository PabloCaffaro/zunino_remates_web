import { PublicDataStatus } from "../components/PublicDataStatus";
import { ContactSection } from "../components/ContactSection";
import { Seo } from "../components/Seo";
import { AboutSection } from "../components/home/AboutSection";
import { FaqSection } from "../components/home/FaqSection";
import { HeroSection } from "../components/home/HeroSection";
import { HowToParticipateSection } from "../components/home/HowToParticipateSection";
import { UpcomingRematesSection } from "../components/home/UpcomingRematesSection";
import { useSiteData } from "../context/siteDataContextValue";
import { getFeaturedRemate } from "../data/siteSelectors";

export function HomePage() {
  const { publicRemates: remates, publicContent: content, publicDataStatus } = useSiteData();
  // El remate destacado se resuelve con un selector para que la home no dependa directamente del orden del array.
  const rematePrincipal = getFeaturedRemate(remates);

  if (publicDataStatus !== "ready" || !content) return <PublicDataStatus />;
  const { pasos, faqs, contacto, copy } = content;

  return (
    <main id="contenido-principal" className="home-page">
      <Seo
        title="Zunino Remates | Remates presenciales"
        description="Remates presenciales con lotes destacados, requisitos visibles y atención cercana para compradores y vendedores."
        path="/"
      />
      <HeroSection rematePrincipal={rematePrincipal} copy={copy} />
      <UpcomingRematesSection remates={remates} />
      <HowToParticipateSection pasos={pasos} />
      <AboutSection copy={copy} />
      <FaqSection faqs={faqs} />
      <ContactSection contact={contacto} copy={copy} />
    </main>
  );
}
