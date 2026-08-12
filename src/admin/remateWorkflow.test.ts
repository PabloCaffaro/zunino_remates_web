import { describe, expect, it } from "vitest";
import {
  canRegenerateRemateSlug,
  canTransitionRemateStatus,
  isPublicRemateStatus,
} from "./remateWorkflow";
import type { RemateEstadoAdmin } from "../types/site";

describe("flujo de estados de un remate", () => {
  it("aplica la matriz completa de transiciones permitidas", () => {
    const statuses: RemateEstadoAdmin[] = [
      "borrador",
      "en_revision",
      "publicado",
      "oculto",
      "finalizado",
      "cancelado",
    ];
    const expectedTransitions: Record<RemateEstadoAdmin, RemateEstadoAdmin[]> = {
      borrador: ["borrador", "en_revision"],
      en_revision: ["borrador", "en_revision", "publicado"],
      publicado: ["publicado", "oculto", "finalizado", "cancelado"],
      oculto: ["publicado", "oculto", "finalizado", "cancelado"],
      finalizado: ["finalizado"],
      cancelado: ["cancelado"],
    };

    statuses.forEach((currentStatus) => {
      statuses.forEach((nextStatus) => {
        expect(
          canTransitionRemateStatus(currentStatus, nextStatus),
          `${currentStatus} -> ${nextStatus}`
        ).toBe(expectedTransitions[currentStatus].includes(nextStatus));
      });
    });
  });

  it("solo regenera el slug antes de publicar", () => {
    expect(canRegenerateRemateSlug("borrador")).toBe(true);
    expect(canRegenerateRemateSlug("en_revision")).toBe(true);
    expect(canRegenerateRemateSlug("publicado")).toBe(false);
    expect(canRegenerateRemateSlug("oculto")).toBe(false);
    expect(canRegenerateRemateSlug("finalizado")).toBe(false);
    expect(canRegenerateRemateSlug("cancelado")).toBe(false);
    expect(isPublicRemateStatus("publicado")).toBe(true);
    expect(isPublicRemateStatus("oculto")).toBe(false);
  });
});
