import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSiteCopy } from "../data/siteCopy";
import { siteContent } from "../test/siteContentFixture";
import { ContactSection } from "./ContactSection";

const successMessage = "Gracias. Tu consulta fue aceptada para envío.";
const errorMessage = "No se pudo enviar la consulta. Intentá de nuevo en unos minutos.";
let fetchMock: ReturnType<typeof vi.fn>;

function renderContactSection() {
  render(<ContactSection contact={siteContent.contacto} copy={defaultSiteCopy} />);
}

async function submitValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Persona QA");
  await user.type(screen.getByRole("textbox", { name: "Email" }), "qa@example.test");
  await user.type(screen.getByRole("textbox", { name: "Mensaje" }), "Consulta controlada");
  await user.click(screen.getByRole("button", { name: "Enviar consulta" }));
}

function expectFieldsToBeEmpty() {
  expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("");
  expect(screen.getByRole("textbox", { name: "Mensaje" })).toHaveValue("");
}

function expectFieldsToBePreserved() {
  expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Persona QA");
  expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("qa@example.test");
  expect(screen.getByRole("textbox", { name: "Mensaje" })).toHaveValue("Consulta controlada");
}

function respondWith(ok: boolean, payload: unknown, status = ok ? 200 : 500) {
  fetchMock.mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response);
}

describe("errores accesibles del formulario de contacto", () => {
  beforeEach(() => {
    fetchMock = vi.fn().mockRejectedValue(new Error("fetch no configurado en la prueba"));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("anuncia los errores nuevos de campos vacíos y conserva sus descripciones", async () => {
    const user = userEvent.setup();
    renderContactSection();

    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByText("El nombre es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("El email es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("El mensaje es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAttribute(
      "aria-describedby",
      "name-error",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anuncia un email inválido una sola vez en su mensaje inline", async () => {
    const user = userEvent.setup();
    renderContactSection();
    const email = screen.getByRole("textbox", { name: "Email" });

    await user.type(email, "correo-invalido");
    await user.tab();

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresá un email válido.");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([true, "true"])(
    "acepta success=%s, anuncia el resultado y limpia los campos",
    async (success) => {
      respondWith(true, { success });
      renderContactSection();

      await submitValidForm();

      expect(await screen.findByText(successMessage)).toHaveAttribute("aria-live", "polite");
      expect(screen.getAllByText(successMessage)).toHaveLength(1);
      expectFieldsToBeEmpty();
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it.each([false, "false"])(
    "rechaza success=%s, anuncia el error y conserva los campos",
    async (success) => {
      respondWith(true, { success });
      renderContactSection();

      await submitValidForm();

      expect(await screen.findByText(errorMessage)).toHaveAttribute("aria-live", "polite");
      expect(screen.getAllByText(errorMessage)).toHaveLength(1);
      expectFieldsToBePreserved();
    },
  );

  it.each([400, 500])(
    "rechaza HTTP %s aunque el JSON indique éxito y conserva los campos",
    async (status) => {
      respondWith(false, { success: true }, status);
      renderContactSection();

      await submitValidForm();

      expect(await screen.findByText(errorMessage)).toHaveAttribute("aria-live", "polite");
      expectFieldsToBePreserved();
    },
  );

  it.each([
    ["JSON inválido", new SyntaxError("JSON inválido")],
    ["respuesta vacía", new SyntaxError("Fin inesperado de JSON")],
  ])("rechaza %s y conserva los campos", async (_scenario, parseError) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(parseError),
    } as unknown as Response);
    renderContactSection();

    await submitValidForm();

    expect(await screen.findByText(errorMessage)).toHaveAttribute("aria-live", "polite");
    expectFieldsToBePreserved();
  });

  it("rechaza una respuesta sin success y conserva los campos", async () => {
    respondWith(true, { message: "Sin confirmación explícita" });
    renderContactSection();

    await submitValidForm();

    expect(await screen.findByText(errorMessage)).toHaveAttribute("aria-live", "polite");
    expectFieldsToBePreserved();
  });

  it("rechaza un error de red y conserva los campos", async () => {
    fetchMock.mockRejectedValue(new TypeError("Fallo de red simulado"));
    renderContactSection();

    await submitValidForm();

    expect(await screen.findByText(errorMessage)).toHaveAttribute("aria-live", "polite");
    expectFieldsToBePreserved();
  });
});
