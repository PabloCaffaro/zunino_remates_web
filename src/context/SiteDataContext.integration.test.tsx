import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createCompleteRemate } from "../test/fixtures";
import { SiteDataProvider } from "./SiteDataContext";
import { useSiteData } from "./siteDataContextValue";

function wrapper({ children }: { children: ReactNode }) {
  return <SiteDataProvider>{children}</SiteDataProvider>;
}

describe("SiteDataProvider", () => {
  it("mantiene privados los remates que están en revisión", () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });

    expect(result.current.remates.some((item) => item.estadoAdmin === "en_revision")).toBe(true);
    expect(result.current.publishedRemates.every((item) => item.estadoAdmin === "publicado")).toBe(
      true
    );
    expect(
      result.current.publishedRemates.some((item) => item.id === "precarga-remate-especial")
    ).toBe(false);
  });

  it("publica un remate nuevo y lo persiste en localStorage", async () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const remate = createCompleteRemate({ id: "nuevo-publicado", slug: "nuevo-publicado" });

    act(() => result.current.saveRemate(remate));

    expect(result.current.publishedRemates).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "nuevo-publicado" })])
    );

    await waitFor(() => {
      const stored = window.localStorage.getItem("zunino-remates-admin-data-v2");
      expect(stored).toContain("nuevo-publicado");
    });
  });

  it("retira un remate de la web pública al finalizarlo", () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const publishedId = result.current.publishedRemates[0].id;

    act(() => result.current.changeRemateStatus(publishedId, "finalizado"));

    expect(result.current.publishedRemates.some((item) => item.id === publishedId)).toBe(false);
    expect(result.current.remates.find((item) => item.id === publishedId)?.estadoAdmin).toBe(
      "finalizado"
    );
  });

  it("elimina un remate y actualiza el contenido general", () => {
    const { result } = renderHook(() => useSiteData(), { wrapper });
    const deletedId = result.current.remates[0].id;
    const updatedContent = {
      ...result.current.content,
      contacto: {
        ...result.current.content.contacto,
        telefono: "+598 99 999 999",
      },
    };

    act(() => {
      result.current.deleteRemate(deletedId);
      result.current.saveContent(updatedContent);
    });

    expect(result.current.remates.some((item) => item.id === deletedId)).toBe(false);
    expect(result.current.content.contacto.telefono).toBe("+598 99 999 999");
  });
});
