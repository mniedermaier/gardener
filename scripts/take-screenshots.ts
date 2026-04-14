import { chromium } from "@playwright/test";

const BASE = "http://localhost:4173";
const OUT = "docs/screenshots";

// Seed state with sample data for good-looking screenshots
const sampleState = {
  state: {
    locale: "en",
    theme: "dark",
    gardens: [{
      id: "demo", name: "My Garden", season: "2026",
      beds: [
        {
          id: "b1", name: "Vegetable Bed", width: 6, height: 4, environmentType: "outdoor_bed",
          cells: [
            { cellX: 0, cellY: 0, plantId: "tomato" }, { cellX: 1, cellY: 0, plantId: "tomato" }, { cellX: 2, cellY: 0, plantId: "basil" },
            { cellX: 3, cellY: 0, plantId: "pepper" }, { cellX: 4, cellY: 0, plantId: "pepper" }, { cellX: 5, cellY: 0, plantId: "basil" },
            { cellX: 0, cellY: 1, plantId: "carrot" }, { cellX: 1, cellY: 1, plantId: "carrot" }, { cellX: 2, cellY: 1, plantId: "carrot" },
            { cellX: 3, cellY: 1, plantId: "onion" }, { cellX: 4, cellY: 1, plantId: "onion" }, { cellX: 5, cellY: 1, plantId: "onion" },
            { cellX: 0, cellY: 2, plantId: "lettuce" }, { cellX: 1, cellY: 2, plantId: "lettuce" }, { cellX: 2, cellY: 2, plantId: "radish" },
            { cellX: 3, cellY: 2, plantId: "radish" }, { cellX: 4, cellY: 2, plantId: "spinach" }, { cellX: 5, cellY: 2, plantId: "spinach" },
            { cellX: 0, cellY: 3, plantId: "bean" }, { cellX: 1, cellY: 3, plantId: "bean" }, { cellX: 2, cellY: 3, plantId: "pea" },
            { cellX: 3, cellY: 3, plantId: "pea" }, { cellX: 4, cellY: 3, plantId: "zucchini" }, { cellX: 5, cellY: 3, plantId: "zucchini" },
          ],
        },
        {
          id: "b2", name: "Herb Garden", width: 4, height: 3, environmentType: "raised_bed", raisedBedConfig: { heightCm: 80 },
          cells: [
            { cellX: 0, cellY: 0, plantId: "basil" }, { cellX: 1, cellY: 0, plantId: "parsley" }, { cellX: 2, cellY: 0, plantId: "chives" }, { cellX: 3, cellY: 0, plantId: "dill" },
            { cellX: 0, cellY: 1, plantId: "rosemary" }, { cellX: 1, cellY: 1, plantId: "thyme" }, { cellX: 2, cellY: 1, plantId: "oregano" }, { cellX: 3, cellY: 1, plantId: "mint" },
            { cellX: 0, cellY: 2, plantId: "sage" }, { cellX: 1, cellY: 2, plantId: "lavender" }, { cellX: 2, cellY: 2, plantId: "chives" }, { cellX: 3, cellY: 2, plantId: "parsley" },
          ],
        },
      ],
      createdAt: "2026-01-01", updatedAt: "2026-04-14",
    }],
    activeGardenId: "demo",
    tasks: [
      { id: "t1", gardenId: "demo", type: "sow", title: "Sow tomato seedlings", dueDate: "2026-04-15", plantId: "tomato" },
      { id: "t2", gardenId: "demo", type: "water", title: "Water raised beds", dueDate: "2026-04-14" },
      { id: "t3", gardenId: "demo", type: "harvest", title: "Harvest lettuce", dueDate: "2026-04-16", plantId: "lettuce" },
    ],
    harvests: [
      { id: "h1", gardenId: "demo", bedId: "b1", plantId: "tomato", date: "2026-08-15", weightGrams: 2500, quality: 5 },
      { id: "h2", gardenId: "demo", bedId: "b1", plantId: "lettuce", date: "2026-07-01", weightGrams: 800, quality: 4 },
      { id: "h3", gardenId: "demo", bedId: "b1", plantId: "carrot", date: "2026-09-10", weightGrams: 1500, quality: 4 },
    ],
    animals: [
      { id: "a1", type: "chicken", name: "The Ladies", count: 5, acquiredDate: "2026-01-15" },
      { id: "a2", type: "bee", name: "Hive Alpha", count: 2, acquiredDate: "2026-03-01" },
    ],
    animalProducts: [
      { id: "p1", animalId: "a1", type: "eggs", date: "2026-04-14", quantity: 4, unit: "pieces" },
      { id: "p2", animalId: "a1", type: "eggs", date: "2026-04-13", quantity: 5, unit: "pieces" },
      { id: "p3", animalId: "a1", type: "eggs", date: "2026-04-12", quantity: 3, unit: "pieces" },
      { id: "p4", animalId: "a2", type: "honey", date: "2026-07-20", quantity: 8, unit: "kg" },
    ],
    feedEntries: [],
    healthEvents: [
      { id: "he1", animalId: "a1", date: "2026-03-01", type: "vaccination", description: "Newcastle disease", cost: 25 },
    ],
    journalEntries: [],
    expenses: [
      { id: "e1", gardenId: "demo", date: "2026-03-01", category: "seeds", description: "Spring seeds", amountCents: 4500 },
      { id: "e2", gardenId: "demo", date: "2026-03-15", category: "soil", description: "Compost delivery", amountCents: 8000 },
    ],
    seeds: [], soilTests: [], amendments: [], pests: [], waterEntries: [], pantryItems: [],
    customPlants: [], seasonArchives: [], weatherHistory: [],
    weatherApiKey: "", locationLat: 48.1351, locationLon: 11.5820, locationName: "Munich",
    lastFrostDate: "2026-05-15", gridCellSizeCm: 30, backendUrl: null,
    theme: "dark",
    alerts: { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: true },
    lastBackupDate: "2026-04-14T10:00:00Z",
  },
  version: 3,
};

async function main() {
  const browser = await chromium.launch();

  // Desktop screenshots (1280x800)
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const page = await desktop.newPage();

  // Set state
  await page.goto(BASE);
  await page.evaluate((state) => localStorage.setItem("gardener-storage", JSON.stringify(state)), sampleState);
  await page.reload();
  await page.waitForTimeout(2000);

  // Dashboard
  await page.screenshot({ path: `${OUT}/dashboard.png` });

  // Planner
  await page.goto(`${BASE}/#/planner`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/planner.png` });

  // Plants
  await page.goto(`${BASE}/#/plants`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/plants.png` });

  // Calendar
  await page.goto(`${BASE}/#/calendar`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/calendar.png` });

  // Livestock
  await page.goto(`${BASE}/#/livestock`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/livestock.png` });

  // Sufficiency
  await page.goto(`${BASE}/#/sufficiency`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/sufficiency.png` });

  // Mobile screenshot (390x844 — iPhone 14)
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const mpage = await mobile.newPage();
  await mpage.goto(BASE);
  await mpage.evaluate((state) => localStorage.setItem("gardener-storage", JSON.stringify(state)), sampleState);
  await mpage.reload();
  await mpage.waitForTimeout(2000);
  await mpage.screenshot({ path: `${OUT}/mobile-dashboard.png` });

  await browser.close();
  console.log("Screenshots saved to docs/screenshots/");
}

main().catch(console.error);
