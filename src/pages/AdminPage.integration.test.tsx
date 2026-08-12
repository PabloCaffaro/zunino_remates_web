import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza credenciales incorrectas y permite ingresar con las válidas", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.type(screen.getByLabelText("Usuario"), "incorrecto");
    await user.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    const firstError = screen.getByRole("alert");
    expect(firstError).toHaveAttribute("data-attempt", "1");
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(screen.getByRole("alert")).toHaveAttribute("data-attempt", "2");
    expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Usuario"));
    await user.clear(screen.getByLabelText("Contraseña"));
    await user.type(screen.getByLabelText("Usuario"), DEMO_ADMIN_CREDENTIALS.username);
    await user.type(screen.getByLabelText("Contraseña"), DEMO_ADMIN_CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByRole("heading", { name: "Panel administrador" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("active");
  });

  it("retira el error de inicio de sesión luego de diez segundos", () => {
    vi.useFakeTimers();
    renderAdmin();

    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "incorrecto" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "incorrecta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    expect(screen.getByRole("checkbox", { name: "Fecha a confirmar" })).toBeChecked();
    expect(screen.getByText(/al menos un requisito/i)).toBeInTheDocument();
  });

  it("retira el aviso de publicación luego de diez segundos", () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    renderAdmin();

    fireEvent.click(screen.getByRole("button", { name: "Remates" }));
    const pendingRow = screen.getByText("Remate especial de activos varios").closest("tr");
    fireEvent.click(
      within(pendingRow as HTMLTableRowElement).getByRole("button", { name: "Editar" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Publicar remate" }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("agrega varias fotos y exige un nombre para cada una", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const pendingRow = screen.getByText("Remate especial de activos varios").closest("tr");
    await user.click(
      within(pendingRow as HTMLTableRowElement).getByRole("button", { name: "Editar" })
    );

    const fileInput = screen.getByLabelText("Agregar fotos de lotes destacados");
    const firstImage = new File(["imagen uno"], "lote-uno.jpg", { type: "image/jpeg" });
    const secondImage = new File(["imagen dos"], "lote-dos.webp", { type: "image/webp" });

    await user.upload(fileInput, [firstImage, secondImage]);

    expect(
      await screen.findByRole("img", { name: "Vista previa de lote-uno.jpg" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Vista previa de lote-dos.webp" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Agregar fotos de lotes destacados")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/nombre a cada foto/i);

    await user.type(screen.getByLabelText("Nombre de la foto 1"), "Tractor rojo");
    await user.type(screen.getByLabelText("Nombre de la foto 2"), "Sembradora");
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));

    expect(screen.getByRole("heading", { name: "Todos los remates" })).toBeInTheDocument();
  });

  it("muestra los errores de imagen debajo de la zona de carga", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const pendingRow = screen.getByText("Remate especial de activos varios").closest("tr");
    await user.click(
      within(pendingRow as HTMLTableRowElement).getByRole("button", { name: "Editar" })
    );

    const fileInput = screen.getByLabelText("Agregar fotos de lotes destacados");
    const dropzone = screen.getByText("Arrastrá las fotos acá").closest("label");
    const oversizedImage = new File([new Uint8Array(700_001)], "foto-grande.jpg", {
      type: "image/jpeg",
    });

    await user.upload(fileInput, oversizedImage);

    const uploadError = await screen.findByRole("alert");
    expect(uploadError).toHaveTextContent(/supera el tamaño permitido/i);
    expect(
      (dropzone as HTMLLabelElement).compareDocumentPosition(uploadError) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
