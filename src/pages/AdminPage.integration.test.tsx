import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_SESSION_KEY, DEMO_ADMIN_CREDENTIALS } from "../admin/adminConfig";
import { SiteDataProvider } from "../context/SiteDataContext";
import { AdminPage } from "./AdminPage";

function renderAdmin() {
  return render(
    <SiteDataProvider>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AdminPage />
      </MemoryRouter>
    </SiteDataProvider>
  );
}

describe("panel administrador", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("rechaza credenciales incorrectas y permite ingresar con las válidas", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.type(screen.getByLabelText("Usuario"), "incorrecto");
    await user.type(screen.getByLabelText(/Contrase/), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText(/incorrectos/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Usuario"));
    await user.clear(screen.getByLabelText(/Contrase/));
    await user.type(screen.getByLabelText("Usuario"), DEMO_ADMIN_CREDENTIALS.username);
    await user.type(screen.getByLabelText(/Contrase/), DEMO_ADMIN_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByRole("heading", { name: "Panel administrador" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("active");
  });

  it("bloquea la publicación de la precarga mientras falten datos obligatorios", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));

    const pendingRow = screen
      .getByText("Remate especial de activos varios")
      .closest("tr");
    expect(pendingRow).not.toBeNull();

    await user.click(within(pendingRow as HTMLTableRowElement).getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Publicar remate" }));

    expect(screen.getByText(/no puede publicarse/i)).toBeInTheDocument();
    expect(screen.getByText(/fecha resumida es obligatoria/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Debe cargarse una URL, ruta o archivo PDF/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/al menos un requisito/i)).toBeInTheDocument();
  });

  it("permite guardar una carga incompleta como borrador", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const pendingRow = screen
      .getByText("Remate especial de activos varios")
      .closest("tr");

    await user.click(within(pendingRow as HTMLTableRowElement).getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    const updatedRow = screen
      .getByText("Remate especial de activos varios")
      .closest("tr");
    expect(within(updatedRow as HTMLTableRowElement).getByText("Borrador")).toBeInTheDocument();
  });
});
