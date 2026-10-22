import { defineConfig } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

loadEnvFile(resolve(process.cwd(), ".env.local"));

export const DEFAULT_PREVIEW_URL =
  "https://zunino-remates-33muv478x-pablocaffaros-projects.vercel.app/";
export const EXPECTED_PREVIEW_SHA = "7b5e179383e8c1dff0d112e30dfd82f994fb0493";
export const VERCEL_STORAGE_STATE = resolve(process.cwd(), ".playwright", "vercel-bypass.json");

const baseURL = process.env.E2E_BASE_URL ?? DEFAULT_PREVIEW_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "line",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  metadata: { expectedPreviewSha: EXPECTED_PREVIEW_SHA },
  use: {
    baseURL,
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    storageState: VERCEL_STORAGE_STATE,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
});
