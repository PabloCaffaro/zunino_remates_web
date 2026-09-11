import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompleteRemate } from "../test/fixtures";
import { SiteDataProvider } from "../test/TestSiteDataProvider";
import {
  useSiteData,
  type DataOperationResult,
  type RemateMutationResult,
} from "./siteDataContextValue";

function wrapper({ children }: { children: ReactNode }) {
  return <SiteDataProvider>{children}</SiteDataProvider>;
}

describe("SiteDataProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("mantiene privados los remates que no están publicados", () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });

    expect(result.current.remates.some((item) => item.estadoAdmin === "en_revision")).toBe(true);
    expect(result.current.publishedRemates.every((item) => item.estadoAdmin === "publicado")).toBe(
      true
    );
    expect(
      result.current.publishedRemates.some((item) => item.id === "precarga-remate-especial")
    ).toBe(false);
  });

  it("publica un remate nuevo y actualiza el estado en memoria", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const remate = createCompleteRemate({
      id: "nuevo-publicado",
      slug: "nuevo-publicado",
      version: 0,
    });

    await act(async () => {
      await result.current.saveRemate(remate);
    });

    expect(result.current.publishedRemates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "nuevo-publicado", version: 1 }),
      ])
    );

    await waitFor(() => expect(result.current.remates.some((item) => item.id === "nuevo-publicado")).toBe(true));
  });

  it("oculta y vuelve a publicar conservando el slug", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const published = result.current.publishedRemates[0];

    await act(async () => {
      await result.current.changeRemateStatus(published.id, published.version, "oculto");
    });

    const hidden = result.current.remates.find((item) => item.id === published.id)!;
    expect(hidden.estadoAdmin).toBe("oculto");
    expect(result.current.publishedRemates.some((item) => item.id === published.id)).toBe(false);

    await act(async () => {
      await result.current.changeRemateStatus(hidden.id, hidden.version, "publicado");
    });

    const republished = result.current.remates.find((item) => item.id === published.id)!;
    expect(republished.estadoAdmin).toBe("publicado");
    expect(republished.slug).toBe(published.slug);
  });

  it("rechaza una edición basada en una versión anterior", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const staleRemate = result.current.remates[0];
    let firstResult: RemateMutationResult | undefined;
    let staleResult: RemateMutationResult | undefined;

    await act(async () => {
      firstResult = await result.current.saveRemate({
        ...staleRemate,
        titulo: "Primer cambio",
      });
    });
    await act(async () => {
      staleResult = await result.current.saveRemate({
        ...staleRemate,
        titulo: "Cambio desactualizado",
      });
    });

    expect(firstResult?.status).toBe("saved");
    expect(staleResult?.status).toBe("conflict");
    expect(result.current.remates[0].titulo).toBe("Primer cambio");
    expect(result.current.remates[0].version).toBe(staleRemate.version + 1);
  });

  it("impide eliminar un remate usando una versión anterior", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const staleRemate = result.current.remates[0];
    let deleteResult: DataOperationResult | undefined;

    await act(async () => {
      await result.current.saveRemate({
        ...staleRemate,
        detalle: "Cambio realizado antes del intento de eliminación.",
      });
    });
    await act(async () => {
      deleteResult = await result.current.deleteRemate(staleRemate.id, staleRemate.version);
    });

    expect(deleteResult?.status).toBe("error");
    expect(result.current.remates.some((item) => item.id === staleRemate.id)).toBe(true);
  });

  it("impide cambiar el estado usando una versión anterior", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const staleRemate = result.current.publishedRemates[0];
    let statusResult: RemateMutationResult | undefined;

    await act(async () => {
      await result.current.saveRemate({
        ...staleRemate,
        detalle: "Cambio concurrente antes de ocultar.",
      });
    });
    await act(async () => {
      statusResult = await result.current.changeRemateStatus(
        staleRemate.id,
        staleRemate.version,
        "oculto"
      );
    });

    expect(statusResult?.status).toBe("conflict");
    expect(
      result.current.remates.find((item) => item.id === staleRemate.id)?.estadoAdmin
    ).toBe("publicado");
  });

  it("impide volver a publicar si cambió la versión del remate oculto", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const published = result.current.publishedRemates[0];

    await act(async () => {
      await result.current.changeRemateStatus(published.id, published.version, "oculto");
    });
    const staleHidden = result.current.remates.find((item) => item.id === published.id)!;

    await act(async () => {
      await result.current.saveRemate({
        ...staleHidden,
        detalle: "El remate oculto recibió otro cambio.",
      });
    });
    let republishResult: RemateMutationResult | undefined;
    await act(async () => {
      republishResult = await result.current.changeRemateStatus(
        staleHidden.id,
        staleHidden.version,
        "publicado"
      );
    });

    expect(republishResult?.status).toBe("conflict");
    expect(
      result.current.remates.find((item) => item.id === published.id)?.estadoAdmin
    ).toBe("oculto");
  });

  it("mantiene privados los remates finalizados y cancelados y conserva sus slugs", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const [toFinalize, toCancel] = result.current.publishedRemates;

    await act(async () => {
      await result.current.changeRemateStatus(toFinalize.id, toFinalize.version, "finalizado");
      await result.current.changeRemateStatus(toCancel.id, toCancel.version, "cancelado");
    });

    const finalized = result.current.remates.find((item) => item.id === toFinalize.id)!;
    const cancelled = result.current.remates.find((item) => item.id === toCancel.id)!;
    expect(result.current.publishedRemates.some((item) => item.id === finalized.id)).toBe(false);
    expect(result.current.publishedRemates.some((item) => item.id === cancelled.id)).toBe(false);

    await act(async () => {
      await result.current.saveRemate({
        ...finalized,
        titulo: "Título modificado luego de finalizar",
        slug: "slug-que-no-debe-aplicarse",
      });
      await result.current.saveRemate({
        ...cancelled,
        titulo: "Título modificado luego de cancelar",
        slug: "otro-slug-que-no-debe-aplicarse",
      });
    });

    expect(result.current.remates.find((item) => item.id === finalized.id)?.slug).toBe(
      toFinalize.slug
    );
    expect(result.current.remates.find((item) => item.id === cancelled.id)?.slug).toBe(
      toCancel.slug
    );
  });

  it("elimina un remate y actualiza el contenido general", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const deleted = result.current.remates[0];
    const updatedContent = {
      ...result.current.content,
      contacto: {
        ...result.current.content.contacto,
        telefono: "+598 99 999 999",
      },
    };

    await act(async () => {
      await result.current.deleteRemate(deleted.id, deleted.version);
      await result.current.saveContent(updatedContent);
    });

    expect(result.current.remates.some((item) => item.id === deleted.id)).toBe(false);
    expect(result.current.content.contacto.telefono).toBe("+598 99 999 999");
  });
});
