import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const publicApiPaths = new Set(["/api/v1/public/content", "/api/v1/public/remates"]);
const defaultHeroTitle =
  "Participá en remates en vivo con catálogos claros y reglas transparentes.";
const evidenceDir = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "2026-10-22",
  "unblock-batch-1-6381218",
);

type RequestRecord = {
  phase: "delayed" | "failed" | "recovered";
  path: string;
  status: number;
};

function isPublicApi(url: URL) {
  return publicApiPaths.has(url.pathname);
}

async function expectNoFallbackContent(page: Page) {
  await expect(page.getByText(defaultHeroTitle, { exact: true })).toBeHidden();
  await expect(page.getByRole("link", { name: "Ver detalle del remate" })).toHaveCount(0);
  await expect(page.locator("#proximos article.card")).toHaveCount(0);
}

async function expectRealPublicContent(page: Page) {
  await expect(page.getByRole("heading", { name: "Próximos remates en vivo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver detalle del remate" }).first()).toBeVisible();
}

async function firstPublicRemateSlug(page: Page) {
  await page.goto("/");
  await expectRealPublicContent(page);
  const href = await page
    .getByRole("link", { name: "Ver detalle del remate" })
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/remates\//);
  return href!;
}

async function saveRequestEvidence(name: string, records: RequestRecord[]) {
  await writeFile(
    resolve(evidenceDir, `${name}-solicitudes.json`),
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

test.describe("@regression carga y recuperación de datos públicos", () => {
  test.beforeAll(async () => {
    await mkdir(evidenceDir, { recursive: true });
  });

  test("WEB-012 mantiene la carga sin datos demo y luego renderiza respuestas reales", async ({
    context,
    page,
  }) => {
    let releaseResponses!: () => void;
    const release = new Promise<void>((resolveRelease) => {
      releaseResponses = resolveRelease;
    });
    const records: RequestRecord[] = [];

    await context.route("**/api/v1/public/**", async (route) => {
      const url = new URL(route.request().url());
      if (!isPublicApi(url) || route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      const response = await route.fetch();
      records.push({ phase: "delayed", path: url.pathname, status: response.status() });
      await release;
      await route.fulfill({ response });
    });

    await page.goto("/");
    await expect.poll(() => records.length).toBe(2);
    await expect(page.getByRole("heading", { name: "Cargando…" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Estamos consultando la información actualizada de los remates.",
    );
    await expectNoFallbackContent(page);
    await page.screenshot({
      path: resolve(evidenceDir, "WEB-012-carga-sin-datos-demo.png"),
      fullPage: true,
    });

    expect(records.map(({ path }) => path).sort()).toEqual([...publicApiPaths].sort());
    expect(records.every(({ status }) => status === 200)).toBe(true);
    releaseResponses();
    await expectRealPublicContent(page);
    await saveRequestEvidence("WEB-012", records);
  });

  test("WEB-013 muestra error y reintento en home y detalle sin fallback local", async ({
    context,
    page,
  }) => {
    const detailPath = await firstPublicRemateSlug(page);
    const records: RequestRecord[] = [];

    await context.route("**/api/v1/public/**", async (route) => {
      const url = new URL(route.request().url());
      if (!isPublicApi(url) || route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      records.push({ phase: "failed", path: url.pathname, status: 500 });
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Fallo QA controlado" }),
      });
    });

    for (const [index, path] of ["/", detailPath].entries()) {
      const target = index === 0 ? page : await context.newPage();
      await target.goto(path);
      const alert = target.getByRole("alert");
      await expect(alert).toContainText("No pudimos cargar la información.");
      await expect(target.getByRole("button", { name: "Reintentar" })).toBeVisible();
      await expectNoFallbackContent(target);
      await target.screenshot({
        path: resolve(evidenceDir, `WEB-013-error-${index === 0 ? "home" : "detalle"}.png`),
        fullPage: true,
      });
      if (target !== page) await target.close();
    }

    expect(records.length).toBeGreaterThanOrEqual(4);
    expect(records.every(({ status }) => status === 500)).toBe(true);
    await saveRequestEvidence("WEB-013", records);
  });

  test("WEB-014 reintenta y recupera datos reales sin recargar el documento", async ({
    context,
    page,
  }) => {
    let failRequests = true;
    const records: RequestRecord[] = [];

    await context.route("**/api/v1/public/**", async (route) => {
      const url = new URL(route.request().url());
      if (!isPublicApi(url) || route.request().method() !== "GET") {
        await route.continue();
        return;
      }

      if (failRequests) {
        records.push({ phase: "failed", path: url.pathname, status: 500 });
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Fallo QA controlado" }),
        });
        return;
      }

      const response = await route.fetch();
      records.push({ phase: "recovered", path: url.pathname, status: response.status() });
      await route.fulfill({ response });
    });

    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText("No pudimos cargar la información.");
    await expect.poll(() => records.filter(({ phase }) => phase === "failed").length).toBe(2);

    const marker = `qa-document-${Date.now()}`;
    await page.evaluate((value) => {
      document.documentElement.dataset.qaDocumentMarker = value;
    }, marker);
    const navigationEntriesBefore = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    failRequests = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("heading", { name: "Cargando…" })).toBeVisible();
    await expectRealPublicContent(page);
    await expect.poll(() => records.filter(({ phase }) => phase === "recovered").length).toBe(2);

    expect(
      await page.evaluate(() => document.documentElement.dataset.qaDocumentMarker),
    ).toBe(marker);
    expect(
      await page.evaluate(() => performance.getEntriesByType("navigation").length),
    ).toBe(navigationEntriesBefore);
    expect(records.filter(({ phase }) => phase === "failed").map(({ status }) => status)).toEqual([
      500,
      500,
    ]);
    expect(records.filter(({ phase }) => phase === "recovered").every(({ status }) => status === 200)).toBe(
      true,
    );

    await page.screenshot({
      path: resolve(evidenceDir, "WEB-014-recuperacion-sin-recarga.png"),
      fullPage: false,
    });
    await saveRequestEvidence("WEB-014", records);
  });
});
