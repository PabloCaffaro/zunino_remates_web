import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  loginAsQaAdmin,
  loginAsQaEditor,
  selectAdminSection,
} from "./helpers/admin";
import {
  assertQaAdminCredentials,
  assertQaEditorCredentials,
} from "./helpers/qa-credentials";
import {
  isPendingFixtureJournal,
  readFixtureJournal,
  writeFixtureJournal,
  type QaFixtureIdentity,
  type QaFixtureJournal,
} from "./helpers/qa-fixture-journal";

const evidenceDir = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "2026-10-23",
  "unblock-batch-5-2657ae5",
);
const permanentPhotoFixtureId = "94000000-0000-4000-8000-000000000001";

type AdminRemate = {
  id: string;
  version: number;
  slug: string;
  fechaHora: string | null;
  fechaPorConfirmar: boolean;
  titulo: string;
  subtitulo: string;
  lugar: string;
  ubicacionDetalle: string;
  detalle: string;
  descripcionLarga: string;
  catalogoEstado: string;
  catalogoPublicacionEstado: "disponible" | "preliminar" | "proximamente";
  requisitos: string[];
  condiciones: string[];
  destacados: Array<{
    id?: string;
    nombre?: string;
    storagePath?: string;
  }>;
  estadoAdmin: "borrador" | "en_revision" | "publicado" | "oculto" | "finalizado" | "cancelado";
};

type ApiResult<T> = {
  status: number;
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type CleanupEvidence = {
  deleted: boolean;
  fixtureAbsent: boolean;
  originalIdsPreserved: boolean;
  permanentPhotoFixturePreserved: boolean;
  finalRemateCount: number;
};

let persistentOperationsSafe = true;

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeAll(async () => {
  assertQaAdminCredentials();
  assertQaEditorCredentials();
  await mkdir(evidenceDir, { recursive: true });
});

async function newIndependentContext(
  browser: Browser,
  bootstrapState: Awaited<ReturnType<BrowserContext["storageState"]>>,
) {
  return browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
    storageState: bootstrapState,
    viewport: { width: 390, height: 844 },
  });
}

async function sessionRole(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/admin/session", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
    });
    const payload = await response.json();
    if (!response.ok || !payload?.data?.user?.rol) {
      throw new Error("No se pudo verificar el rol de la sesión QA.");
    }
    return payload.data.user.rol as "administrador" | "editor";
  });
}

async function adminRequest<T>(page: Page, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) {
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
  }, { method, body }) as Promise<ApiResult<T>>;
}

async function listAdminRemates(page: Page) {
  const result = await adminRequest<AdminRemate[]>(page, "GET");
  expect(result.ok, "lectura administrativa de remates").toBe(true);
  expect(Array.isArray(result.data)).toBe(true);
  return result.data!;
}

async function ensureAdminSession(page: Page) {
  try {
    if ((await sessionRole(page)) === "administrador") return;
  } catch {
    // Una página nueva todavía no tiene un origen desde el que consultar la sesión.
  }
  await loginAsQaAdmin(page);
  expect(await sessionRole(page)).toBe("administrador");
}

function newFixture(caseId: "ACC-014" | "WEB-010") {
  const id = randomUUID();
  const shortId = id.slice(0, 8);
  return {
    id,
    version: 0,
    slug: `qa-borrar-${caseId.toLowerCase()}-${shortId}`,
    fechaHora: null,
    fechaPorConfirmar: true,
    titulo: `QA BORRAR ${caseId} ${shortId}`,
    subtitulo: `Fixture descartable ${caseId}`,
    lugar: "Predio QA",
    ubicacionDetalle: "Ubicación QA aislada",
    detalle: "Fixture temporal para una regresión E2E controlada.",
    descripcionLarga: "Este remate se elimina al finalizar la prueba.",
    catalogoEstado: "Catálogo QA en preparación.",
    catalogoPublicacionEstado: "proximamente" as const,
    requisitos: ["Documento vigente"],
    condiciones: ["Sin operaciones comerciales"],
    destacados: [],
    estadoAdmin: "borrador" as const,
  } satisfies AdminRemate;
}

