import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = {
      state: {
        locale: "en",
        gardens: [{
          id: "test-garden",
          name: "E2E Garden",
          season: "2026",
          beds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        activeGardenId: "test-garden",
        tasks: [],
        harvests: [],
        journalEntries: [],
        weatherHistory: [],
        customPlants: [],
        expenses: [],
        seeds: [],
        soilTests: [],
        amendments: [],
        pests: [],
        waterEntries: [],
        animals: [],
        animalProducts: [],
        feedEntries: [],
        healthEvents: [],
        pantryItems: [],
        seasonArchives: [],
        weatherApiKey: "",
        locationLat: null,
        locationLon: null,
        locationName: "",
        lastFrostDate: "2026-05-15",
        gridCellSizeCm: 30,
        backendUrl: null,
        theme: "system",
        alerts: {
          frostAlertEnabled: true,
          frostThresholdC: 2,
          wateringReminders: true,
          greenhouseAlerts: true,
          weeklyDigest: true,
        },
      },
      version: 3,
    };
    localStorage.setItem("gardener-storage", JSON.stringify(state));
  });
  await page.reload();
});

test("dashboard shows the today view", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/E2E Garden/)).toBeVisible();
});

test("can navigate to planner and create a bed", async ({ page }) => {
  await page.getByRole("link", { name: /Garden Planner|Planner/i }).first().click();
  await expect(page.getByText("E2E Garden").first()).toBeVisible();

  await page.getByRole("button", { name: /New Bed/i }).first().click();
  // Wait for modal
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator("input").first().fill("Tomato Bed");
  await page.getByRole("dialog").getByRole("button", { name: /^Add$/i }).click();

  // A new bed opens straight in the editor
  await expect(page.getByRole("heading", { name: "Tomato Bed" })).toBeVisible();
});

test("planner: choose a plant, place it, then inspect the cell", async ({ page }) => {
  await page.getByRole("link", { name: /Garden Planner|Planner/i }).first().click();
  await page.getByRole("button", { name: /New Bed/i }).first().click();
  await page.getByRole("dialog").locator("input").first().fill("Herb Bed");
  await page.getByRole("dialog").getByRole("button", { name: /^Add$/i }).click();
  await expect(page.getByRole("heading", { name: "Herb Bed" })).toBeVisible();

  // Tapping an empty cell without a chosen plant does not plant anything
  await page.locator('[data-x="0"][data-y="0"]').click();
  await expect(page.locator("[data-planted]")).toHaveCount(0);

  // Explicitly choose a plant from the palette → placement mode
  const palette = page.locator("aside");
  await palette.getByPlaceholder("Search plants...").fill("basil");
  await palette.getByRole("button", { name: /Basil/ }).first().click();
  await expect(page.getByText(/Placing Basil/).first()).toBeVisible();

  await page.locator('[data-x="0"][data-y="0"]').click();
  await expect(page.locator("[data-planted]")).toHaveCount(1);

  // Leave placement mode, then a planted cell opens the inspector instead of planting
  await page.getByRole("button", { name: /^Done$/ }).click();
  await page.locator("[data-planted]").first().click();
  await expect(page.getByRole("region", { name: /Planting: Basil/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Log harvest/ })).toBeVisible();
});

test("can navigate to plant database and search", async ({ page }) => {
  await page.getByRole("link", { name: /^Plants$/ }).first().click();

  // Wait for plant list to load
  await expect(page.getByRole("heading", { level: 1, name: "Plants", exact: true })).toBeVisible();

  // Search
  await page.getByPlaceholder("Search plants...").fill("basil");
  await expect(page.getByText("Basil").first()).toBeVisible();
});

test("can navigate to harvest log", async ({ page }) => {
  await page.getByRole("link", { name: /^Harvest$/ }).first().click();
  await expect(page.getByText(/No harvests/i)).toBeVisible();
});

test("can navigate to settings", async ({ page }) => {
  await page.getByRole("link", { name: /^Settings$/ }).first().click();
  await expect(page.getByText("Language", { exact: true })).toBeVisible();
  await expect(page.getByText("Theme", { exact: true })).toBeVisible();
});

test("can navigate to settings and see language options", async ({ page }) => {
  // Language is now changed in settings, not top bar
  await page.getByRole("link", { name: /^Settings$/ }).first().click();
  await expect(page.getByText("Deutsch")).toBeVisible();
  await expect(page.getByText("English")).toBeVisible();
  await expect(page.getByText("Español")).toBeVisible();
  await expect(page.getByText("Français")).toBeVisible();
});
