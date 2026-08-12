export type CarouselDirection = "left" | "right";

export type CarouselStep = {
  direction: CarouselDirection;
  trackIndices: number[];
  nextIndex: number;
};

export function getWrappedCarouselIndex(index: number, total: number) {
  // La navegación circular funciona igual al avanzar y al retroceder desde los extremos.
  if (total === 0) {
    return 0;
  }

  return (index + total) % total;
}

export function getVisibleLotIndices(startIndex: number, total: number, cardsPerView: number) {
  const visibleCount = Math.min(cardsPerView, total);

  return Array.from({ length: visibleCount }, (_, offset) =>
    getWrappedCarouselIndex(startIndex + offset, total)
  );
}

export function createCarouselStep(
  currentIndex: number,
  total: number,
  cardsPerView: number,
  direction: CarouselDirection
): CarouselStep {
  const visibleIndices = getVisibleLotIndices(currentIndex, total, cardsPerView);
  const visibleCount = visibleIndices.length;
  const nextIndex = getWrappedCarouselIndex(
    currentIndex + (direction === "right" ? 1 : -1),
    total
  );

  // La tarjeta adicional entra desde el lado hacia el que se mueve la pista.
  const trackIndices =
    direction === "right"
      ? [...visibleIndices, getWrappedCarouselIndex(currentIndex + visibleCount, total)]
      : [getWrappedCarouselIndex(currentIndex - 1, total), ...visibleIndices];

  return { direction, trackIndices, nextIndex };
}
