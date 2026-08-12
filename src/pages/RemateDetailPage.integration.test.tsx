import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { SiteDataProvider } from "../context/SiteDataContext";
import { defaultSiteCopy } from "../data/siteCopy";
import { siteContent } from "../data/siteContent";
import { createCompleteRemate } from "../test/fixtures";
import { RemateDetailPage } from "./RemateDetailPage";

function renderDetailPage() {
  return render(
    <SiteDataProvider>
      <MemoryRouter
        initialEntries={["/remates/maquinaria-y-herramientas"]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Routes>
          <Route path="/remates/:slug" element={<RemateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </SiteDataProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("visibilidad del detalle", () => {
  it("no permite abrir por URL un remate oculto", () => {
    const hiddenRemate = createCompleteRemate({
      slug: "maquinaria-y-herramientas",
      estadoAdmin: "oculto",
    });
    window.localStorage.setItem(
      "zunino-remates-admin-data-v3",
      JSON.stringify({
        remates: [hiddenRemate],
        content: {
          contacto: siteContent.contacto,
          pasos: siteContent.pasos,
          faqs: siteContent.faqs,
          copy: defaultSiteCopy,
        },
      })
    );

    renderDetailPage();

    expect(screen.getByRole("heading", { name: "No encontramos ese evento." })).toBeInTheDocument();
    expect(screen.queryByText(hiddenRemate.subtitulo)).not.toBeInTheDocument();
  });
});

describe("carrusel de lotes destacados", () => {
  it("conserva el nuevo orden cuando termina la transición", async () => {
    const user = userEvent.setup();
    const { container } = renderDetailPage();
    const nextButton = screen.getByRole("button", { name: "Ver lotes siguientes" });
    const carousel = nextButton.closest(".lot-carousel-strip") as HTMLElement;
    const track = container.querySelector(".lot-strip-track") as HTMLElement;

    expect(
      within(carousel).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
    ).toEqual([
      "Compresor industrial de alto caudal",
      "Torno con banco y accesorios",
      "Lote completo de herramientas pesadas",
    ]);

    await user.click(nextButton);
    await waitFor(() => expect(track.children).toHaveLength(4));
    const transitionEnd = new Event("transitionend", { bubbles: true });
    Object.defineProperty(transitionEnd, "propertyName", { value: "transform" });
    fireEvent(track, transitionEnd);

    expect(
      within(carousel).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
    ).toEqual([
      "Torno con banco y accesorios",
      "Lote completo de herramientas pesadas",
      "Compresor industrial de alto caudal",
    ]);
    expect(track.children).toHaveLength(3);
  });

  it("ubica las flechas ampliadas alrededor del marco de la imagen", async () => {
    const user = userEvent.setup();
    renderDetailPage();

    await user.click(
      screen.getByRole("button", { name: "Ver Compresor industrial de alto caudal en grande" })
    );

    const dialog = screen.getByRole("dialog");
    const image = within(dialog).getByRole("img");
    const previousButton = within(dialog).getByRole("button", { name: "Ver imagen anterior" });
    const nextButton = within(dialog).getByRole("button", { name: "Ver imagen siguiente" });
    const closeButton = within(dialog).getByRole("button", { name: "Cerrar imagen ampliada" });

    expect(image.parentElement).toHaveClass("lightbox-media");
    expect(previousButton.parentElement).toBe(image.parentElement);
    expect(nextButton.parentElement).toBe(image.parentElement);
    expect(closeButton.parentElement).not.toBe(image.parentElement);
  });
});
