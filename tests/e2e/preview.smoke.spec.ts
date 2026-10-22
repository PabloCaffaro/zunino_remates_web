import { expect, test } from "@playwright/test";

test("@smoke abre la home y muestra el login administrativo", async ({ page }) => {
  const browserName = page.context().browser()?.browserType().name();
  expect(browserName).toBe("chromium");

  const homeResponse = await page.goto("/");
  expect(homeResponse?.ok()).toBe(true);
  await expect(page.locator("#root main.home-page")).toBeVisible();

  await page.goto("/admin12345");
  await expect(page).toHaveURL(/\/admin12345\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ingresar al panel" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar", exact: true })).toBeVisible();
});
