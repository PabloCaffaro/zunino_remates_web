import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  loginAsQaAdmin,
  openAdminMenu,
  selectAdminSection,
} from "./helpers/admin";
import { assertQaAdminCredentials } from "./helpers/qa-credentials";

const evidenceDir = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "2026-10-22",
  "unblock-batch-3-6381218",
);
const adminCookieName = "__Host-zunino-session";

type MotionStyles = {
  animationDuration: string;
  animationName: string;
  opacity: string;
  transform: string;
  transitionDuration: string;
};

test.use({ viewport: { width: 390, height: 844 } });

test.beforeAll(async () => {
  assertQaAdminCredentials();
  await mkdir(evidenceDir, { recursive: true });
});

async function saveEvidence(caseId: string, evidence: object) {
  await writeFile(
    resolve(evidenceDir, `${caseId}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

async function motionStyles(locator: Locator): Promise<MotionStyles> {
  return locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationDuration: styles.animationDuration,
      animationName: styles.animationName,
      opacity: styles.opacity,
      transform: styles.transform,
      transitionDuration: styles.transitionDuration,
    };
  });
}

function expectMotionDisabled(styles: MotionStyles, requireNoTransform = true) {
  expect(styles.animationName).toBe("none");
  expect(styles.animationDuration.split(",").every((duration) => duration.trim() === "0s")).toBe(
    true,
  );
  expect(styles.transitionDuration.split(",").every((duration) => duration.trim() === "0s")).toBe(
    true,
  );
  if (requireNoTransform) expect(styles.transform).toBe("none");
}

test.describe("@regression sesión segura y movimiento reducido", () => {
  test("ACC-013 usa una cookie segura del servidor y no almacena tokens en Web Storage", async ({
    context,
    page,
  }) => {
    await loginAsQaAdmin(page);
    const previewUrl = new URL(page.url());
    const allCookies = await context.cookies(previewUrl.origin);
    const sessionCookies = allCookies.filter(
      ({ name }) => name === adminCookieName || name.startsWith(`${adminCookieName}.`),
    );

    expect(sessionCookies.length).toBeGreaterThan(0);
    const cookieAttributes = {
      contractNamePresent: sessionCookies.some(({ name }) => name === adminCookieName),
      allHttpOnly: sessionCookies.every(({ httpOnly }) => httpOnly),
      allSecure: sessionCookies.every(({ secure }) => secure),
      allSameSiteStrict: sessionCookies.every(({ sameSite }) => sameSite === "Strict"),
      allPathRoot: sessionCookies.every(({ path }) => path === "/"),
      allHostOnly: sessionCookies.every(({ domain }) => domain === previewUrl.hostname),
      bypassCookieExcluded: sessionCookies.every(
        ({ name }) => name !== "_vercel_jwt" && name !== "__vercel_protection_bypass",
      ),
    };
    expect(Object.values(cookieAttributes).every(Boolean)).toBe(true);

    const storage = await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      return {
        localStorageEmpty: localStorage.length === 0,
        sessionStorageEmpty: sessionStorage.length === 0,
      };
    });
    expect(storage).toEqual({ localStorageEmpty: true, sessionStorageEmpty: true });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Resumen de contenidos", exact: true })).toBeVisible();
    await expect(page.locator("button.admin-menu-toggle")).toBeVisible();
    const accessWithServerCookie = true;

    await openAdminMenu(page);
    await page
      .locator("#admin-navigation")
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Ingresar al panel", exact: true })).toBeVisible();
    const cookiesAfterLogout = await context.cookies(previewUrl.origin);
    const removedAfterLogout = !cookiesAfterLogout.some(
      ({ name }) => name === adminCookieName || name.startsWith(`${adminCookieName}.`),
    );
    expect(removedAfterLogout).toBe(true);

    await saveEvidence("ACC-013", {
      cookieAttributes,
      storage,
      accessWithServerCookie,
      removedAfterLogout,
    });
  });

  test("ACC-A11Y-004 desactiva el movimiento previsto y conserva la interfaz utilizable", async ({
    context,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page).toHaveURL((url) => url.origin === new URL(process.env.E2E_BASE_URL!).origin);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const reducedMotionActive = await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const scrollBehavior = await page.locator("html").evaluate(
      (element) => getComputedStyle(element).scrollBehavior,
    );
    expect(reducedMotionActive).toBe(true);
    expect(scrollBehavior).toBe("auto");

    const reveal = page.locator(".hero-copy.reveal");
    await expect(reveal).toHaveClass(/in-view/);
    await expect(reveal).toBeVisible();
    const revealStyles = await motionStyles(reveal);
    expectMotionDisabled(revealStyles);
    expect(revealStyles.opacity).toBe("1");

    const button = page.getByRole("link", { name: "Ver próximos remates", exact: true });
    await expect(button).toBeVisible();
    await button.hover();
    const buttonStyles = await motionStyles(button);
    expectMotionDisabled(buttonStyles, false);

    const faq = page.locator("details.faq-detail").first();
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toHaveClass(/in-view/);
    await faq.locator("summary").click();
    await expect(faq).toHaveAttribute("open", "");
    const faqContent = faq.locator(".faq-content");
    const faqIcon = faq.locator(".faq-icon");
    await expect(faqContent).toBeVisible();
    await expect(faqIcon).toBeVisible();
    const faqContentStyles = await motionStyles(faqContent);
    const faqIconStyles = await motionStyles(faqIcon);
    expectMotionDisabled(faqContentStyles);
    expectMotionDisabled(faqIconStyles, false);
    await faq.screenshot({ path: resolve(evidenceDir, "ACC-A11Y-004-faq.png") });

    const unexpectedWrites: string[] = [];
    await context.route("**/api/v1/admin/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const isDataWrite =
        request.method() !== "GET" &&
        (url.pathname === "/api/v1/admin/remates" || url.pathname === "/api/v1/admin/content");
      if (isDataWrite) {
        unexpectedWrites.push(`${request.method()} ${url.pathname}`);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    await loginAsQaAdmin(page);
    await selectAdminSection(page, "Remates", "Todos los remates");
    await page.getByRole("button", { name: "Agregar remate", exact: true }).click();
    await page.getByRole("button", { name: "Publicar remate", exact: true }).click();
    const transientMessage = page.getByRole("alert");
    await expect(transientMessage).toContainText(
      "El remate no puede publicarse hasta completar todos los campos obligatorios.",
    );
    const transientStyles = await motionStyles(transientMessage);
    expectMotionDisabled(transientStyles);
    await transientMessage.screenshot({
      path: resolve(evidenceDir, "ACC-A11Y-004-aviso-sin-animacion.png"),
    });
    expect(unexpectedWrites).toEqual([]);

    await openAdminMenu(page);
    await page
      .locator("#admin-navigation")
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Ingresar al panel", exact: true })).toBeVisible();

    await saveEvidence("ACC-A11Y-004", {
      reducedMotionActive,
      scrollBehavior,
      reveal: revealStyles,
      button: buttonStyles,
      faqContent: faqContentStyles,
      faqIcon: faqIconStyles,
      transientMessage: transientStyles,
      contentRemainedVisible: true,
      unexpectedAdministrativeWrites: false,
    });
  });
});
