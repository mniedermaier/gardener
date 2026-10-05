/**
 * The same quantity must show the same number everywhere. These tests pin the
 * agreements between metrics.ts (dashboard, self-sufficiency headline, costs)
 * and the other consumers (sufficiency nutrition card, food plan, livestock).
 */
import { describe, it, expect } from "vitest";
import plantsJson from "@/data/plants.json";
import {
  capToConsumption, expectedShareToDate, getActualProductKg, getCosts, getFeedCostStats, getForecastProductKg, getForecastProducts,
  getSelfSufficiency, productKgCalories,
} from "@/lib/metrics";
import { calculateSufficiency } from "@/lib/sufficiency";
import type { Plant } from "@/types/plant";
import type { Garden } from "@/types/garden";
import type { Animal, AnimalProduct, FeedEntry, HealthEvent } from "@/types/animal";
import type { Expense } from "@/types/expense";

const plants = plantsJson as Plant[];
const cells = (plantId: string, n: number, y = 0) => Array.from({ length: n }, (_, i) => ({ cellX: i % 8, cellY: y + Math.floor(i / 8), plantId }));
const garden: Garden = {
  id: "g", name: "G", season: "2026", createdAt: "", updatedAt: "",
  beds: [
    { id: "acker", name: "Kartoffelacker", x: 0, y: 0, width: 8, height: 5, environmentType: "outdoor_bed", cells: [...cells("potato", 16), ...cells("pumpkin", 6, 2), ...cells("bean", 6, 3)] },
    {
      id: "gh", name: "Gewächshaus", x: 0, y: 0, width: 6, height: 4, environmentType: "greenhouse",
      greenhouseConfig: { material: "polycarbonate", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 },
      cells: [...cells("tomato", 8), ...cells("pepper", 3, 1)],
    },
  ],
};
// Demo herd: 6 hens, 2 bee colonies.
const animals: Animal[] = [
  { id: "hens", type: "chicken", count: 6, acquiredDate: "2025-04-01" },
  { id: "bees", type: "bee", count: 2, acquiredDate: "2025-04-01" },
];

describe("self-sufficiency: one number everywhere", () => {
  const ss = getSelfSufficiency({ harvests: [], animalProducts: [], gardens: [garden], animals, plants, gridCellSizeCm: 30, householdSize: 2, period: 2026, asOf: new Date(2026, 9, 5) });
  const card = calculateSufficiency([garden], plants, 2, 30, "2026-05-15", animals);

  it("nutrition card calories = headline forecast", () => {
    expect(card.nutrition.calories.produced).toBeCloseTo(ss.forecastKcal, -1);
    expect(card.nutrition.calories.percent).toBe(Math.round(ss.forecastRatio * 100));
  });

  it("garden + animal parts add up to the forecast", () => {
    expect(ss.forecastPlantKcal + ss.forecastAnimalKcal).toBeCloseTo(ss.forecastKcal);
  });

  it("honey and eggs are capped at typical consumption, the surplus is reported", () => {
    const raw = getForecastProductKg(animals);
    expect(raw.honey).toBe(40);
    const { counted, surplus } = capToConsumption(raw, 2);
    expect(counted.honey).toBe(2);
    expect(surplus.honey).toBe(38);
    expect(counted.eggs).toBeCloseTo(2 * 240 * 0.06);
    expect(ss.forecastSurplusKg.honey).toBe(38);
    // Animal products no longer dominate: they are below the uncapped value by far.
    expect(ss.forecastAnimalKcal).toBeLessThan(productKgCalories(raw) / 3);
  });

  it("'expected by today' lies between 0 and the annual forecast and grows over the year", () => {
    const spring = getSelfSufficiency({ harvests: [], animalProducts: [], gardens: [garden], animals, plants, gridCellSizeCm: 30, householdSize: 2, period: 2026, asOf: new Date(2026, 3, 1) });
    expect(ss.forecastToDateKcal!).toBeGreaterThan(spring.forecastToDateKcal!);
    expect(ss.forecastToDateKcal!).toBeLessThanOrEqual(ss.forecastKcal + 1e-6);
    // Not the current year → no to-date value.
    expect(getSelfSufficiency({ harvests: [], animalProducts: [], gardens: [garden], animals, plants, gridCellSizeCm: 30, householdSize: 2, period: 2025, asOf: new Date(2026, 9, 5) }).forecastToDateKcal).toBeNull();
  });

  it("quail eggs are weighed as quail eggs", () => {
    const quail: Animal = { id: "q", type: "quail", count: 1, acquiredDate: "2026-01-01" };
    const p: AnimalProduct = { id: "p", animalId: "q", type: "eggs", date: "2026-05-01", quantity: 100, unit: "pieces" };
    expect(getActualProductKg([p], [quail], 2026).eggs).toBeCloseTo(1.1);
    expect(getForecastProductKg([quail]).eggs).toBeCloseTo(300 * 0.011);
  });
});

