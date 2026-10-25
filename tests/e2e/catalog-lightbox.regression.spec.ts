import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readCatalogFixtureJournal } from "./helpers/catalog-fixture-journal";

const evidenceDir = resolve(
  process.cwd(),
  "docs",
  "qa",
  "evidence",
  "2026-10-24",
  "unblock-batch-6-2657ae5",
);

type PublicLot = {
  id: string;
  nombre: string;
  imagen: { url: string; alt: string };
};

type PublicRemate = {
  id: string;
  slug: string;
  titulo: string;
  destacados: PublicLot[];
};

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

async function publicRemates(page: Page): Promise<PublicRemate[]> {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/public/remates", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload?.data)) {
      throw new Error("No se pudo consultar la API pública de remates.");
    }
    return payload.data;
  });
}

async function expectActiveLot(
  dialog: Locator,
  lot: PublicLot,
  previousSrc?: string,
) {
  await expect(dialog).toHaveAttribute("aria-label", lot.nombre);
  await expect(dialog.getByRole("heading", { name: lot.nombre, exact: true })).toBeVisible();
  const image = dialog.locator(".lightbox-image");
  await expect(image).toHaveAttribute("src", lot.imagen.url);
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0))
    .toBe(true);
  if (previousSrc) expect(await image.getAttribute("src")).not.toBe(previousSrc);
}

async function expectClosedAndRestored(
  dialog: Locator,
  trigger: Locator,
  baselineOverflow: { body: string; html: string },
) {
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger.page().locator(".lightbox-overlay")).toHaveCount(0);
  await expect
    .poll(() =>
      trigger.page().evaluate(() => ({
        body: getComputedStyle(document.body).overflow,
        html: getComputedStyle(document.documentElement).overflow,
      })),
    )
    .toEqual(baselineOverflow);
}

async function visibleBackdropPoint(overlay: Locator, content: Locator) {
  const overlayBox = await overlay.boundingBox();
  const contentBox = await content.boundingBox();
  expect(overlayBox, "superficie del backdrop").toBeTruthy();
  expect(contentBox, "contenido del lightbox").toBeTruthy();

  const candidates = [
    { x: 8, y: 8 },
    { x: overlayBox!.width - 8, y: 8 },
    { x: 8, y: overlayBox!.height - 8 },
    { x: overlayBox!.width - 8, y: overlayBox!.height - 8 },
  ];
  const point = candidates.find(({ x, y }) => {
    const absoluteX = overlayBox!.x + x;
    const absoluteY = overlayBox!.y + y;
    return !(
      absoluteX >= contentBox!.x &&
      absoluteX <= contentBox!.x + contentBox!.width &&
      absoluteY >= contentBox!.y &&
      absoluteY <= contentBox!.y + contentBox!.height
    );
  });
  expect(point, "el viewport de escritorio debe exponer backdrop fuera del diálogo").toBeTruthy();
  return point!;
}

