import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loginAsQaAdmin, selectAdminSection } from "./helpers/admin";
import { assertQaAdminCredentials } from "./helpers/qa-credentials";

const evidenceDir = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "2026-10-22",
  "unblock-batch-2-6381218",
);
const networkErrorMessage =
  "No se pudo confirmar la operación. Revisá la conexión y recargá el listado antes de volver a guardar.";

type RequestRecord = {
  method: string;
  path: string;
  result: "aborted" | "recovered";
  status?: number;
};

test.use({ viewport: { width: 390, height: 844 } });

async function saveEvidence(caseId: string, records: RequestRecord[]) {
  await writeFile(
    resolve(evidenceDir, `${caseId}-solicitudes.json`),
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

async function screenshot(page: Page, caseId: string, state: string) {
  await page.screenshot({
    path: resolve(evidenceDir, `${caseId}-${state}.png`),
    fullPage: true,
  });
}

function editorInput(page: Page, labelText: string, selector: "input" | "textarea" = "input") {
  return page.locator("label", { hasText: labelText }).locator(selector).first();
}

async function getAdminRemates(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/admin/remates", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
    });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload?.data)) {
      throw new Error("No se pudo verificar el listado administrativo.");
    }
    return (payload.data as Array<{ id: string; titulo: string }>).map(({ id, titulo }) => ({
      id,
      titulo,
    }));
  });
}

async function getPublicContent(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/public/content", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok || !payload?.data) {
      throw new Error("No se pudo verificar el contenido público.");
    }
    return payload.data as unknown;
  });
}

async function guardAdminMutation(
  context: BrowserContext,
  path: "/api/v1/admin/remates" | "/api/v1/admin/content",
) {
  const records: RequestRecord[] = [];
  const violations: string[] = [];

  await context.route("**/api/v1/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== path || request.method() === "GET") {
      await route.continue();
      return;
    }

    if (request.method() !== "POST") {
      violations.push(`${request.method()} ${url.pathname}`);
    }
    records.push({ method: request.method(), path: url.pathname, result: "aborted" });
    await route.abort("connectionfailed");
  });

  return {
    records,
    assertSingleAbortedSave() {
      expect(violations, "no hubo mutaciones administrativas inesperadas").toEqual([]);
      expect(records).toEqual([{ method: "POST", path, result: "aborted" }]);
    },
  };
}

test.describe("@regression recuperación administrativa ante fallos de red", () => {
  test.beforeAll(async () => {
    assertQaAdminCredentials();
    await mkdir(evidenceDir, { recursive: true });
  });

  test("ACC-016 recupera la carga inicial sin perder la sesión", async ({ context, page }) => {
    await loginAsQaAdmin(page);
    let failAdminReads = true;
    const records: RequestRecord[] = [];
    const violations: string[] = [];
    const guardedPaths = new Set(["/api/v1/admin/remates", "/api/v1/admin/content"]);

    await context.route("**/api/v1/admin/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!guardedPaths.has(url.pathname)) {
        await route.continue();
        return;
      }
      if (request.method() !== "GET") {
        violations.push(`${request.method()} ${url.pathname}`);
        await route.abort("blockedbyclient");
        return;
      }
      if (failAdminReads) {
        records.push({ method: "GET", path: url.pathname, result: "aborted" });
        await route.abort("connectionfailed");
        return;
      }
      const response = await route.fetch();
      records.push({
        method: "GET",
        path: url.pathname,
        result: "recovered",
        status: response.status(),
      });
      await route.fulfill({ response });
    });

    await page.reload();
    await expect(page.getByRole("heading", { name: "No pudimos cargar el administrador" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(networkErrorMessage);
    await expect(page.getByRole("button", { name: "Reintentar", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión", exact: true })).toBeVisible();
    await screenshot(page, "ACC-016", "error-inicial");

    failAdminReads = false;
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Resumen de contenidos", exact: true })).toBeVisible();
    await expect(page.locator("button.admin-menu-toggle")).toBeVisible();

    const sessionIsValid = await page.evaluate(async () => {
      const response = await fetch("/api/v1/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
      });
      const payload = await response.json();
      return response.ok && Boolean(payload?.data?.user);
    });
    expect(sessionIsValid).toBe(true);
    expect(violations).toEqual([]);
    expect(records.filter(({ result }) => result === "aborted").length).toBeGreaterThanOrEqual(1);
    expect(records.filter(({ result }) => result === "recovered").map(({ path }) => path).sort()).toEqual(
      [...guardedPaths].sort(),
    );
    expect(
      records.filter(({ result }) => result === "recovered").every(({ status }) => status === 200),
    ).toBe(true);
    await screenshot(page, "ACC-016", "recuperado");
    await saveEvidence("ACC-016", records);
  });

  test("REM-035 conserva un remate local cuando se aborta el guardado", async ({ context, page }) => {
    await loginAsQaAdmin(page);
    const before = await getAdminRemates(page);
    await selectAdminSection(page, "Remates", "Todos los remates");
    await page.getByRole("button", { name: "Agregar remate", exact: true }).click();

    const guard = await guardAdminMutation(context, "/api/v1/admin/remates");
    const title = editorInput(page, "Título *");
    const localTitle = "QA LOCAL REM-035 sin persistir";
    await title.fill(localTitle);
    await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText(networkErrorMessage);
    await expect(page.getByRole("button", { name: "Volver al listado", exact: true })).toBeVisible();
    await expect(title).toHaveValue(localTitle);
    await expect(page.locator(".form-status-success")).toHaveCount(0);
    guard.assertSingleAbortedSave();

    const after = await getAdminRemates(page);
    expect(after).toEqual(before);
    expect(after.some(({ titulo }) => titulo === localTitle)).toBe(false);
    await screenshot(page, "REM-035", "guardado-abortado");
    await saveEvidence("REM-035", guard.records);
  });

  test("CON-016 conserva cambios locales y no altera el contenido público", async ({ context, page }) => {
    await loginAsQaAdmin(page);
    const publicBefore = await getPublicContent(page);
    await selectAdminSection(page, "Contenido general", "Textos y datos de la empresa");

    const guard = await guardAdminMutation(context, "/api/v1/admin/content");
    const heroTitle = editorInput(page, "Título principal", "textarea");
    const originalValue = await heroTitle.inputValue();
    const localValue = `${originalValue} [QA LOCAL CON-016]`;
    await heroTitle.fill(localValue);
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();

    await expect(page.locator(".form-status-error")).toContainText(networkErrorMessage);
    await expect(heroTitle).toHaveValue(localValue);
    await expect(page.getByText("Cambios guardados.", { exact: true })).toHaveCount(0);
    guard.assertSingleAbortedSave();

    const publicAfter = await getPublicContent(page);
    expect(publicAfter).toEqual(publicBefore);
    await screenshot(page, "CON-016", "guardado-abortado");
    await saveEvidence("CON-016", guard.records);
  });
});
