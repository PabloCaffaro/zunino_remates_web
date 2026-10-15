import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AdminApi } from "../data/adminApi";
import { defaultSiteCopy } from "../data/siteCopy";
import { siteContent } from "../test/siteContentFixture";
import type { EditableSiteContent } from "../types/site";
import { AdminDataProvider } from "./AdminDataProvider";
import { SiteDataContext, type SiteDataContextValue, useSiteData } from "./siteDataContextValue";

const initialContent: EditableSiteContent = {
  contacto: siteContent.contacto,
  pasos: siteContent.pasos,
  faqs: siteContent.faqs,
  copy: defaultSiteCopy,
};

const updatedContent: EditableSiteContent = {
  ...initialContent,
  contacto: {
    ...initialContent.contacto,
    email: "qa+contenido@example.invalid",
    telefono: "+598 99 123 456",
    direccion: "Av. José Belloni 1234, Montevideo",
    horario: "Lunes & miércoles\n9:00 a 18:00",
  },
  copy: {
    ...initialContent.copy,
    heroDescription: "Línea con ñ, \"comillas\" & símbolos\nSegunda línea",
  },
  faqs: [{ id: "faq-qa", pregunta: "¿Cómo participo?", respuesta: "En sala & online.\nConsultá antes." }],
};

function Probe() {
  const { content, saveContent } = useSiteData();
  return <>
    <output aria-label="contenido actual">{JSON.stringify(content)}</output>
    <button type="button" onClick={() => void saveContent(updatedContent)}>Guardar contenido de prueba</button>
  </>;
}

describe("AdminDataProvider contenido", () => {
  it("envía todos los campos, adopta la respuesta persistida y los recupera al recargar", async () => {
    let persisted = structuredClone(initialContent);
    const request = vi.fn(async (path: string, method = "GET", body?: unknown) => {
      if (path === "remates") return [];
      if (path === "content" && method === "POST") {
        persisted = structuredClone((body as { content: EditableSiteContent }).content);
        return structuredClone(persisted);
      }
      if (path === "content") return structuredClone(persisted);
      throw new Error("Solicitud inesperada");
    });
    const api = { request } as unknown as AdminApi;
    const retryPublicData = vi.fn();
    const publicValue = {
      remates: [], publishedRemates: [], content: initialContent,
      publicContent: initialContent, publicRemates: [], publicDataStatus: "ready",
      retryPublicData,
    } as unknown as SiteDataContextValue;
    const wrapper = ({ children }: { children: ReactNode }) => <SiteDataContext.Provider value={publicValue}>
      <AdminDataProvider api={api} onLogout={vi.fn()}>{children}</AdminDataProvider>
    </SiteDataContext.Provider>;

    const firstRender = render(<Probe />, { wrapper });
    await screen.findByRole("button", { name: "Guardar contenido de prueba" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar contenido de prueba" }));

    await waitFor(() => expect(screen.getByLabelText("contenido actual")).toHaveTextContent(updatedContent.contacto.direccion));
    expect(request).toHaveBeenCalledWith("content", "POST", { content: updatedContent });
    expect(retryPublicData).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    render(<Probe />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText("contenido actual")).toHaveTextContent(updatedContent.contacto.email));
    expect(screen.getByLabelText("contenido actual")).toHaveTextContent(updatedContent.contacto.telefono);
    expect(screen.getByLabelText("contenido actual")).toHaveTextContent("Lunes & miércoles");
    expect(screen.getByLabelText("contenido actual")).toHaveTextContent("Línea con ñ");
    expect(screen.getByLabelText("contenido actual")).toHaveTextContent("Consultá antes.");
  });
});
