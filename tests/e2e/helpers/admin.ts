import { expect, type Page } from "@playwright/test";
import { getQaAdminCredentials } from "./qa-credentials";

export async function loginAsQaAdmin(page: Page) {
  const credentials = getQaAdminCredentials();
  await page.goto("/admin12345");
  await expect(page.getByRole("heading", { level: 1, name: "Ingresar al panel" })).toBeVisible();
  const emailInput = page.getByRole("textbox", { name: "Email" });
  const passwordInput = page.getByRole("textbox", { name: "Contraseña", exact: true });
  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  const fieldsAreIntact = await page.evaluate(
    ({ email, password }) => {
      const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]');
      const passwordInput = document.querySelector<HTMLInputElement>('#admin-password');
      return emailInput?.value === email && passwordInput?.value === password;
    },
    credentials,
  );
  if (!fieldsAreIntact) {
    await Promise.allSettled([emailInput.fill(""), passwordInput.fill("")]);
    throw new Error("Las credenciales QA no llegaron íntegras al formulario.");
  }
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  // El handler ya recibió ambos valores. Se vacían enseguida para impedir que
  // Playwright los incluya en contextos de error o capturas temporales.
  await Promise.allSettled([emailInput.fill(""), passwordInput.fill("")]);

  await page.waitForFunction(
    () => document.querySelector("button.admin-menu-toggle") || document.querySelector('[role="alert"]'),
    undefined,
    { timeout: 15_000 },
  );

  const alert = page.getByRole("alert");
  if (await alert.isVisible()) {
    await emailInput.fill("");
    await passwordInput.fill("");
    await expect(emailInput).toHaveValue("");
    await expect(passwordInput).toHaveValue("");
    throw new Error(`La autenticación QA fue rechazada: ${(await alert.textContent())?.trim() ?? "sin detalle"}`);
  }
  await expect(page.locator("button.admin-menu-toggle")).toBeVisible();
}

export async function openAdminMenu(page: Page) {
  const toggle = page.locator("button.admin-menu-toggle");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  return toggle;
}

export async function selectAdminSection(page: Page, name: string, heading: string) {
  const toggle = await openAdminMenu(page);
  await page.locator("#admin-navigation").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
}

export async function openQaRemateEditor(page: Page) {
  await selectAdminSection(page, "Remates", "Todos los remates");
  const row = page.locator("tr", { hasText: "QA BORRAR Validación fotos" });
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Volver al listado", exact: true })).toBeVisible();
}
