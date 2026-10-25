import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adminApiRequest, loginAsQaAdmin } from "./helpers/admin";
import {
  isPendingFixtureJournal,
  readFixtureJournal,
  writeFixtureJournal,
  type QaFixtureIdentity,
  type QaFixtureJournal,
} from "./helpers/qa-fixture-journal";

type AdminLot = {
  id: string;
  nombre: string;
  storagePath: string;
  imagen: { url: string; alt: string };
};

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
  enlace: string;
  catalogoEstado: string;
  descripcionLarga: string;
  destacados: AdminLot[];
  requisitos: string[];
  condiciones: string[];
  estadoAdmin: "borrador" | "en_revision" | "publicado" | "oculto" | "finalizado" | "cancelado";
  catalogoPublicacionEstado: "disponible" | "preliminar" | "proximamente";
};

type SaveResult = {
  status: "saved" | "conflict";
  remate?: AdminRemate;
  current?: AdminRemate;
  storageCleanupPending?: boolean;
};

const caseId = "API-016";
const permanentPhotoFixtureId = "94000000-0000-4000-8000-000000000001";
const evidenceDir = resolve(process.cwd(), "docs", "qa", "evidence", "2026-10-24", "api-016-2657ae5");
const imageAPath = resolve(process.cwd(), "docs", "qa", "fixtures", "catalog-batch-6", "qa-toolbox.png");
const imageBPath = resolve(process.cwd(), "docs", "qa", "fixtures", "catalog-batch-6", "qa-tractor.png");

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

async function listRemates(page: Page) {
  const result = await adminApiRequest<AdminRemate[]>(page, "GET");
  expect(result.ok, "lectura administrativa").toBe(true);
  expect(Array.isArray(result.data)).toBe(true);
  return result.data!;
}

function identity(remate: Pick<AdminRemate, "id" | "slug" | "titulo">): QaFixtureIdentity {
  return { id: remate.id, slug: remate.slug, title: remate.titulo };
}

function fixtureBody(id: string, imageA: string): AdminRemate {
  const shortId = id.slice(0, 8);
  return {
    id,
    version: 0,
    slug: `qa-borrar-api-016-${shortId}`,
    fechaHora: null,
    fechaPorConfirmar: true,
    titulo: `QA BORRAR API-016 ${shortId}`,
    subtitulo: "Rollback real de imagen ante conflicto",
    lugar: "Predio QA",
    ubicacionDetalle: "Ubicación sintética",
    detalle: "Estado coherente previo al conflicto.",
    enlace: "",
    catalogoEstado: "Catálogo QA",
    descripcionLarga: "Fixture descartable sin operaciones comerciales.",
    destacados: [{
      id: randomUUID(),
      nombre: "Imagen A persistente",
      storagePath: "",
      imagen: { url: imageA, alt: "Imagen sintética A" },
    }],
    requisitos: ["Sin uso comercial"],
    condiciones: ["Fixture temporal"],
    estadoAdmin: "borrador",
    catalogoPublicacionEstado: "proximamente",
  };
}

function permanentSnapshot(remates: AdminRemate[]) {
  const permanent = remates.find(({ id }) => id === permanentPhotoFixtureId);
  expect(permanent, "fixture fotográfico permanente").toBeTruthy();
  return {
    id: permanent!.id,
    version: permanent!.version,
    estadoAdmin: permanent!.estadoAdmin,
    paths: permanent!.destacados.map(({ storagePath }) => storagePath),
  };
}

async function writeEvidence(stage: string, value: Record<string, unknown>) {
  await writeFile(
    resolve(evidenceDir, "API-016.json"),
    `${JSON.stringify({ caseId, stage, updatedAt: new Date().toISOString(), ...value }, null, 2)}\n`,
    "utf8",
  );
}

