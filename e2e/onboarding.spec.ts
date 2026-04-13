import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("onboarding wizard completes successfully", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Gardener/i })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: /Get Started/i }).click();

  await expect(page.getByRole("heading", { name: /garden/i })).toBeVisible();
  await page.getByRole("button", { name: /Next/i }).click();

  await expect(page.getByRole("heading", { name: /frost/i })).toBeVisible();
  await page.getByRole("button", { name: /Next/i }).click();

  await expect(page.getByRole("heading", { name: /Name your/i })).toBeVisible();
  await page.getByPlaceholder(/Garden/i).fill("Test Garden");
  await page.getByRole("button", { name: /grow/i }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("onboarding can be done in German", async ({ page }) => {
  await page.getByRole("button", { name: "Deutsch" }).click();
  await page.getByRole("button", { name: /geht's/i }).click();

  await expect(page.getByRole("heading", { name: /Garten/i })).toBeVisible();
  await page.getByRole("button", { name: /Weiter/i }).click();

  await expect(page.getByRole("heading", { name: /Frost/i })).toBeVisible();
  await page.getByRole("button", { name: /Weiter/i }).click();

  await page.getByPlaceholder(/Garten/i).fill("Mein Garten");
  await page.getByRole("button", { name: /Beet/i }).click();

  await expect(page.getByRole("heading", { name: "\u00dcbersicht", exact: true })).toBeVisible();
});
