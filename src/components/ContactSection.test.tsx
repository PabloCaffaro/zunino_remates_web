import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { defaultSiteCopy } from "../data/siteCopy";
import { siteContent } from "../test/siteContentFixture";
import { ContactSection } from "./ContactSection";

describe("errores accesibles del formulario de contacto", () => {
  it("anuncia los errores nuevos de campos vacíos y conserva sus descripciones", async () => {
    const user = userEvent.setup();
    render(<ContactSection contact={siteContent.contacto} copy={defaultSiteCopy} />);

    await user.click(screen.getByRole("button", { name: "Enviar consulta" }));

    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByText("El nombre es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("El email es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("El mensaje es obligatorio.")).toHaveAttribute("role", "alert");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAttribute(
      "aria-describedby",
      "name-error",
    );
  });

  it("anuncia un email inválido una sola vez en su mensaje inline", async () => {
    const user = userEvent.setup();
    render(<ContactSection contact={siteContent.contacto} copy={defaultSiteCopy} />);
    const email = screen.getByRole("textbox", { name: "Email" });

    await user.type(email, "correo-invalido");
    await user.tab();

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresá un email válido.");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(email).toHaveAttribute("aria-invalid", "true");
  });
});