async function cleanupExactFixture(page: Page, journal: QaFixtureJournal) {
  if (page.url() === "about:blank") await page.goto("/");
  const role = await page.evaluate(async () => {
    const response = await fetch("/api/v1/admin/session", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "X-Requested-With": "zunino-admin" },
    });
    const payload = await response.json();
    return response.ok ? payload?.data?.user?.rol ?? null : null;
  });
  if (role !== "administrador") await loginAsQaAdmin(page);
  const before = await listRemates(page);
  const current = before.find(({ id }) => id === journal.fixture.id);
  if (!current) {
    await writeFixtureJournal(caseId, journal.fixture, "absent", journal.serverVersion, {
      initialVersion: journal.initialVersion,
      storagePaths: journal.storagePaths,
      rolledBackStoragePaths: journal.rolledBackStoragePaths,
      originalIds: journal.originalIds,
      conflictHttpStatus: journal.conflictHttpStatus,
      storageCleanupPending: journal.storageCleanupPending,
    });
    return { deleted: false, finalCount: before.length };
  }
  expect(current.titulo).toBe(journal.fixture.title);
  expect(journal.originalIds).not.toContain(current.id);
  await writeFixtureJournal(caseId, journal.fixture, "cleanup-pending", current.version, {
    initialVersion: journal.initialVersion,
    storagePaths: journal.storagePaths,
    rolledBackStoragePaths: journal.rolledBackStoragePaths,
    originalIds: journal.originalIds,
    conflictHttpStatus: journal.conflictHttpStatus,
    storageCleanupPending: journal.storageCleanupPending,
  });
  const deletion = await adminApiRequest<SaveResult>(page, "DELETE", { id: current.id, version: current.version });
  expect(deletion.status).toBe(200);
  expect(deletion.data?.status).toBe("saved");
  expect(deletion.data?.storageCleanupPending).not.toBe(true);
  const after = await listRemates(page);
  expect(after.map(({ id }) => id).sort()).toEqual(journal.originalIds);
  expect(permanentSnapshot(after)).toEqual(permanentSnapshot(before.filter(({ id }) => id !== current.id)));
  await writeFixtureJournal(caseId, journal.fixture, "deleted", current.version, {
    initialVersion: journal.initialVersion,
    storagePaths: journal.storagePaths,
    rolledBackStoragePaths: journal.rolledBackStoragePaths,
    originalIds: journal.originalIds,
    conflictHttpStatus: journal.conflictHttpStatus,
    storageCleanupPending: journal.storageCleanupPending,
  });
  return { deleted: true, finalCount: after.length };
}