describe("costs: one definition for the cost page, dashboard and livestock", () => {
  const expenses: Expense[] = [
    { id: "x1", gardenId: "", date: "2026-03-10", category: "animal_feed", description: "Legemehl", amountCents: 2290 },
    { id: "x2", gardenId: "", date: "2026-04-02", category: "veterinary", description: "Impfung", amountCents: 1850 },
    { id: "x3", gardenId: "", date: "2026-02-01", category: "seeds", description: "Saatgut", amountCents: 4000 },
  ];
  const feed: FeedEntry[] = [
    { id: "f1", animalId: "hens", date: "2026-09-01", feedType: "Körner", quantity: 25, unit: "kg", cost: 20.5 },
    // Same bill as x1, logged two days later → counted once.
    { id: "f2", animalId: "hens", date: "2026-03-12", feedType: "Legemehl", quantity: 25, unit: "kg", cost: 22.9 },
  ];
  const health: HealthEvent[] = [{ id: "h1", animalId: "hens", date: "2026-05-01", type: "deworming", description: "Wurmkur", cost: 0 }];

  it("merges the feed log into animal_feed and skips the duplicate bill", () => {
    const c = getCosts({ expenses, feedEntries: feed, healthEvents: health, period: 2026 });
    expect(c.duplicatesSkipped).toBe(1);
    expect(c.byCategory.animal_feed).toBeCloseTo(22.9 + 20.5);
    expect(c.animals).toBeCloseTo(22.9 + 20.5 + 18.5);
    // "davon X Tierhaltung" equals the sum of the two animal category rows.
    expect(c.animals).toBeCloseTo((c.byCategory.animal_feed ?? 0) + (c.byCategory.veterinary ?? 0));
    // Category rows add up to the total.
    expect(Object.values(c.byCategory).reduce((s, v) => s + (v ?? 0), 0)).toBeCloseTo(c.total);
  });

  it("does not match bills more than three days apart", () => {
    const far: FeedEntry = { ...feed[1], id: "f3", date: "2026-03-20" };
    expect(getCosts({ expenses, feedEntries: [far], period: 2026 }).duplicatesSkipped).toBe(0);
  });
});

describe("feed costs", () => {
  const entries: FeedEntry[] = [
    { id: "a", animalId: "h", date: "2026-08-10", feedType: "", quantity: 1, unit: "kg", cost: 11.5 },
    { id: "b", animalId: "h", date: "2026-09-20", feedType: "", quantity: 1, unit: "kg", cost: 12.4 },
    { id: "c", animalId: "h", date: "2026-07-01", feedType: "", quantity: 1, unit: "kg", cost: 10.5 },
  ];
  const s = getFeedCostStats(entries, new Date(2026, 9, 5));

  it("labels match values: calendar month, rolling 30 days, average", () => {
    expect(s.thisMonth).toBe(0); // 5 October: nothing yet — the old "Futterkosten/Monat 0,00 €"
    expect(s.last30Days).toBeCloseTo(12.4);
    expect(s.total).toBeCloseTo(34.4);
    expect(s.perMonth).toBeGreaterThan(0);
    expect(s.perMonth * s.months).toBeCloseTo(s.total);
  });
});

describe("expected production to date", () => {
  it("prorates from the later of 1 January and the arrival date", () => {
    const oct = new Date(2026, 9, 5);
    expect(expectedShareToDate("eggs", oct)).toBeGreaterThan(0.75);
    expect(expectedShareToDate("eggs", oct, "2026-09-05")).toBeLessThan(0.1);
    expect(expectedShareToDate("honey", oct)).toBe(1);
    expect(expectedShareToDate("honey", new Date(2026, 2, 1))).toBe(0);
  });

  it("herd forecast in units matches the kg forecast for hens", () => {
    expect(getForecastProducts(animals).eggs * 0.06).toBeCloseTo(getForecastProductKg(animals).eggs);
  });
});
