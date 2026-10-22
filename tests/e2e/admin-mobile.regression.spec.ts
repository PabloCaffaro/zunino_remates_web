import { expect, test } from "@playwright/test";
import {
  loginAsQaAdmin,
  openAdminMenu,
  openQaRemateEditor,
  selectAdminSection,
} from "./helpers/admin";
import { assertQaAdminCredentials } from "./helpers/qa-credentials";

test.use({
  viewport: { width: 390, height: 844 },
});

test.describe("@regression panel administrativo móvil", () => {
  test.beforeAll(() => {
    assertQaAdminCredentials();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsQaAdmin(page);
  });

  test("MOB-004 navega por menú, listado, editor y contenido", async ({ page }) => {
    const toggle = await openAdminMenu(page);
    await page.locator("#admin-navigation").getByRole("button", { name: "Remates", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Todos los remates", exact: true })).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    const row = page.locator("tr", { hasText: "QA BORRAR Validación fotos" });
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Volver al listado", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Volver al listado", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Todos los remates", exact: true })).toBeVisible();

    await selectAdminSection(page, "Contenido general", "Textos y datos de la empresa");
    await selectAdminSection(page, "Resumen", "Resumen de contenidos");
  });

  test("MOB-008 conserva transiciones, abre el sitio público y cierra sesión", async ({ page }) => {
    await selectAdminSection(page, "Remates", "Todos los remates");
    await selectAdminSection(page, "Contenido general", "Textos y datos de la empresa");
    await selectAdminSection(page, "Resumen", "Resumen de contenidos");

    await openAdminMenu(page);
    const adminOrigin = new URL(page.url()).origin;
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#admin-navigation").getByRole("link", { name: "Ver sitio público", exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    expect(new URL(popup.url()).origin).toBe(adminOrigin);
    await popup.close();

    await page.locator("#admin-navigation").getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ingresar al panel" })).toBeVisible();
  });

  test("MOB-013 adapta menú y backdrop al cambiar de breakpoint", async ({ page }) => {
    const toggle = await openAdminMenu(page);
    const sidebar = page.locator("#admin-navigation");
    const closeButton = sidebar.locator(".admin-sidebar-close");
    const backdrop = page.locator(".admin-sidebar-backdrop");

    await expect(closeButton).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 844 });
    await expect(closeButton).toBeHidden();
    await expect(backdrop).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(backdrop).toBeHidden();
  });

  test("MOB-014 mantiene editor y acciones accesibles en anchos móviles", async ({ page }) => {
    await openQaRemateEditor(page);

    for (const width of [320, 390, 456]) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(250);

        const metrics = await page.evaluate(() => {
          const root = document.documentElement;
          const viewport = root.clientWidth;
          const ignoredElements = [
            document.querySelector<HTMLElement>(".admin-sidebar:not(.is-open)"),
            ...document.querySelectorAll<HTMLElement>(".admin-field-tooltip"),
          ].filter((element): element is HTMLElement => Boolean(element));
          const originalStyles = ignoredElements.map((element) => element.getAttribute("style"));
          const rawScrollWidth = root.scrollWidth;

          for (const element of ignoredElements) element.style.setProperty("display", "none", "important");

          const activeScrollWidth = root.scrollWidth;
          const activeOverflow = [...document.querySelectorAll("body *")]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                className: typeof element.className === "string" ? element.className : "",
                id: element.id,
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              };
            })
            .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewport + 1))
            .slice(0, 30);

          ignoredElements.forEach((element, index) => {
            const originalStyle = originalStyles[index];
            if (originalStyle === null) element.removeAttribute("style");
            else element.setAttribute("style", originalStyle);
          });

          return { rawScrollWidth, activeScrollWidth, clientWidth: viewport, activeOverflow };
        });

        const actions = page.locator(".admin-editor-actions");
        await actions.scrollIntoViewIfNeeded();
        const actionBox = await actions.boundingBox();
        const dropzone = page.locator(".admin-lot-dropzone");
        await dropzone.scrollIntoViewIfNeeded();
        const dropzoneBox = await dropzone.boundingBox();

        expect.soft(metrics.activeScrollWidth, `scroll horizontal activo a ${width}px`).toBeLessThanOrEqual(metrics.clientWidth);
        expect.soft(metrics.activeOverflow, `elementos activos fuera del viewport a ${width}px`).toEqual([]);
        expect.soft(actionBox, `acciones visibles a ${width}px`).not.toBeNull();
        expect.soft(dropzoneBox, `dropzone visible a ${width}px`).not.toBeNull();
        if (actionBox) {
          expect.soft(actionBox.x, `acciones comienzan dentro de ${width}px`).toBeGreaterThanOrEqual(0);
          expect.soft(actionBox.x + actionBox.width, `acciones terminan dentro de ${width}px`).toBeLessThanOrEqual(width);
        }
        if (dropzoneBox) {
          expect.soft(dropzoneBox.x, `dropzone comienza dentro de ${width}px`).toBeGreaterThanOrEqual(0);
          expect.soft(dropzoneBox.x + dropzoneBox.width, `dropzone termina dentro de ${width}px`).toBeLessThanOrEqual(width);
        }
      });
    }
  });
});
