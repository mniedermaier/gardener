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

test("dashboard shows garden overview", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("E2E Garden")).toBeVisible();
});

test("can navigate to planner and create a bed", async ({ page }) => {
  await page.getByRole("link", { name: /Garden Planner/i }).click();
  await expect(page.getByText("E2E Garden")).toBeVisible();

  await page.getByRole("button", { name: /New Bed/i }).click();
  // Wait for modal
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").locator("input").first().fill("Tomato Bed");
  await page.getByRole("dialog").getByRole("button", { name: /^Add$/i }).click();

  await expect(page.getByRole("heading", { name: "Tomato Bed" })).toBeVisible();
});

test("can navigate to plant database and search", async ({ page }) => {
  await page.getByRole("link", { name: /Plant Database/i }).click();

  // Wait for plant list to load
  await expect(page.getByRole("heading", { name: /Plant Database/i })).toBeVisible();

  // Search
  await page.getByPlaceholder("Search plants...").fill("basil");
  await expect(page.getByText("Basil").first()).toBeVisible();
});

test("can navigate to harvest log", async ({ page }) => {
  await page.getByRole("link", { name: /Harvest/i }).click();
  await expect(page.getByText(/No harvests/i)).toBeVisible();
});

test("can navigate to settings", async ({ page }) => {
  await page.getByRole("link", { name: /Settings/i }).click();
  await expect(page.getByText("Language")).toBeVisible();
  await expect(page.getByText("Theme")).toBeVisible();
});

test("can navigate to settings and see language options", async ({ page }) => {
  // Language is now changed in settings, not top bar
  await page.getByRole("link", { name: /Settings/i }).click();
  await expect(page.getByText("Deutsch")).toBeVisible();
  await expect(page.getByText("English")).toBeVisible();
  await expect(page.getByText("Español")).toBeVisible();
  await expect(page.getByText("Français")).toBeVisible();
});
