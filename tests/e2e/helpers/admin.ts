import { expect, type Page } from "@playwright/test";
import { getQaAdminCredentials, getQaEditorCredentials } from "./qa-credentials";

async function loginWithQaCredentials(
  page: Page,
  credentials: { email: string; password: string },
) {
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
    () =>
      document.querySelector("button.admin-menu-toggle") ||
      document.querySelector('[role="alert"]') ||
      Array.from(document.querySelectorAll("h1, h2")).some(
        (heading) => heading.textContent?.trim() === "Resumen de contenidos",
      ),
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
  await expect(page.getByRole("heading", { name: "Resumen de contenidos", exact: true })).toBeVisible();
}

export async function loginAsQaAdmin(page: Page) {
  await loginWithQaCredentials(page, getQaAdminCredentials());
}

export async function loginAsQaEditor(page: Page) {
  await loginWithQaCredentials(page, getQaEditorCredentials());
}

export async function openAdminMenu(page: Page) {
  const toggle = page.locator("button.admin-menu-toggle");
  if (!(await toggle.isVisible())) {
    await expect(page.locator("#admin-navigation")).toBeVisible();
    return toggle;
  }
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  return toggle;
}

export async function selectAdminSection(page: Page, name: string, heading: string) {
  const toggle = await openAdminMenu(page);
  const mobileMenuVisible = await toggle.isVisible();
  await page.locator("#admin-navigation").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  if (mobileMenuVisible) await expect(toggle).toHaveAttribute("aria-expanded", "false");
}

export async function openQaRemateEditor(page: Page) {
  await selectAdminSection(page, "Remates", "Todos los remates");
  const row = page.locator("tr", { hasText: "QA BORRAR Validación fotos" });
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Volver al listado", exact: true })).toBeVisible();
}

export type AdminApiResult<T> = {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export async function adminApiRequest<T>(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
) {
  return page.evaluate(async ({ method, body }) => {
    let csrf = "";
    if (method !== "GET") {
      const sessionResponse = await fetch("/api/v1/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
      });
      const sessionPayload = await sessionResponse.json();
      if (!sessionResponse.ok || !sessionPayload?.data?.csrf) {
        throw new Error("No se pudo preparar una solicitud administrativa autenticada.");
      }
      csrf = sessionPayload.data.csrf;
    }

    const response = await fetch("/api/v1/admin/remates", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "zunino-admin",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json();
    return {
      status: response.status,
      ok: response.ok,
      data: payload?.data,
      error: payload?.error,
      code: payload?.code,
    };
  }, { method, body }) as Promise<AdminApiResult<T>>;
}
