import { describe, expect, it } from "vitest";
import { createCarouselStep, getVisibleLotIndices } from "./lotCarousel";

describe("lógica del carrusel de lotes", () => {
  it("intercambia correctamente dos fotos al avanzar", () => {
    const step = createCarouselStep(0, 2, 2, "right");

    expect(step).toEqual({ direction: "right", trackIndices: [0, 1, 0], nextIndex: 1 });
    expect(getVisibleLotIndices(step.nextIndex, 2, 2)).toEqual([1, 0]);
  });

  it("intercambia correctamente dos fotos al retroceder", () => {
    const step = createCarouselStep(0, 2, 2, "left");

    expect(step).toEqual({ direction: "left", trackIndices: [1, 0, 1], nextIndex: 1 });
    expect(getVisibleLotIndices(step.nextIndex, 2, 2)).toEqual([1, 0]);
  });

  it("mantiene una ventana continua al recorrer cuatro fotos", () => {
    const nextStep = createCarouselStep(0, 4, 3, "right");
    const previousStep = createCarouselStep(0, 4, 3, "left");

    expect(nextStep.trackIndices).toEqual([0, 1, 2, 3]);
    expect(getVisibleLotIndices(nextStep.nextIndex, 4, 3)).toEqual([1, 2, 3]);
    expect(previousStep.trackIndices).toEqual([3, 0, 1, 2]);
    expect(getVisibleLotIndices(previousStep.nextIndex, 4, 3)).toEqual([3, 0, 1]);
  });
});