test("@regression CAT-012 navega y cierra una galería real restaurando el scroll", async ({
  page,
}) => {
  const unexpectedWrites: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/v1/") && request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${url.pathname}`);
    }
  });

  await page.goto("/");
  const remates = await publicRemates(page);
  const journal = await readCatalogFixtureJournal();
  const targetedFixture = journal?.status === "published" ? journal.fixture.id : null;
  const remate = targetedFixture
    ? remates.find(({ id }) => id === targetedFixture)
    : remates.find(
    ({ destacados }) =>
      destacados.length >= 2 &&
      new Set(destacados.map(({ imagen }) => imagen.url)).size === destacados.length,
    );
  if (!remate) {
    if (targetedFixture) throw new Error("El fixture publicado de la tanda no aparece en la API pública.");
    test.skip(true, "El Preview no tiene una galería pública real con dos imágenes distintas.");
    return;
  }
  if (targetedFixture) {
    expect(remate.destacados, "galería real de la tanda").toHaveLength(3);
  }

  await page.goto(`/remates/${remate.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: remate.titulo, exact: true })).toBeVisible();
  const triggers = page.getByRole("button", { name: /^Ver .+ en grande$/ });
  const visibleImageCount = Math.min(3, remate.destacados.length);
  await expect(triggers).toHaveCount(visibleImageCount);
  const galleryImages = page.locator(".lot-highlight-image");
  await expect(galleryImages).toHaveCount(visibleImageCount);
  await expect
    .poll(() =>
      galleryImages.evaluateAll((images) =>
        images.every(
          (image) =>
            image instanceof HTMLImageElement &&
            image.complete &&
            image.naturalWidth > 0 &&
            image.naturalHeight > 0,
        ),
      ),
    )
    .toBe(true);

  const trigger = triggers.first();
  await trigger.scrollIntoViewIfNeeded();
  const dialog = page.getByRole("dialog");
  const baselineOverflow = await page.evaluate(() => ({
    body: getComputedStyle(document.body).overflow,
    html: getComputedStyle(document.documentElement).overflow,
  }));
  const initialSrc = remate.destacados[0].imagen.url;
  await trigger.click();
  await expectActiveLot(dialog, remate.destacados[0]);
  await dialog.screenshot({ path: resolve(evidenceDir, "CAT-012-imagen-seleccionada.png") });

  await dialog.getByRole("button", { name: "Ver imagen siguiente", exact: true }).click();
  await expectActiveLot(dialog, remate.destacados[1], initialSrc);
  await dialog.screenshot({ path: resolve(evidenceDir, "CAT-012-imagen-siguiente.png") });
  await dialog.getByRole("button", { name: "Ver imagen anterior", exact: true }).click();
  await expectActiveLot(dialog, remate.destacados[0]);

  await page.keyboard.press("ArrowRight");
  await expectActiveLot(dialog, remate.destacados[1], initialSrc);
  await page.keyboard.press("ArrowLeft");
  await expectActiveLot(dialog, remate.destacados[0]);

  await page.keyboard.press("ArrowLeft");
  await expectActiveLot(dialog, remate.destacados.at(-1)!, initialSrc);
  await page.keyboard.press("ArrowRight");
  await expectActiveLot(dialog, remate.destacados[0]);

  await dialog.getByRole("button", { name: "Cerrar imagen ampliada", exact: true }).click();
  await expectClosedAndRestored(dialog, trigger, baselineOverflow);

  const initialScrollY = await page.evaluate(() => window.scrollY);
  await trigger.click();
  await expect(dialog).toBeVisible();
  const openScrollY = await page.evaluate(() => window.scrollY);
  expect(openScrollY).toBe(initialScrollY);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(openScrollY);

  await page.keyboard.press("Escape");
  await expectClosedAndRestored(dialog, trigger, baselineOverflow);
  const afterEscapeScrollY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(afterEscapeScrollY - initialScrollY)).toBeLessThanOrEqual(1);

  const maxScrollY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const restoredDelta = initialScrollY < maxScrollY - 150 ? 200 : -200;
  await page.mouse.wheel(0, restoredDelta);
  await expect
    .poll(() => page.evaluate((before) => Math.abs(window.scrollY - before) > 1, initialScrollY))
    .toBe(true);
  await page.evaluate((position) => window.scrollTo(0, position), initialScrollY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScrollY);

  await trigger.click();
  await expect(dialog).toBeVisible();
  const overlay = page.locator(".lightbox-overlay");
  const content = page.locator(".lightbox-content");
  const backdropPoint = await visibleBackdropPoint(overlay, content);
  await page.screenshot({
    path: resolve(evidenceDir, "CAT-012-backdrop-escritorio.png"),
    fullPage: false,
  });
  await overlay.click({ position: backdropPoint });
  await expectClosedAndRestored(dialog, trigger, baselineOverflow);
  const afterBackdropScrollY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(afterBackdropScrollY - initialScrollY)).toBeLessThanOrEqual(1);
  expect(unexpectedWrites).toEqual([]);

  await writeFile(
    resolve(evidenceDir, "CAT-012.json"),
    `${JSON.stringify(
      {
        source: "API pública real",
        remate: { slug: remate.slug, titulo: remate.titulo },
        imageCount: remate.destacados.length,
        distinctImages: new Set(remate.destacados.map(({ imagen }) => imagen.url)).size,
        imagesLoaded: true,
        navigation: {
          nextButton: true,
          previousButton: true,
          arrowRight: true,
          arrowLeft: true,
          circular: true,
          nameAndImageSynchronized: true,
        },
        closures: { button: true, escape: true, backdrop: true, focusRestored: true },
        scroll: {
          initial: initialScrollY,
          open: openScrollY,
          afterEscape: afterEscapeScrollY,
          afterBackdrop: afterBackdropScrollY,
          lockedWhileOpen: true,
          restoredAfterClose: true,
        },
        unexpectedWrites: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});
