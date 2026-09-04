import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteDataProvider } from "../context/SiteDataContext";
import { siteContent } from "../data/siteContent";
import { defaultSiteCopy } from "../data/siteCopy";
import { HomePage } from "./HomePage";
import { RemateDetailPage } from "./RemateDetailPage";

function renderPublic(path = "/") {
  return render(<SiteDataProvider><MemoryRouter initialEntries={[path]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <Routes><Route path="/" element={<HomePage />} /><Route path="/remates/:slug" element={<RemateDetailPage />} /></Routes>
  </MemoryRouter></SiteDataProvider>);
}

function respondWithRemoteData(empty = false) {
  vi.mocked(fetch).mockImplementation(async (url) => new Response(JSON.stringify({
    data: String(url).endsWith("/remates") ? (empty ? [] : [{ ...siteContent.remates[0], titulo: "Remate remoto verificado", destacados: [] }]) : {
      contacto: siteContent.contacto, pasos: siteContent.pasos, faqs: siteContent.faqs,
      copy: { ...defaultSiteCopy, heroTitle: "Contenido remoto verificado" },
    },
  })));
}

afterEach(() => vi.useRealTimers());

describe("carga pública sin respaldo local", () => {
  it("no muestra remates de demostración mientras espera la API", () => {
    renderPublic();
    expect(screen.getByRole("heading", { name: "Cargando…" })).toBeInTheDocument();
    expect(screen.queryByText("Maquinaria y herramientas")).not.toBeInTheDocument();
    expect(screen.queryByText(defaultSiteCopy.heroTitle)).not.toBeInTheDocument();
  });

  it("muestra error y permite reintentar hasta cargar los datos remotos", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    renderPublic();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar");
    expect(screen.queryByText("Maquinaria y herramientas")).not.toBeInTheDocument();
    respondWithRemoteData();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Contenido remoto verificado" })).toBeInTheDocument();
    expect(screen.getAllByText("Remate remoto verificado").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ver detalle del remate" })).toHaveClass("btn", "btn-outline");
    expect(screen.queryByText("Maquinaria y herramientas")).not.toBeInTheDocument();
  });

  it("no sustituye una lista remota vacía por remates locales", async () => {
    respondWithRemoteData(true);
    renderPublic();
    await screen.findByRole("heading", { name: "Contenido remoto verificado" });
    expect(screen.queryByText("Maquinaria y herramientas")).not.toBeInTheDocument();
  });

  it("espera la respuesta antes de decidir que el detalle no existe", () => {
    renderPublic("/remates/no-existe");
    expect(screen.queryByText("No encontramos ese evento.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cargando…" })).toBeInTheDocument();
  });

  it("distingue un fallo de conexión de un remate inexistente", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    renderPublic("/remates/maquinaria-y-herramientas");
    await screen.findByRole("alert");
    expect(screen.queryByText("No encontramos ese evento.")).not.toBeInTheDocument();
    expect(screen.queryByText("Maquinaria y herramientas")).not.toBeInTheDocument();
  });

  it("muestra no encontrado sólo después de una respuesta exitosa vacía", async () => {
    respondWithRemoteData(true);
    renderPublic("/remates/no-existe");
    await waitFor(() => expect(screen.getByText("No encontramos ese evento.")).toBeInTheDocument());
  });

  it("permite reintentar cuando se supera el tiempo de espera", async () => {
    vi.useFakeTimers();
    renderPublic();
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(true);
  });
});
