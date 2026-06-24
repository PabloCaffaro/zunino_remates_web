import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../components/Seo";
import { useSiteData } from "../context/siteDataContextValue";
import {
  createCatalogosFromRemates,
  getCatalogoByRemateId,
  getRemateBySlug,
} from "../data/siteSelectors";

const CAROUSEL_ANIMATION_MS = 420;

type CarouselDirection = "left" | "right";

type CarouselAnimation = {
  direction: CarouselDirection;
  trackIndices: number[];
  nextIndex: number;
};

function getWrappedIndex(index: number, total: number) {
  // La navegación circular mantiene el carrusel funcionando en ambos extremos sin casos especiales.
  if (total === 0) {
    return 0;
  }

  return (index + total) % total;
}

function getCardsPerView(width: number) {
  // El carrusel cambia cuántas tarjetas muestra según el ancho de pantalla.
  if (width <= 640) {
    return 1;
  }

  if (width <= 980) {
    return 2;
  }

  return 3;
}

function getSlideDistance(cardsPerView: number) {
  // Un paso del movimiento equivale a una tarjeta visible más el espacio entre tarjetas.
  return `calc(((100% - (${cardsPerView} - 1) * var(--carousel-gap)) / ${cardsPerView}) + var(--carousel-gap))`;
}

