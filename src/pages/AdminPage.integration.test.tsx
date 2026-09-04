import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_KEY, DEMO_ADMIN_CREDENTIALS } from "../admin/adminConfig";
import { defaultSiteCopy } from "../data/siteCopy";
import { siteContent } from "../data/siteContent";
import { SiteDataProvider } from "../context/SiteDataContext";
import {
  SiteDataContext,
  type SiteDataContextValue,
} from "../context/siteDataContextValue";
import { createCompleteRemate } from "../test/fixtures";
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

function renderAdminWithContext(value: SiteDataContextValue) {
  return render(
    <SiteDataContext.Provider value={value}>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AdminPage />
      </MemoryRouter>
    </SiteDataContext.Provider>
  );
}

describe("panel administrador", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
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

  it("abre el menú lateral y lo cierra al cambiar de sección", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    const menuButton = screen.getByRole("button", { name: "Abrir menú" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await user.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Remates" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("heading", { name: "Todos los remates" })).toBeInTheDocument();
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

  it("permite publicar directamente un borrador completo", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    const completeDraft = createCompleteRemate({ estadoAdmin: "borrador" });
    window.localStorage.setItem(
      "zunino-remates-admin-data-v3",
      JSON.stringify({
        remates: [completeDraft],
        content: {
          contacto: siteContent.contacto,
          pasos: siteContent.pasos,
          faqs: siteContent.faqs,
          copy: defaultSiteCopy,
        },
      })
    );
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const draftRow = screen.getByText("Remate de prueba").closest("tr");
    await user.click(within(draftRow as HTMLTableRowElement).getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Publicar remate" }));

    expect(screen.getByText("Publicado")).toBeInTheDocument();
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

  it("oculta y vuelve a publicar un remate", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const row = screen.getByText("Maquinaria y herramientas").closest("tr")!;

    await user.click(within(row).getByRole("button", { name: "Ocultar" }));
    expect(within(row).getByText("Oculto")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Volver a publicar" })).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Volver a publicar" }));
    expect(within(row).getByText("Publicado")).toBeInTheDocument();
  });

  it("no finaliza ni cancela un remate si se cierra el modal", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const row = screen.getByText("Maquinaria y herramientas").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Finalizar" }));
    const finalizeDialog = screen.getByRole("dialog", { name: "Finalizar remate" });
    expect(within(finalizeDialog).getByText(/forma permanente/i)).toBeInTheDocument();
    await user.click(within(finalizeDialog).getByRole("button", { name: "Volver" }));

    await user.click(within(row).getByRole("button", { name: "Cancelar" }));
    const cancelDialog = screen.getByRole("dialog", { name: "Cancelar remate" });
    await user.click(
      within(cancelDialog).getByRole("button", { name: "Cerrar confirmación" })
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(row).getByText("Publicado")).toBeInTheDocument();
  });

  it("muestra el modal propio al eliminar y restablecer datos", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const row = screen.getByText("Maquinaria y herramientas").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Eliminar" }));

    expect(screen.getByRole("dialog", { name: "Eliminar remate" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Maquinaria y herramientas")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restablecer datos de demostración" }));
    const resetDialog = screen.getByRole("dialog", { name: "Restablecer demostración" });
    expect(within(resetDialog).getByText(/datos iniciales/i)).toBeInTheDocument();
    await user.click(within(resetDialog).getByRole("button", { name: "Volver" }));
  });

  it("finaliza y cancela remates desde el modal de confirmación", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const finalizedRow = screen.getByText("Maquinaria y herramientas").closest("tr")!;
    const cancelledRow = screen.getByText("Vehículos utilitarios").closest("tr")!;

    await user.click(within(finalizedRow).getByRole("button", { name: "Finalizar" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Finalizar remate" })).getByRole("button", {
        name: "Finalizar remate",
      })
    );
    await user.click(within(cancelledRow).getByRole("button", { name: "Cancelar" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Cancelar remate" })).getByRole("button", {
        name: "Cancelar remate",
      })
    );

    expect(within(finalizedRow).getByText("Finalizado")).toBeInTheDocument();
    expect(within(cancelledRow).getByText("Cancelado")).toBeInTheDocument();
    expect(within(finalizedRow).queryByRole("button", { name: "Finalizar" })).not.toBeInTheDocument();
    expect(within(cancelledRow).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("mantiene abierto el editor y conserva los datos locales ante un conflicto", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const remate = createCompleteRemate();
    const saveRemate = vi.fn<SiteDataContextValue["saveRemate"]>().mockResolvedValue({
      status: "conflict",
      current: { ...remate, version: remate.version + 1 },
    });
    const contextValue: SiteDataContextValue = {
      remates: [remate],
      publishedRemates: [remate],
      publicRemates: [remate],
      publicDataStatus: "ready",
      retryPublicData: vi.fn(),
      content: {
        contacto: siteContent.contacto,
        pasos: siteContent.pasos,
        faqs: siteContent.faqs,
        copy: defaultSiteCopy,
      },
      publicContent: {
        contacto: siteContent.contacto,
        pasos: siteContent.pasos,
        faqs: siteContent.faqs,
        copy: defaultSiteCopy,
      },
      saveRemate,
      deleteRemate: async () => ({ status: "saved" }),
      changeRemateStatus: async () => ({ status: "saved", remate }),
      saveContent: async () => ({ status: "saved" }),
      resetDemoData: async () => ({ status: "saved" }),
    };
    const user = userEvent.setup();
    renderAdminWithContext(contextValue);

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const row = screen.getByText("Remate de prueba").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Editar" }));
    const titleInput = screen.getByRole("textbox", { name: /Título/ });
    await user.clear(titleInput);
    await user.type(titleInput, "Cambio local sin guardar");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/tus cambios siguen en pantalla/i);
    expect(titleInput).toHaveValue("Cambio local sin guardar");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("mantiene fijo el slug cuando cambia el título de un remate publicado", async () => {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole("button", { name: "Remates" }));
    const row = screen.getByText("Maquinaria y herramientas").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Editar" }));

    const titleInput = screen.getByRole("textbox", { name: /Título/ });
    const slugInput = screen.getByRole("textbox", { name: /Ruta o slug/ });
    expect(slugInput).toHaveValue("maquinaria-y-herramientas");

    await user.clear(titleInput);
    await user.type(titleInput, "Gran remate de maquinaria");

    expect(slugInput).toHaveValue("maquinaria-y-herramientas");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByText("Gran remate de maquinaria")).toBeInTheDocument();
  });
});
