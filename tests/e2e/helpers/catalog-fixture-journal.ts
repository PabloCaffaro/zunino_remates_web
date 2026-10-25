import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type CatalogFixtureJournal = {
  batch: "CATALOG-BATCH-6";
  fixture: {
    id: string;
    slug: string;
    title: string;
  };
  status: "planned" | "created" | "published" | "cleanup-pending" | "deleted" | "absent";
  serverVersion?: number;
  storagePaths: string[];
  originalIds: string[];
  updatedAt: string;
};

const journalPath = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "fixture-journals",
  "CATALOG-BATCH-6.json",
);

function assertSafeJournal(journal: CatalogFixtureJournal) {
  if (journal.batch !== "CATALOG-BATCH-6") throw new Error("El journal corresponde a otra tanda.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(journal.fixture.id)) {
    throw new Error("El fixture de catálogo no tiene un UUID v4 válido.");
  }
  if (!journal.fixture.title.startsWith("QA CATÁLOGO TEMPORAL ")) {
    throw new Error("El fixture no utiliza el nombre seguro de la tanda.");
  }
  if (!journal.fixture.slug.startsWith("qa-catalogo-temporal-")) {
    throw new Error("El fixture no utiliza el slug seguro de la tanda.");
  }
  if (journal.originalIds.includes(journal.fixture.id)) {
    throw new Error("El UUID temporal coincide con el inventario original.");
  }
  if (journal.storagePaths.some((path) => !path.startsWith(`${journal.fixture.id}/`))) {
    throw new Error("El journal contiene una ruta de Storage ajena al fixture.");
  }
}
export async function readCatalogFixtureJournal() {
  try {
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as CatalogFixtureJournal;
    assertSafeJournal(journal);
    return journal;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
export async function writeCatalogFixtureJournal(
  journal: Omit<CatalogFixtureJournal, "batch" | "updatedAt">,
) {
  const value: CatalogFixtureJournal = {
    batch: "CATALOG-BATCH-6",
    ...journal,
    updatedAt: new Date().toISOString(),
  };
  assertSafeJournal(value);
  await mkdir(resolve(journalPath, ".."), { recursive: true });
  await writeFile(journalPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return value;
}
