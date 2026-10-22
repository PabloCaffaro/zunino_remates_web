import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const successMessage = "Gracias. Tu consulta fue aceptada para envío.";
const errorMessage = "No se pudo enviar la consulta. Intentá de nuevo en unos minutos.";
const syntheticData = {
  name: "Persona QA E2E",
  email: "qa-e2e@example.invalid",
  message: "Consulta sintética interceptada por Playwright",
};

type MockResponse = {
  status: number;
  body: string;
  contentType?: string;
};

async function interceptFormSubmit(
  context: BrowserContext,
  page: Page,
  mockResponse: MockResponse,
) {
  let observedRequests = 0;
  let interceptedRequests = 0;
  const violations: string[] = [];

  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (hostname === "formsubmit.co" || hostname.endsWith(".formsubmit.co")) {
      observedRequests += 1;
    }
  });

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isFormSubmit = url.hostname === "formsubmit.co" || url.hostname.endsWith(".formsubmit.co");

    if (!isFormSubmit) {
      await route.continue();
      return;
    }

    interceptedRequests += 1;
    if (request.method() !== "POST" || !url.pathname.startsWith("/ajax/")) {
      violations.push(`Solicitud FormSubmit inesperada: ${request.method()} ${url.pathname}`);
      await route.abort("blockedbyclient");
      return;
    }

    await route.fulfill({
      status: mockResponse.status,
      contentType: mockResponse.contentType ?? "application/json",
      body: mockResponse.body,
    });
  });

  return {
    assertIsolated() {
      expect(violations).toEqual([]);
      expect(interceptedRequests, "solicitudes FormSubmit interceptadas").toBe(1);
      expect(observedRequests, "ninguna solicitud FormSubmit escapó del interceptor").toBe(
        interceptedRequests,
      );
    },
  };
}

async function submitSyntheticContact(page: Page) {
  await page.goto("/#contacto");
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill(syntheticData.name);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(syntheticData.email);
  await page.getByRole("textbox", { name: "Mensaje", exact: true }).fill(syntheticData.message);
  await page.getByRole("button", { name: "Enviar consulta", exact: true }).click();
}

async function expectFields(page: Page, values: typeof syntheticData) {
  await expect(page.getByRole("textbox", { name: "Nombre", exact: true })).toHaveValue(values.name);
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toHaveValue(values.email);
  await expect(page.getByRole("textbox", { name: "Mensaje", exact: true })).toHaveValue(values.message);
}

test.describe("@regression CON-005 formulario de contacto", () => {
  test("acepta success true, anuncia el resultado y limpia los campos", async ({ context, page }) => {
    const guard = await interceptFormSubmit(context, page, {
      status: 200,
      body: JSON.stringify({ success: true }),
    });

    await submitSyntheticContact(page);

    const status = page.getByText(successMessage, { exact: true });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expectFields(page, { name: "", email: "", message: "" });
    guard.assertIsolated();
  });

  test("rechaza success false, anuncia el error y conserva los campos", async ({ context, page }) => {
    const guard = await interceptFormSubmit(context, page, {
      status: 200,
      body: JSON.stringify({ success: false }),
    });

    await submitSyntheticContact(page);

    const status = page.getByText(errorMessage, { exact: true });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expectFields(page, syntheticData);
    guard.assertIsolated();
  });

  test("rechaza un error HTTP del servicio y conserva los campos", async ({ context, page }) => {
    const guard = await interceptFormSubmit(context, page, {
      status: 500,
      body: JSON.stringify({ success: true }),
    });

    await submitSyntheticContact(page);

    const status = page.getByText(errorMessage, { exact: true });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expectFields(page, syntheticData);
    guard.assertIsolated();
  });
});
