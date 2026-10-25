import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type QaFixtureIdentity = {
  id: string;
  slug: string;
  title: string;
};

export type QaFixtureJournal = {
  caseId: string;
  fixture: QaFixtureIdentity;
  status: "planned" | "created" | "updated" | "conflict-verified" | "cleanup-pending" | "deleted" | "absent";
  serverVersion?: number;
  initialVersion?: number;
  storagePaths?: string[];
  rolledBackStoragePaths?: string[];
  originalIds?: string[];
  conflictHttpStatus?: number;
  storageCleanupPending?: boolean;
  updatedAt: string;
};

const journalDirectory = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "fixture-journals",
);

function assertSafeIdentity(caseId: string, fixture: QaFixtureIdentity) {
  if (!/^[A-Z]+(?:-[A-Z0-9]+)+$/.test(caseId)) {
    throw new Error("El identificador del caso QA no es válido para el registro de fixtures.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fixture.id)) {
    throw new Error("El fixture QA no tiene un UUID v4 válido.");
  }
  if (!fixture.title.startsWith(`QA BORRAR ${caseId} `)) {
    throw new Error("El fixture QA no utiliza el nombre seguro esperado.");
  }
  if (!fixture.slug.startsWith(`qa-borrar-${caseId.toLowerCase()}-`)) {
    throw new Error("El fixture QA no utiliza el slug seguro esperado.");
  }
}

function journalPath(caseId: string) {
  return resolve(journalDirectory, `${caseId}.json`);
}

export async function readFixtureJournal(caseId: string): Promise<QaFixtureJournal | null> {
  try {
    const journal = JSON.parse(await readFile(journalPath(caseId), "utf8")) as QaFixtureJournal;
    assertSafeIdentity(caseId, journal.fixture);
    if (journal.caseId !== caseId) throw new Error("El registro corresponde a otro caso QA.");
    return journal;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function writeFixtureJournal(
  caseId: string,
  fixture: QaFixtureIdentity,
  status: QaFixtureJournal["status"],
  serverVersion?: number,
  details: Pick<
    QaFixtureJournal,
    "initialVersion" | "storagePaths" | "rolledBackStoragePaths" | "originalIds" | "conflictHttpStatus" | "storageCleanupPending"
  > = {},
) {
  assertSafeIdentity(caseId, fixture);
  if (details.storagePaths?.some((path) => !path.startsWith(`${fixture.id}/`))) {
    throw new Error("El journal contiene una ruta de Storage ajena al fixture.");
  }
  if (details.rolledBackStoragePaths?.some((path) => !path.startsWith(`${fixture.id}/`))) {
    throw new Error("El journal contiene una ruta de rollback ajena al fixture.");
  }
  if (details.originalIds?.includes(fixture.id)) {
    throw new Error("El fixture temporal coincide con el inventario original.");
  }
  await mkdir(journalDirectory, { recursive: true });
  const journal: QaFixtureJournal = {
    caseId,
    fixture,
    status,
    ...(serverVersion === undefined ? {} : { serverVersion }),
    ...details,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(journalPath(caseId), `${JSON.stringify(journal, null, 2)}\n`, "utf8");
  return journal;
}

export function isPendingFixtureJournal(
  journal: QaFixtureJournal | null,
): journal is QaFixtureJournal {
  return journal !== null && journal.status !== "deleted" && journal.status !== "absent";
}
