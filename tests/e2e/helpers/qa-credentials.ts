import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_CREDENTIALS = ["QA_ADMIN_EMAIL", "QA_ADMIN_PASSWORD"] as const;
const EDITOR_CREDENTIALS = ["QA_EDITOR_EMAIL", "QA_EDITOR_PASSWORD"] as const;
const ALL_CREDENTIALS = [...ADMIN_CREDENTIALS, ...EDITOR_CREDENTIALS] as const;

function readLiteralEnvFile(filePath: string) {
  const entries = new Map<string, string>();
  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r\n|\n|\r/)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue;
    const separator = line.indexOf("=");
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }

  return entries;
}

export function loadQaCredentials() {
  const filePath = resolve(process.cwd(), ".qa-credentials.local");
  if (!existsSync(filePath)) return;

  const entries = readLiteralEnvFile(filePath);
  for (const name of ALL_CREDENTIALS) {
    if (process.env[name] === undefined && entries.has(name)) {
      process.env[name] = entries.get(name);
    }
  }
}

export function getQaAdminCredentials() {
  loadQaCredentials();
  const missing = ADMIN_CREDENTIALS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables QA obligatorias: ${missing.join(", ")}.`);
  }

  return {
    email: process.env.QA_ADMIN_EMAIL!,
    password: process.env.QA_ADMIN_PASSWORD!,
  };
}

export function assertQaAdminCredentials() {
  getQaAdminCredentials();
}

export function getQaEditorCredentials() {
  loadQaCredentials();
  const missing = EDITOR_CREDENTIALS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables QA obligatorias: ${missing.join(", ")}.`);
  }

  return {
    email: process.env.QA_EDITOR_EMAIL!,
    password: process.env.QA_EDITOR_PASSWORD!,
  };
}

export function assertQaEditorCredentials() {
  getQaEditorCredentials();
}
