import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loginAsQaAdmin, selectAdminSection } from "./helpers/admin";
import {
  readCatalogFixtureJournal,
  writeCatalogFixtureJournal,
  type CatalogFixtureJournal,
} from "./helpers/catalog-fixture-journal";

type AdminLot = {
  id: string;
  nombre: string;
  storagePath?: string;
  imagen: { url: string; alt: string };
};

type AdminRemate = {
  id: string;
  version: number;
  slug: string;
  titulo: string;
  estadoAdmin: string;
  destacados: AdminLot[];
  [key: string]: unknown;
};

type ApiResult<T> = {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
};

const evidenceDir = resolve(process.cwd(), "docs", "qa", "evidence", "2026-10-24", "unblock-batch-6-2657ae5");
const imageFiles = [
  { path: resolve(process.cwd(), "docs", "qa", "fixtures", "catalog-batch-6", "qa-toolbox.png"), name: "qa-toolbox.png", lotName: "Caja de herramientas QA" },
  { path: resolve(process.cwd(), "docs", "qa", "fixtures", "catalog-batch-6", "qa-tractor.png"), name: "qa-tractor.png", lotName: "Tractor QA" },
  { path: resolve(process.cwd(), "docs", "qa", "fixtures", "catalog-batch-6", "qa-trailer.png"), name: "qa-trailer.png", lotName: "Remolque QA" },
];

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});
async function adminRequest<T>(page: Page, method: "GET" | "POST" | "DELETE", body?: unknown) {
  return page.evaluate(async ({ method, body }) => {
    let csrf = "";
    if (method !== "GET") {
      const session = await fetch("/api/v1/admin/session", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
      });
      const payload = await session.json();
      if (!session.ok || !payload?.data?.csrf) throw new Error("No se pudo obtener CSRF administrativo.");
      csrf = payload.data.csrf;
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
    return { status: response.status, ok: response.ok, data: payload?.data, error: payload?.error };
  }, { method, body }) as Promise<ApiResult<T>>;
}

async function listAdminRemates(page: Page) {
  const result = await adminRequest<AdminRemate[]>(page, "GET");
  expect(result.ok, "lectura administrativa de remates").toBe(true);
  expect(Array.isArray(result.data)).toBe(true);
  return result.data!;
}

async function publicRemate(page: Page, id: string) {
  return page.evaluate(async (fixtureId) => {
    const response = await fetch("/api/v1/public/remates", { cache: "no-store", headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload?.data)) throw new Error("No se pudo consultar la API pública.");
    return payload.data.find((item: { id: string }) => item.id === fixtureId) ?? null;
  }, id) as Promise<AdminRemate | null>;
}

function fixtureBody(id: string) {
  const shortId = id.slice(0, 8);
  return {
    id,
    version: 0,
    slug: `qa-catalogo-temporal-${shortId}`,
    fechaHora: null,
    fechaPorConfirmar: true,
    titulo: `QA CATÁLOGO TEMPORAL ${shortId}`,
    subtitulo: "Galería temporal para validación QA",
    lugar: "Predio QA",
    ubicacionDetalle: "Ubicación sintética de pruebas",
    detalle: "Remate descartable de la sexta tanda QA.",
    enlace: "",
    catalogoEstado: "Catálogo QA disponible",
    descripcionLarga: "Fixture aislado con tres fotografías sintéticas; no representa bienes reales.",
    destacados: [],
    requisitos: ["Sin operaciones comerciales"],
    condiciones: ["Fixture temporal"],
    estadoAdmin: "borrador",
    catalogoPublicacionEstado: "disponible",
  };
}

async function dropAllImages(page: Page) {
  const files = await Promise.all(imageFiles.map(async (file) => ({
    name: file.name,
    mimeType: "image/png",
    base64: (await readFile(file.path)).toString("base64"),
  })));
  const dataTransfer = await page.evaluateHandle((payloads) => {
    const transfer = new DataTransfer();
    payloads.forEach(({ name, mimeType, base64 }) => {
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      transfer.items.add(new File([bytes], name, { type: mimeType }));
    });
    return transfer;
  }, files);
  await page.locator("label.admin-lot-dropzone").dispatchEvent("drop", { dataTransfer });
  await dataTransfer.dispose();
}