function permanentFixtureSnapshot(remates: AdminRemate[]) {
  const fixture = remates.find(({ id }) => id === permanentPhotoFixtureId);
  expect(fixture, "fixture fotográfico permanente").toBeTruthy();
  return {
    id: fixture!.id,
    version: fixture!.version,
    slug: fixture!.slug,
    estadoAdmin: fixture!.estadoAdmin,
    destacados: fixture!.destacados.map(({ id, nombre, storagePath }) => ({ id, nombre, storagePath })),
  };
}

function fixtureIdentity(fixture: Pick<AdminRemate, "id" | "slug" | "titulo">): QaFixtureIdentity {
  return { id: fixture.id, slug: fixture.slug, title: fixture.titulo };
}

function assertFixtureMatchesJournal(remate: AdminRemate, journal: QaFixtureJournal) {
  expect(remate.id, "UUID del fixture registrado").toBe(journal.fixture.id);
  expect(remate.slug, "slug del fixture registrado").toBe(journal.fixture.slug);
  expect(
    remate.titulo.startsWith(`QA BORRAR ${journal.caseId} `),
    "nombre seguro del fixture registrado",
  ).toBe(true);
  expect(remate.id, "protección del fixture fotográfico permanente").not.toBe(permanentPhotoFixtureId);
}

async function recoverPendingFixture(adminPage: Page, caseId: string) {
  const journal = await readFixtureJournal(caseId);
  if (!isPendingFixtureJournal(journal)) return null;

  await ensureAdminSession(adminPage);
  const before = await listAdminRemates(adminPage);
  const permanentBefore = permanentFixtureSnapshot(before);
  const current = before.find(({ id }) => id === journal.fixture.id);
  if (!current) {
    await writeFixtureJournal(caseId, journal.fixture, "absent", journal.serverVersion);
    return { id: journal.fixture.id, deleted: false, alreadyAbsent: true };
  }

  assertFixtureMatchesJournal(current, journal);
  const idsExceptFixture = before.filter(({ id }) => id !== current.id).map(({ id }) => id).sort();
  const deletion = await adminRequest<{ status: string }>(adminPage, "DELETE", {
    id: current.id,
    version: current.version,
  });
  expect(deletion.status, "recuperación administrativa del fixture registrado").toBe(200);
  expect(deletion.data?.status).toBe("saved");

  const after = await listAdminRemates(adminPage);
  expect(after.map(({ id }) => id).sort()).toEqual(idsExceptFixture);
  expect(permanentFixtureSnapshot(after)).toEqual(permanentBefore);
  await writeFixtureJournal(caseId, journal.fixture, "deleted", current.version);
  return { id: journal.fixture.id, deleted: true, alreadyAbsent: false };
}

async function cleanupFixture(
  adminPage: Page,
  caseId: string,
  fixture: AdminRemate,
  originalIds: string[],
  permanentBefore: ReturnType<typeof permanentFixtureSnapshot>,
): Promise<CleanupEvidence> {
  const identity = fixtureIdentity(fixture);
  await writeFixtureJournal(caseId, identity, "cleanup-pending");
  await ensureAdminSession(adminPage);
  const beforeDelete = await listAdminRemates(adminPage);
  const current = beforeDelete.find(({ id }) => id === fixture.id);
  let deleted = false;
  if (current) {
    expect(originalIds, "el fixture descartable no pertenece al conjunto original").not.toContain(current.id);
    assertFixtureMatchesJournal(current, {
      caseId,
      fixture: identity,
      status: "cleanup-pending",
      updatedAt: "",
    });
    const deletion = await adminRequest<{ status: string }>(adminPage, "DELETE", {
      id: fixture.id,
      version: current.version,
    });
    expect(deletion.status, "eliminación administrativa del fixture").toBe(200);
    expect(deletion.data?.status).toBe("saved");
    deleted = true;
  }

  const finalRemates = await listAdminRemates(adminPage);
  const finalIds = finalRemates.map(({ id }) => id).sort();
  const fixtureAbsent = !finalIds.includes(fixture.id);
  const originalIdsPreserved = JSON.stringify(finalIds) === JSON.stringify([...originalIds].sort());
  const permanentPhotoFixturePreserved =
    JSON.stringify(permanentFixtureSnapshot(finalRemates)) === JSON.stringify(permanentBefore);
  expect(fixtureAbsent).toBe(true);
  expect(originalIdsPreserved).toBe(true);
  expect(permanentPhotoFixturePreserved).toBe(true);
  await writeFixtureJournal(caseId, identity, deleted ? "deleted" : "absent", current?.version);
  return {
    deleted,
    fixtureAbsent,
    originalIdsPreserved,
    permanentPhotoFixturePreserved,
    finalRemateCount: finalRemates.length,
  };
}

