import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("rutas inexistentes", () => {
  it("muestra una página 404 con opciones para volver", () => {
    render(
      <MemoryRouter
        initialEntries={["/caca"]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Esta página no existe." })).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Ver próximos remates" })).toHaveAttribute(
      "href",
      "/#proximos"
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