async function recoverExactFixture(page: Page, journal: CatalogFixtureJournal) {
  const remates = await listAdminRemates(page);
  const current = remates.find(({ id }) => id === journal.fixture.id);
  if (!current) {
    await writeCatalogFixtureJournal({ ...journal, status: "absent" });
    return;
  }
  expect(current.titulo).toBe(journal.fixture.title);
  expect(journal.originalIds).not.toContain(current.id);
  const deletion = await adminRequest<{ status: string; storageCleanupPending?: boolean }>(page, "DELETE", { id: current.id, version: current.version });
  expect(deletion.ok).toBe(true);
  expect(deletion.data?.status).toBe("saved");
  expect(deletion.data?.storageCleanupPending).not.toBe(true);
  await writeCatalogFixtureJournal({ ...journal, status: "deleted", serverVersion: current.version });
}

test("@regression CAT-013 prepara una galería real con tres archivos en un único drop", async ({ page }) => {
  test.setTimeout(120_000);
  await test.step("autenticar al administrador QA", async () => loginAsQaAdmin(page));
  const pending = await readCatalogFixtureJournal();
  expect(!pending || pending.status === "deleted" || pending.status === "absent", "no debe existir un fixture pendiente").toBe(true);
  const originalRemates = await listAdminRemates(page);
  const originalIds = originalRemates.map(({ id }) => id).sort();
  const fixture = fixtureBody(randomUUID());
  let journal = await writeCatalogFixtureJournal({
    fixture: { id: fixture.id, slug: fixture.slug, title: fixture.titulo },
    status: "planned",
    storagePaths: [],
    originalIds,
  });

  const created = await test.step("crear el borrador registrado", async () =>
    adminRequest<{ status: string; remate: AdminRemate }>(page, "POST", { remate: fixture }));
  expect(created.ok).toBe(true);
  expect(created.data?.status).toBe("saved");
  expect(created.data?.remate.id).toBe(fixture.id);
  journal = await writeCatalogFixtureJournal({ ...journal, status: "created", serverVersion: created.data!.remate.version });

  await page.reload();
  await selectAdminSection(page, "Remates", "Todos los remates");
  const row = page.locator("tbody tr", { hasText: fixture.titulo });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await test.step("entregar tres archivos en un único DataTransfer", async () => dropAllImages(page));

  const cards = page.locator(".admin-lot-card");
  await expect(cards).toHaveCount(3);
  for (const [index, image] of imageFiles.entries()) {
    const input = page.getByRole("textbox", { name: `Nombre de la foto ${index + 1}` });
    await input.fill(image.lotName);
    await expect(cards.nth(index).locator("img")).toHaveAttribute("src", /^data:image\/png;base64,/);
  }

  const saveResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/admin/remates") && response.request().method() === "POST", { timeout: 30_000 });
  await test.step("persistir las tres fotografías", async () =>
    page.getByRole("button", { name: "Guardar borrador", exact: true }).click());
  const savedPayload = await (await saveResponse).json();
  expect(savedPayload?.data?.status).toBe("saved");
  expect(savedPayload?.data?.storageCleanupPending).not.toBe(true);
  const saved = savedPayload.data.remate as AdminRemate;
  expect(saved.id).toBe(fixture.id);
  expect(saved.destacados).toHaveLength(3);
  expect(saved.destacados.map(({ nombre }) => nombre)).toEqual(imageFiles.map(({ lotName }) => lotName));
  const storagePaths = saved.destacados.map(({ storagePath }) => storagePath ?? "");
  expect(storagePaths.every((path) => path.startsWith(`${fixture.id}/`))).toBe(true);
  expect(new Set(storagePaths).size).toBe(3);
  journal = await writeCatalogFixtureJournal({ ...journal, status: "created", serverVersion: saved.version, storagePaths });

  await page.reload();
  await selectAdminSection(page, "Remates", "Todos los remates");
  const reloadedRow = page.locator("tbody tr", { hasText: fixture.titulo });
  await reloadedRow.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.locator(".admin-lot-card")).toHaveCount(3);
  for (const [index, image] of imageFiles.entries()) {
    await expect(page.getByRole("textbox", { name: `Nombre de la foto ${index + 1}` })).toHaveValue(image.lotName);
  }

  const publishResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/admin/remates") && response.request().method() === "POST", { timeout: 30_000 });
  await test.step("publicar el fixture para las verificaciones públicas", async () =>
    page.getByRole("button", { name: "Publicar remate", exact: true }).click());
  const publishedPayload = await (await publishResponse).json();
  expect(publishedPayload?.data?.status).toBe("saved");
  expect(publishedPayload?.data?.storageCleanupPending).not.toBe(true);
  const published = publishedPayload.data.remate as AdminRemate;
  expect(published).toMatchObject({ id: fixture.id, estadoAdmin: "publicado" });
  expect(published.destacados).toHaveLength(3);
  await expect.poll(() => publicRemate(page, fixture.id)).not.toBeNull();
  await writeCatalogFixtureJournal({ ...journal, status: "published", serverVersion: published.version, storagePaths });
  await page.screenshot({ path: resolve(evidenceDir, "CAT-013-tres-tarjetas-publicadas.png"), fullPage: true });
  await writeFile(resolve(evidenceDir, "CAT-013.json"), `${JSON.stringify({
    fixtureId: fixture.id,
    operation: "DataTransfer + DragEvent",
    filesInSingleDrop: imageFiles.length,
    cardsCreated: saved.destacados.length,
    namesPersisted: true,
    persistedAfterReload: true,
    publishedForDependentCases: true,
    physicalOperatingSystemDragVerified: false,
    qaResult: "No ejecutado",
  }, null, 2)}\n`, "utf8");
});
test("@regression CAT-021 elimina exactamente el fixture y deja el inventario original", async ({ page }) => {
  test.setTimeout(90_000);
  await test.step("autenticar al administrador QA", async () => loginAsQaAdmin(page));
  const journal = await readCatalogFixtureJournal();
  expect(journal?.status).toBe("published");
  if (!journal) return;
  let deletionCompleted = false;
  try {
    const before = await listAdminRemates(page);
    const current = before.find(({ id }) => id === journal.fixture.id);
    expect(current).toBeTruthy();
    expect(current?.titulo).toBe(journal.fixture.title);
    expect(current?.version).toBe(journal.serverVersion);
    expect(current?.destacados.map(({ storagePath }) => storagePath)).toEqual(journal.storagePaths);
    await writeCatalogFixtureJournal({ ...journal, status: "cleanup-pending" });

    await page.reload();
    await selectAdminSection(page, "Remates", "Todos los remates");
    const row = page.locator("tbody tr", { hasText: journal.fixture.title });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: "Eliminar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Eliminar remate" });
    await expect(dialog).toBeVisible();
    const deleteResponse = page.waitForResponse((response) => response.url().endsWith("/api/v1/admin/remates") && response.request().method() === "DELETE", { timeout: 30_000 });
    await test.step("confirmar la eliminación del UUID registrado", async () =>
      dialog.getByRole("button", { name: "Eliminar remate", exact: true }).click());
    const payload = await (await deleteResponse).json();
    expect(payload?.data?.status).toBe("saved");
    expect(payload?.data?.storageCleanupPending).not.toBe(true);

    await expect(row).toHaveCount(0);
    const after = await test.step("verificar ausencia administrativa y pública", async () => listAdminRemates(page));
    expect(after.map(({ id }) => id).sort()).toEqual(journal.originalIds);
    expect(after.some(({ id }) => id === journal.fixture.id)).toBe(false);
    await expect.poll(() => publicRemate(page, journal.fixture.id)).toBeNull();
    deletionCompleted = true;
    await writeCatalogFixtureJournal({ ...journal, status: "deleted", serverVersion: current!.version });
    await page.screenshot({ path: resolve(evidenceDir, "CAT-021-inventario-restaurado.png"), fullPage: true });
    await writeFile(resolve(evidenceDir, "CAT-021.json"), `${JSON.stringify({
      fixtureId: journal.fixture.id,
      serverVersion: current!.version,
      registeredStoragePaths: journal.storagePaths.length,
      deletionConfirmed: true,
      storageCleanupPending: false,
      adminApiAbsent: true,
      publicApiAbsent: true,
      originalInventoryRestored: true,
      finalRemateCount: after.length,
    }, null, 2)}\n`, "utf8");
  } finally {
    if (!deletionCompleted) await recoverExactFixture(page, journal);
  }
});
