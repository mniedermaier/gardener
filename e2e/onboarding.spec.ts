import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("onboarding wizard completes successfully", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Gardener/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("radio", { name: "English" }).click();
  await page.getByRole("button", { name: /Get started/i }).click();

  await expect(page.getByRole("heading", { name: /Where is your garden/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await page.getByRole("button", { name: /Continue without location/i }).click();

  await expect(page.getByRole("heading", { name: /frost/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /Next/i }).click();

  await expect(page.getByRole("heading", { name: /How would you like to start/i })).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/Garden Name/i).fill("Test Garden");
  await page.getByRole("radio", { name: /Empty garden/i }).check();
  await page.getByRole("button", { name: /Create garden/i }).click();

  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Getting started")).toBeVisible();
});

test("onboarding can be done in German, with the example garden", async ({ page }) => {
  await page.getByRole("radio", { name: "Deutsch" }).click();
  await page.getByRole("button", { name: /geht/i }).click();

  await expect(page.getByRole("heading", { name: /Garten/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /Ohne Standort weiter/i }).click();

  await expect(page.getByRole("heading", { name: /Frost/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /Zurück/i }).click();
  await expect(page.getByRole("heading", { name: /Wo liegt/i })).toBeVisible();
  await page.getByRole("button", { name: /Ohne Standort weiter/i }).click();
  await page.getByRole("button", { name: /Weiter/i }).click();

  await page.getByPlaceholder(/Hausgarten/i).fill("Mein Garten");
  await page.getByRole("button", { name: /Beispielgarten anlegen/i }).click();

  await expect(page.getByRole("heading", { name: "Heute", exact: true })).toBeVisible({ timeout: 10000 });
});