function editorInput(page: Page, labelText: string, selector: "input" | "textarea" = "input") {
  return page.locator("label", { hasText: labelText }).locator(selector).first();
}

async function publicRemate(page: Page, id: string) {
  return page.evaluate(async (fixtureId) => {
    const response = await fetch("/api/v1/public/remates", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload?.data)) {
      throw new Error("No se pudo verificar la API pública.");
    }
    return payload.data.find((item: { id: string }) => item.id === fixtureId) ?? null;
  }, id) as Promise<{ id: string; slug: string; subtitulo: string } | null>;
}

test("@regression ACC-014 valida permisos completos del editor y rechazo DELETE por rol", async ({
  browser,
  context,
}) => {
  test.skip(!persistentOperationsSafe, "Una limpieza anterior dejó inseguras las operaciones persistentes.");
  const bootstrapState = await context.storageState();
  const editorContext = await newIndependentContext(browser, bootstrapState);
  const cleanupContext = await newIndependentContext(browser, bootstrapState);
  const editorPage = await editorContext.newPage();
  const adminPage = await cleanupContext.newPage();
  const fixture = newFixture("ACC-014");
  let latestFixture: AdminRemate = fixture;
  let fixtureWriteAttempted = false;
  let originalIds: string[] = [];
  let permanentBefore: ReturnType<typeof permanentFixtureSnapshot> | undefined;
  const evidence: Record<string, unknown> = { fixtureId: fixture.id };
  let testError: unknown;

  try {
    await Promise.all([ensureAdminSession(adminPage), loginAsQaEditor(editorPage)]);
    evidence.recoveredPriorFixture = await recoverPendingFixture(adminPage, "ACC-014");
    const role = await sessionRole(editorPage);
    expect(role).toBe("editor");
    evidence.serverRole = role;

    const initialRemates = await listAdminRemates(editorPage);
    expect(initialRemates).toHaveLength(6);
    originalIds = initialRemates.map(({ id }) => id).sort();
    permanentBefore = permanentFixtureSnapshot(initialRemates);
    evidence.initialRemateCount = initialRemates.length;
    evidence.initialVersion = fixture.version;
    evidence.initialState = fixture.estadoAdmin;

    await writeFixtureJournal("ACC-014", fixtureIdentity(fixture), "planned");
    fixtureWriteAttempted = true;
    const created = await adminRequest<{ status: string; remate: AdminRemate }>(editorPage, "POST", {
      remate: fixture,
    });
    expect(created.status).toBe(200);
    expect(created.data?.status).toBe("saved");
    const createdRemate = created.data!.remate;
    await writeFixtureJournal(
      "ACC-014",
      fixtureIdentity(fixture),
      "created",
      createdRemate.version,
    );
    evidence.create = { status: created.status, version: createdRemate.version };

    const editedTitle = `${fixture.titulo} editado`;
    const edited = await adminRequest<{ status: string; remate: AdminRemate }>(editorPage, "POST", {
      remate: { ...createdRemate, titulo: editedTitle },
    });
    expect(edited.status).toBe(200);
    expect(edited.data?.status).toBe("saved");
    expect(edited.data!.remate.version).toBeGreaterThan(createdRemate.version);
    latestFixture = edited.data!.remate;
    await writeFixtureJournal(
      "ACC-014",
      fixtureIdentity(latestFixture),
      "updated",
      latestFixture.version,
    );
    evidence.edit = { status: edited.status, version: edited.data!.remate.version };

    const published = await adminRequest<{ status: string; remate: AdminRemate }>(editorPage, "PATCH", {
      id: fixture.id,
      version: edited.data!.remate.version,
      status: "publicado",
    });
    expect(published.status).toBe(200);
    expect(published.data?.status).toBe("saved");
    expect(published.data?.remate.estadoAdmin).toBe("publicado");
    latestFixture = published.data!.remate;
    await writeFixtureJournal(
      "ACC-014",
      fixtureIdentity(latestFixture),
      "updated",
      latestFixture.version,
    );
    evidence.publish = { status: published.status, version: published.data!.remate.version };

    await editorPage.reload();
    await selectAdminSection(editorPage, "Remates", "Todos los remates");
    const row = editorPage.locator("tbody tr", { hasText: editedTitle });
    await expect(row).toBeVisible();
    const deleteButton = row.getByRole("button", { name: "Eliminar", exact: true });
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toHaveAttribute("title", "Sólo administradores pueden eliminar");
    evidence.deleteButtonDisabled = true;

    const forcedDelete = await adminRequest<unknown>(editorPage, "DELETE", {
      id: fixture.id,
      version: published.data!.remate.version,
    });
    expect(forcedDelete.status).toBe(403);
    expect(forcedDelete.error).toContain("Sólo un administrador puede eliminar remates.");
    expect(forcedDelete.error).not.toContain("verificación de la solicitud");
    evidence.forcedDelete = {
      status: forcedDelete.status,
      rejectedByRole: true,
      authenticatedOriginAndCsrfAccepted: true,
    };

    const afterDeniedDelete = await listAdminRemates(editorPage);
    const stillPresent = afterDeniedDelete.some(({ id }) => id === fixture.id);
    expect(stillPresent).toBe(true);
    evidence.fixturePresentAfterDeniedDelete = stillPresent;
    await row.screenshot({ path: resolve(evidenceDir, "ACC-014-editor-delete-deshabilitado.png") });
  } catch (error) {
    testError = error;
  }

  let cleanupError: unknown;
  try {
    if (fixtureWriteAttempted && permanentBefore) {
      evidence.cleanup = await cleanupFixture(
        adminPage,
        "ACC-014",
        latestFixture,
        originalIds,
        permanentBefore,
      );
    }
    await writeFile(
      resolve(evidenceDir, "ACC-014.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    persistentOperationsSafe = false;
    cleanupError = error;
  }
  await Promise.allSettled([editorContext.close(), cleanupContext.close()]);
  if (cleanupError) throw cleanupError;
  if (testError) throw testError;
});

test("@regression WEB-010 sincroniza un cambio persistido entre contextos independientes", async ({
  browser,
  context,
}) => {
  // El flujo principal dispone de 100 s. Los 50 s restantes quedan reservados
  // para registrar evidencia, limpiar y cerrar contextos aunque una etapa falle.
  test.setTimeout(150_000);
  test.skip(!persistentOperationsSafe, "Una limpieza anterior dejó inseguras las operaciones persistentes.");
  const bootstrapState = await context.storageState();
  const contextA = await newIndependentContext(browser, bootstrapState);
  const contextB = await newIndependentContext(browser, bootstrapState);
  const cleanupContext = await newIndependentContext(browser, bootstrapState);
  const adminPageA = await contextA.newPage();
  const adminPageB = await contextB.newPage();
  const publicPageB = await contextB.newPage();
  const cleanupPage = await cleanupContext.newPage();
  const fixture = { ...newFixture("WEB-010"), estadoAdmin: "publicado" as const };
  const updatedSubtitle = `${fixture.subtitulo} actualizado ${fixture.id.slice(0, 8)}`;
  const evidencePath = resolve(evidenceDir, "WEB-010.json");
  let fixtureWriteAttempted = false;
  let originalIds: string[] = [];
  let permanentBefore: ReturnType<typeof permanentFixtureSnapshot> | undefined;
  let createdRemate: AdminRemate | undefined;
  let persistedA: AdminRemate | undefined;
  const evidence: Record<string, unknown> = { fixtureId: fixture.id };
  let activeStage = "inicialización";
  let testError: unknown;

  const saveProgress = async () => {
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  };

  const stage = async <T>(name: string, action: () => Promise<T>, timeout: number) => {
    activeStage = name;
    const result = await test.step(name, action, { timeout });
    evidence.lastCompletedStage = name;
    await saveProgress();
    return result;
  };

  try {
    await test.step(
      "WEB-010 flujo verificable",
      async () => {
        await stage(
          "recuperar por UUID un fixture pendiente y capturar la línea base",
          async () => {
            await ensureAdminSession(cleanupPage);
            evidence.recoveredPriorFixture = await recoverPendingFixture(cleanupPage, "WEB-010");
            const initialRemates = await listAdminRemates(cleanupPage);
            expect(initialRemates).toHaveLength(6);
            originalIds = initialRemates.map(({ id }) => id).sort();
            permanentBefore = permanentFixtureSnapshot(initialRemates);
            evidence.initialRemateCount = initialRemates.length;
            evidence.initialVersion = fixture.version;
            evidence.initialState = fixture.estadoAdmin;
          },
          25_000,
        );

        await stage(
          "autenticar dos contextos editor independientes",
          async () => {
            await Promise.all([loginAsQaEditor(adminPageA), loginAsQaEditor(adminPageB)]);
            const [roleA, roleB] = await Promise.all([
              sessionRole(adminPageA),
              sessionRole(adminPageB),
            ]);
            expect(roleA).toBe("editor");
            expect(roleB).toBe("editor");
            expect(contextA).not.toBe(contextB);
            evidence.independentContexts = true;
            evidence.roles = { contextA: roleA, contextB: roleB };
          },
          25_000,
        );

        await stage(
          "registrar el fixture antes de crearlo y verificar su versión inicial",
          async () => {
            await writeFixtureJournal("WEB-010", fixtureIdentity(fixture), "planned");
            fixtureWriteAttempted = true;
            const created = await adminRequest<{ status: string; remate: AdminRemate }>(
              adminPageA,
              "POST",
              { remate: fixture },
            );
            expect(created.status).toBe(200);
            expect(created.data?.status).toBe("saved");
            createdRemate = created.data!.remate;
            expect(createdRemate.id).toBe(fixture.id);
            expect(createdRemate.version).toBeGreaterThan(fixture.version);
            await writeFixtureJournal(
              "WEB-010",
              fixtureIdentity(fixture),
              "created",
              createdRemate.version,
            );
            evidence.createdVersion = createdRemate.version;
          },
          15_000,
        );

        await stage(
          "leer el valor inicial desde el contexto B",
          async () => {
            await publicPageB.goto(`/remates/${fixture.slug}`, { waitUntil: "domcontentloaded" });
            await expect(
              publicPageB.getByRole("heading", { level: 1, name: fixture.titulo, exact: true }),
            ).toBeVisible();
            await expect(publicPageB.getByText(fixture.subtitulo, { exact: true })).toBeVisible();
            expect(await publicRemate(publicPageB, fixture.id)).toMatchObject({
              id: fixture.id,
              slug: fixture.slug,
              subtitulo: fixture.subtitulo,
            });
          },
          20_000,
        );

        await stage(
          "guardar desde la UI del contexto A y releer el servidor",
          async () => {
            expect(createdRemate).toBeTruthy();
            await selectAdminSection(adminPageA, "Remates", "Todos los remates");
            await adminPageA
              .locator("tbody tr", { hasText: fixture.titulo })
              .getByRole("button", { name: "Editar", exact: true })
              .click();
            await editorInput(adminPageA, "Subtítulo *").fill(updatedSubtitle);
            const [savedResponse] = await Promise.all([
              adminPageA.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === "/api/v1/admin/remates" &&
                  response.request().method() === "POST",
                { timeout: 15_000 },
              ),
              adminPageA.getByRole("button", { name: "Guardar cambios", exact: true }).click(),
            ]);
            const savedPayload = await savedResponse.json();
            const savedRemate = savedPayload?.data?.remate as AdminRemate | undefined;
            expect(savedResponse.status()).toBe(200);
            expect(savedPayload?.data?.status).toBe("saved");
            expect(savedRemate).toMatchObject({ id: fixture.id, subtitulo: updatedSubtitle });
            expect(savedRemate!.version).toBeGreaterThan(createdRemate!.version);

            persistedA = (await listAdminRemates(adminPageA)).find(({ id }) => id === fixture.id);
            expect(persistedA).toMatchObject({
              id: fixture.id,
              subtitulo: updatedSubtitle,
              version: savedRemate!.version,
            });
            await writeFixtureJournal(
              "WEB-010",
              fixtureIdentity(fixture),
              "updated",
              persistedA!.version,
            );
            evidence.contextAServerRead = {
              idMatches: persistedA!.id === fixture.id,
              version: persistedA!.version,
              valueMatches: persistedA!.subtitulo === updatedSubtitle,
            };
          },
          25_000,
        );

        await stage(
          "recargar el contexto B y verificar ID, versión y valor del servidor",
          async () => {
            expect(createdRemate).toBeTruthy();
            expect(persistedA).toBeTruthy();
            await expect(publicPageB.getByText(fixture.subtitulo, { exact: true })).toBeVisible();
            await expect(publicPageB.getByText(updatedSubtitle, { exact: true })).toHaveCount(0);
            const [publicResponse] = await Promise.all([
              publicPageB.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === "/api/v1/public/remates" &&
                  response.request().method() === "GET",
                { timeout: 15_000 },
              ),
              publicPageB.reload({ waitUntil: "domcontentloaded" }),
            ]);
            expect(publicResponse.ok()).toBe(true);
            await expect(publicPageB.getByText(updatedSubtitle, { exact: true })).toBeVisible();
            const publicAfter = await publicRemate(publicPageB, fixture.id);
            expect(publicAfter).toMatchObject({ id: fixture.id, subtitulo: updatedSubtitle });

            const persistedB = (await listAdminRemates(adminPageB)).find(
              ({ id }) => id === fixture.id,
            );
            expect(persistedB).toMatchObject({
              id: fixture.id,
              version: persistedA!.version,
              subtitulo: updatedSubtitle,
            });
            evidence.synchronization = {
              sameId: publicAfter?.id === fixture.id && persistedB!.id === fixture.id,
              createdVersion: createdRemate!.version,
              updatedVersion: persistedA!.version,
              contextBVersionMatches: persistedB!.version === persistedA!.version,
              staleBeforeReload: true,
              updatedAfterReload: true,
            };
            await publicPageB.screenshot({
              path: resolve(evidenceDir, "WEB-010-contexto-b-actualizado.png"),
              fullPage: true,
            });
          },
          25_000,
        );
      },
      { timeout: 100_000 },
    );
  } catch (error) {
    evidence.failedStage = activeStage;
    await saveProgress();
    testError = error;
  }

  let cleanupError: unknown;
  try {
    await test.step(
      "limpiar por UUID y comprobar la restauración de la línea base",
      async () => {
        if (fixtureWriteAttempted && permanentBefore) {
          evidence.cleanup = await cleanupFixture(
            cleanupPage,
            "WEB-010",
            fixture,
            originalIds,
            permanentBefore,
          );
        }
        await saveProgress();
      },
      { timeout: 35_000 },
    );
  } catch (error) {
    persistentOperationsSafe = false;
    evidence.cleanupFailed = true;
    await saveProgress();
    cleanupError = error;
  }
  await Promise.allSettled([contextA.close(), contextB.close(), cleanupContext.close()]);
  if (cleanupError) throw cleanupError;
  if (testError) throw testError;
});