export function RemateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { publishedRemates } = useSiteData();
  const catalogos = createCatalogosFromRemates(publishedRemates);
  const remate = getRemateBySlug(publishedRemates, slug);
  const catalogo = remate ? getCatalogoByRemateId(catalogos, remate.id) : undefined;
  const [currentLotIndex, setCurrentLotIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(() => getCardsPerView(window.innerWidth));
  const [selectedLotIndex, setSelectedLotIndex] = useState<number | null>(null);
  // Mientras el carrusel se mueve, mantenemos una pista temporal separada del estado ya asentado.
  const [carouselAnimation, setCarouselAnimation] = useState<CarouselAnimation | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const totalLots = remate?.destacados.length ?? 0;

  useEffect(() => {
    // Reinicia el estado del carrusel y del lightbox cuando la persona abre otra página de detalle.
    setCurrentLotIndex(0);
    setSelectedLotIndex(null);
    setCarouselAnimation(null);
  }, [slug]);

  useEffect(() => {
    const handleResize = () => {
      setCardsPerView(getCardsPerView(window.innerWidth));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedLotIndex === null) {
      return;
    }

    // El lightbox soporta navegación por teclado de forma independiente al carrusel embebido.
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedLotIndex(null);
      }

      if (event.key === "ArrowRight") {
        setSelectedLotIndex((current) => getWrappedIndex((current ?? 0) + 1, totalLots));
      }

      if (event.key === "ArrowLeft") {
        setSelectedLotIndex((current) => getWrappedIndex((current ?? 0) - 1, totalLots));
      }
    };

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedLotIndex, totalLots]);

  const visibleIndices = useMemo(() => {
    if (!remate || totalLots === 0) {
      return [];
    }

    // Estas son las tarjetas que deberían verse una vez que el carrusel termina de asentarse.
    return Array.from({ length: Math.min(cardsPerView, totalLots) }, (_, offset) =>
      getWrappedIndex(currentLotIndex + offset, totalLots)
    );
  }, [cardsPerView, currentLotIndex, remate, totalLots]);

  // Durante la animación renderizamos una pista temporal; si no, mostramos la ventana visible ya asentada.
  const displayedIndices = carouselAnimation ? carouselAnimation.trackIndices : visibleIndices;

  const displayedLots = displayedIndices
    .map((index) => remate?.destacados[index])
    .filter((lote): lote is NonNullable<typeof lote> => Boolean(lote));

  const activeLot = selectedLotIndex !== null && remate ? remate.destacados[selectedLotIndex] : null;

  useLayoutEffect(() => {
    if (!carouselAnimation || !trackRef.current) {
      return;
    }

    // Primero se posiciona la pista sin transición y recién en el siguiente frame se anima.
    const track = trackRef.current;
    const slideDistance = getSlideDistance(cardsPerView);

    track.style.transition = "none";
    track.style.transform =
      carouselAnimation.direction === "left" ? `translateX(calc(-1 * ${slideDistance}))` : "translateX(0)";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!trackRef.current) {
          return;
        }

        trackRef.current.style.transition = `transform ${CAROUSEL_ANIMATION_MS}ms linear`;
        trackRef.current.style.transform =
          carouselAnimation.direction === "left" ? "translateX(0)" : `translateX(calc(-1 * ${slideDistance}))`;
      });
    });

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") {
        return;
      }

      if (!trackRef.current) {
        return;
      }

      trackRef.current.style.transition = "none";
      trackRef.current.style.transform = "translateX(0)";
      // Recién cuando termina el movimiento se confirma el nuevo índice inicial.
      setCurrentLotIndex(carouselAnimation.nextIndex);
      setCarouselAnimation(null);
    };

    track.addEventListener("transitionend", handleTransitionEnd, { once: true });

    return () => {
      track.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [cardsPerView, carouselAnimation]);

  const moveCarousel = (direction: CarouselDirection) => {
    if (!remate || totalLots === 0 || carouselAnimation) {
      return;
    }

    // Arma una pista temporal con una tarjeta extra para que el movimiento ocurra como un deslizamiento real.
    const nextIndex =
      direction === "right"
        ? getWrappedIndex(currentLotIndex + 1, totalLots)
        : getWrappedIndex(currentLotIndex - 1, totalLots);

    const trackIndices =
      direction === "right"
        ? [
            ...visibleIndices,
            getWrappedIndex(currentLotIndex + Math.min(cardsPerView, totalLots), totalLots),
          ]
        : [getWrappedIndex(currentLotIndex - 1, totalLots), ...visibleIndices];

    setCarouselAnimation({ direction, trackIndices, nextIndex });
  };

  const goToPreviousLot = () => moveCarousel("left");
  const goToNextLot = () => moveCarousel("right");

  if (!remate) {
    return (
      <main id="contenido-principal" className="section">
        <div className="container">
          <div className="detail-shell">
            <p className="eyebrow">Remate no encontrado</p>
            <h1>No encontramos ese evento.</h1>
            <p>
              Es posible que la URL este mal o que el remate ya no este publicado. Desde la agenda podes
              volver a ver todos los proximos eventos.
            </p>
            <Link className="btn" to="/#proximos">
              Volver a proximos remates
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main id="contenido-principal">
        <Seo
          title={`${remate.titulo} | Zunino Remates`}
          description={`${remate.detalle} ${remate.catalogoEstado}`}
          path={`/remates/${remate.slug}`}
        />
        <section className="section detail-hero">
          <div className="container detail-shell">
            <Link className="btn btn-small detail-back-btn" to="/">
              Volver a todos los remates
            </Link>
            <p className="eyebrow">{remate.subtitulo}</p>
            <h1>{remate.titulo}</h1>
            <p className="detail-lead">{remate.descripcionLarga}</p>
            <div className="detail-meta-grid">
              <div className="detail-meta-card">
                <p className="card-tag">Fecha y hora</p>
                <p>{remate.fechaCompleta}</p>
              </div>
              <div className="detail-meta-card">
                <p className="card-tag">Ubicacion</p>
                <p>{remate.ubicacionDetalle}</p>
              </div>
              <div className="detail-meta-card">
                <p className="card-tag">Catalogo</p>
                <p>{remate.catalogoEstado}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container detail-grid">
            <article className="detail-card">
              <h2>Documentos del remate</h2>
              <p>
                Cada remate cuenta con su catalogo en PDF para que puedas revisar lotes, condiciones y
                notas del organizador antes de asistir.
              </p>
              {catalogo ? <p className="detail-doc-note">{catalogo.detalle}</p> : null}
              <div className="detail-docs">
                <a className="btn" href={remate.catalogoPdf.url} target="_blank" rel="noreferrer">
                  {remate.catalogoPdf.label}
                </a>
              </div>
            </article>
            <article className="detail-card">
              <h2>Requisitos para participar</h2>
              <ul className="detail-list">
                {remate.requisitos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="detail-card">
              <h2>Condiciones del remate</h2>
              <ul className="detail-list">
                {remate.condiciones.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-title reveal">
              <p className="eyebrow">Lotes destacados</p>
              <h2>Una mirada rapida a algunos lotes del remate</h2>
              <p>Usa las flechas para recorrer los lotes destacados sin cambiar su tamano de vista.</p>
            </div>

            {displayedLots.length > 0 ? (
              <div className="lot-carousel-strip reveal">
                <button type="button" className="lot-strip-arrow" onClick={goToPreviousLot} aria-label="Ver lotes anteriores">
                  &lsaquo;
                </button>

                <div
                  className="lot-strip-viewport"
                  style={{ ["--cards-per-view" as string]: String(Math.min(cardsPerView, totalLots)) }}
                >
                  <div ref={trackRef} className="lot-strip-track">
                    {displayedLots.map((lote, index) => (
                      <article key={`${displayedIndices[index]}-${lote.id}`} className="lot-highlight-card">
                        <button
                          type="button"
                          className="lot-highlight-button"
                          onClick={() => setSelectedLotIndex(displayedIndices[index])}
                          aria-label={`Ver ${lote.nombre} en grande`}
                        >
                          <img src={lote.imagen.url} alt={lote.imagen.alt} className="lot-highlight-image" />
                        </button>
                        <div className="lot-highlight-copy">
                          <p className="card-tag">Lote destacado</p>
                          <h3>{lote.nombre}</h3>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <button type="button" className="lot-strip-arrow" onClick={goToNextLot} aria-label="Ver lotes siguientes">
                  &rsaquo;
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="section alt">
          <div className="container detail-cta">
            <div>
              <p className="eyebrow">Siguiente paso</p>
              <h2>Queres recibir el catalogo o hacer una consulta puntual?</h2>
              <p>
                Escribinos y te enviamos la informacion completa de este remate junto con requisitos,
                condiciones y estado actualizado de la documentacion.
              </p>
            </div>
            <div className="card-actions">
              <a className="btn" href="/#contacto">
                Ir al formulario
              </a>
              <a className="btn btn-ghost" href="/#proximos">
                Ver otros remates
              </a>
            </div>
          </div>
        </section>
      </main>

      {activeLot ? (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={activeLot.nombre}
          onClick={() => setSelectedLotIndex(null)}
        >
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setSelectedLotIndex(null)}
              aria-label="Cerrar imagen ampliada"
            >
              ×
            </button>
            <button
              type="button"
              className="lightbox-nav lightbox-nav-left"
              onClick={() => setSelectedLotIndex((current) => getWrappedIndex((current ?? 0) - 1, totalLots))}
              aria-label="Ver imagen anterior"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              className="lightbox-nav lightbox-nav-right"
              onClick={() => setSelectedLotIndex((current) => getWrappedIndex((current ?? 0) + 1, totalLots))}
              aria-label="Ver imagen siguiente"
            >
              &rsaquo;
            </button>
            <img className="lightbox-image" src={activeLot.imagen.url} alt={activeLot.imagen.alt} />
            <div className="lightbox-copy">
              <p className="card-tag">Lote destacado</p>
              <h3>{activeLot.nombre}</h3>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
