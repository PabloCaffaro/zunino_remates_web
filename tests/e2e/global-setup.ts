import { request, type FullConfig } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { VERCEL_STORAGE_STATE } from "../../playwright.config";

const BYPASS_HEADER = "x-vercel-protection-bypass";
const SET_COOKIE_HEADER = "x-vercel-set-bypass-cookie";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (typeof baseURL !== "string") {
    throw new Error("E2E_BASE_URL no está configurada.");
  }
  if (!bypassSecret) {
    throw new Error("Falta VERCEL_AUTOMATION_BYPASS_SECRET en .env.local.");
  }

  const previewURL = new URL(baseURL);
  if (
    previewURL.protocol !== "https:" ||
    previewURL.username ||
    previewURL.password ||
    !previewURL.hostname.endsWith(".vercel.app")
  ) {
    throw new Error("E2E_BASE_URL debe ser una URL HTTPS de vercel.app sin credenciales.");
  }

  const previewOrigin = previewURL.origin;
  const http = await request.newContext({ baseURL: previewOrigin });

  try {
    // La cabecera secreta vive solamente en esta solicitud, dirigida al origen
    // validado. El navegador reutiliza la cookie y nunca recibe la cabecera.
    const cookieResponse = await http.get(previewURL.toString(), {
      headers: {
        [BYPASS_HEADER]: bypassSecret,
        [SET_COOKIE_HEADER]: "true",
      },
      maxRedirects: 0,
    });

    if (cookieResponse.status() < 200 || cookieResponse.status() >= 400) {
      throw new Error(`Vercel rechazó la preparación del bypass (HTTP ${cookieResponse.status()}).`);
    }

    const accessResponse = await http.get(previewURL.toString());
    const finalURL = new URL(accessResponse.url());
    if (!accessResponse.ok() || finalURL.origin !== previewOrigin) {
      throw new Error(`El Preview no quedó accesible con la cookie (HTTP ${accessResponse.status()}).`);
    }

    const state = await http.storageState();
    const hasBypassCookie = state.cookies.some(
      (cookie) => cookie.name === "_vercel_jwt" || cookie.name === "__vercel_protection_bypass",
    );
    if (!hasBypassCookie) {
      throw new Error("Vercel no devolvió una cookie de bypass reconocible.");
    }

    await mkdir(dirname(VERCEL_STORAGE_STATE), { recursive: true });
    await http.storageState({ path: VERCEL_STORAGE_STATE });
    console.log(`[e2e] Preview accesible por HTTP con cookie de bypass: ${accessResponse.status()} ${previewOrigin}`);
  } finally {
    await http.dispose();
  }

  return async () => {
    await rm(VERCEL_STORAGE_STATE, { force: true });
  };
}