test("@regression API-016 rollback real de imagen ante conflicto de versión", async ({ browser, context, page }) => {
  test.setTimeout(120_000);
  const bootstrapState = await context.storageState();
  const cleanupContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
    storageState: bootstrapState,
    viewport: { width: 1280, height: 900 },
  });
  const cleanupPage = await cleanupContext.newPage();
  let completed = false;
  let journal: QaFixtureJournal | null = null;

  try {
    await test.step("preparar sesiones administrativas independientes", async () => {
      await Promise.all([loginAsQaAdmin(page), loginAsQaAdmin(cleanupPage)]);
      const previous = await readFixtureJournal(caseId);
      if (isPendingFixtureJournal(previous)) await cleanupExactFixture(cleanupPage, previous);
      const closed = await readFixtureJournal(caseId);
      expect(!closed || !isPendingFixtureJournal(closed), "no debe quedar un fixture anterior pendiente").toBe(true);
    });

    const original = await listRemates(page);
    const originalIds = original.map(({ id }) => id).sort();
    const permanentBefore = permanentSnapshot(original);
    expect(original).toHaveLength(6);
    expect(permanentBefore).toMatchObject({ version: 9, estadoAdmin: "publicado" });

    const imageA = `data:image/png;base64,${(await readFile(imageAPath)).toString("base64")}`;
    const imageB = `data:image/png;base64,${(await readFile(imageBPath)).toString("base64")}`;
    const fixture = fixtureBody(randomUUID(), imageA);
    journal = await writeFixtureJournal(caseId, identity(fixture), "planned", undefined, { originalIds, storagePaths: [] });
    await writeEvidence("planned", { fixtureId: fixture.id, originalCount: original.length });

    const created = await test.step("guardar imagen A y registrar la versión N", async () =>
      adminApiRequest<SaveResult>(page, "POST", { remate: fixture }));
    expect(created.status).toBe(200);
    expect(created.data?.status).toBe("saved");
    expect(created.data?.storageCleanupPending).not.toBe(true);
    const saved = created.data!.remate!;
    expect(saved.destacados).toHaveLength(1);
    const versionN = saved.version;
    const pathA = saved.destacados[0].storagePath;
    expect(pathA.startsWith(`${fixture.id}/`)).toBe(true);
    journal = await writeFixtureJournal(caseId, identity(saved), "created", versionN, {
      initialVersion: versionN,
      storagePaths: [pathA],
      originalIds,
    });
    await writeEvidence("image-a-persisted", { fixtureId: fixture.id, versionN, pathA, relationCount: 1 });

    const advanced = await test.step("incrementar legítimamente a N+1", async () =>
      adminApiRequest<SaveResult>(page, "PATCH", { id: fixture.id, version: versionN, status: "en_revision" }));
    expect(advanced.status).toBe(200);
    expect(advanced.data?.status).toBe("saved");
    const versionN1 = advanced.data!.remate!.version;
    expect(versionN1).toBe(versionN + 1);
    journal = await writeFixtureJournal(caseId, identity(saved), "updated", versionN1, {
      initialVersion: versionN,
      storagePaths: [pathA],
      originalIds,
    });
    await writeEvidence("version-advanced", { fixtureId: fixture.id, versionN, versionN1, pathA });

    const stalePayload: AdminRemate = {
      ...advanced.data!.remate!,
      version: versionN,
      detalle: "Este valor obsoleto nunca debe persistirse.",
      destacados: [
        advanced.data!.remate!.destacados[0],
        {
          id: randomUUID(),
          nombre: "Imagen B para rollback",
          storagePath: "",
          imagen: { url: imageB, alt: "Imagen sintética B" },
        },
      ],
    };
    const conflict = await test.step("enviar imagen B con la versión obsoleta N", async () =>
      adminApiRequest<SaveResult>(page, "POST", { remate: stalePayload }));
    expect(conflict.status).toBe(409);
    expect(conflict.data?.status).toBe("conflict");
    expect(conflict.data?.storageCleanupPending).not.toBe(true);
    expect(conflict.data?.current?.version).toBe(versionN1);

    const current = (await listRemates(page)).find(({ id }) => id === fixture.id);
    expect(current).toBeTruthy();
    expect(current).toMatchObject({
      id: fixture.id,
      version: versionN1,
      estadoAdmin: "en_revision",
      detalle: saved.detalle,
    });
    expect(current!.destacados).toHaveLength(1);
    expect(current!.destacados[0].storagePath).toBe(pathA);
    expect(permanentSnapshot(await listRemates(page))).toEqual(permanentBefore);
    journal = await writeFixtureJournal(caseId, identity(saved), "conflict-verified", versionN1, {
      initialVersion: versionN,
      storagePaths: [pathA],
      originalIds,
      conflictHttpStatus: conflict.status,
      storageCleanupPending: false,
    });
    await writeEvidence("conflict-verified", {
      fixtureId: fixture.id,
      versionN,
      versionN1,
      conflictHttpStatus: conflict.status,
      storageCleanupPending: false,
      persistedPaths: [pathA],
      imageBReferenced: false,
      staleDataPersisted: false,
    });
    completed = true;
  } finally {
    if (!completed && journal) await cleanupExactFixture(cleanupPage, journal);
    await cleanupContext.close();
  }
});

test("@regression API-016 cleanup exacto del fixture verificado", async ({ page }) => {
  test.setTimeout(60_000);
  const journal = await readFixtureJournal(caseId);
  expect(journal?.status).toBe("conflict-verified");
  if (!journal) return;
  const cleanup = await test.step("eliminar exclusivamente el UUID registrado", async () =>
    cleanupExactFixture(page, journal));
  await writeEvidence("deleted", {
    fixtureId: journal.fixture.id,
    initialVersion: journal.initialVersion,
    finalVersion: journal.serverVersion,
    registeredPaths: journal.storagePaths,
    deleted: cleanup.deleted,
    finalRemateCount: cleanup.finalCount,
  });
});
