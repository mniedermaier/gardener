import { describe, it, expect } from "vitest";
import {
  animalProductValue, annualCalorieNeed, DEFAULT_PRODUCE_PRICE, DEFAULT_PRODUCT_PRICES, getActualProducts, getActualYield,
  getBalance, getCosts, getCropPlan, getForecastProducts, getForecastYield, getSeasonYield, getSelfSufficiency,
  inPeriod, plantedAreaByPlant, produceValue, productToKg, resolveProductPrices,
} from "@/lib/metrics";
import type { Plant } from "@/types/plant";
import type { Garden } from "@/types/garden";
import type { HarvestEntry } from "@/types/harvest";
import type { AnimalProduct, Animal, FeedEntry, HealthEvent } from "@/types/animal";
import type { Expense } from "@/types/expense";

const plant = (id: string, kgPerM2: number, kcal: number): Plant => ({
  id, category: "vegetable", sowIndoorsWeeks: null, sowOutdoorsWeeks: 0, transplantWeeks: null,
  harvestDaysMin: 60, harvestDaysMax: 90, spacingCm: 30, rowSpacingCm: 30, sunRequirement: "full",
  waterNeed: "medium", companions: [], antagonists: [], color: "#000", icon: "",
  expectedYieldKgPerM2: kgPerM2, caloriesPer100g: kcal,
});
const potato = plant("potato", 4, 77);
const tomato = plant("tomato", 8, 18);
const plants = [potato, tomato];

// 30 cm grid → 0.09 m² per cell. 10 potato cells = 0.9 m², 5 tomato cells = 0.45 m².
const garden: Garden = {
  id: "g", name: "G", season: "2026", createdAt: "", updatedAt: "",
  beds: [{
    id: "b", name: "B", x: 0, y: 0, width: 5, height: 3, environmentType: "outdoor_bed",
    cells: [
      ...Array.from({ length: 10 }, (_, i) => ({ cellX: i % 5, cellY: Math.floor(i / 5), plantId: "potato" })),
      ...Array.from({ length: 5 }, (_, i) => ({ cellX: i, cellY: 2, plantId: "tomato" })),
    ],
  }],
};

const harvest = (plantId: string, date: string, weightGrams?: number): HarvestEntry =>
  ({ id: `${plantId}-${date}`, gardenId: "g", bedId: "b", plantId, date, weightGrams, quality: 4 });
const harvests = [harvest("potato", "2026-08-01", 2000), harvest("tomato", "2026-07-15", 1500), harvest("tomato", "2025-08-01", 9000), harvest("tomato", "2026-08-02")];

const product = (type: AnimalProduct["type"], date: string, quantity: number, unit: AnimalProduct["unit"] = "kg"): AnimalProduct =>
  ({ id: `${type}-${date}`, animalId: "a", type, date, quantity, unit });

describe("periods", () => {
  it("filters by calendar year, null = all time", () => {
    expect(inPeriod("2026-03-01", 2026)).toBe(true);
    expect(inPeriod("2025-12-31", 2026)).toBe(false);
    expect(inPeriod("1999-01-01", null)).toBe(true);
  });
});

describe("yield: actual vs forecast", () => {
  it("sums recorded harvests of the season and ignores entries without weight", () => {
    const y = getActualYield(harvests, 2026);
    expect(y.source).toBe("actual");
    expect(y.totalGrams).toBe(3500);
    expect(y.byPlant).toEqual({ potato: 2000, tomato: 1500 });
  });

  it("includes all years when the period is null", () => {
    expect(getActualYield(harvests, null).totalGrams).toBe(12500);
  });

  it("forecasts from planted area × expected yield", () => {
    const area = plantedAreaByPlant([garden], 30);
    expect(area.potato).toBeCloseTo(0.9);
    expect(area.tomato).toBeCloseTo(0.45);
    const y = getForecastYield([garden], plants, 30);
    expect(y.byPlant.potato).toBeCloseTo(3600); // 0.9 m² × 4 kg
    expect(y.byPlant.tomato).toBeCloseTo(3600); // 0.45 m² × 8 kg
    expect(y.totalGrams).toBeCloseTo(7200);
  });

  it("getSeasonYield dispatches on source", () => {
    expect(getSeasonYield({ source: "actual", harvests, period: 2026 }).totalGrams).toBe(3500);
    expect(getSeasonYield({ source: "forecast", gardens: [garden], plants: new Map(plants.map((p) => [p.id, p])), gridCellSizeCm: 30 }).totalGrams).toBeCloseTo(7200);
  });

  it("ignores crops without a yield figure", () => {
    const y = getForecastYield([garden], [potato], 30);
    expect(y.byPlant.tomato).toBe(0);
  });
});

describe("animal products", () => {
  it("totals recorded products per type in recording units, grams converted to kg", () => {
    const totals = getActualProducts([product("eggs", "2026-05-01", 12, "pieces"), product("honey", "2026-07-01", 500, "g"), product("honey", "2025-07-01", 9)], 2026);
    expect(totals.eggs).toBe(12);
    expect(totals.honey).toBeCloseTo(0.5);
  });

  it("forecasts herd output from typical yields", () => {
    const animals: Animal[] = [{ id: "a", type: "chicken", count: 4, acquiredDate: "2026-01-01" }, { id: "b", type: "bee", count: 2, acquiredDate: "2026-01-01" }];
    const f = getForecastProducts(animals);
    expect(f.eggs).toBe(880); // 4 hens × 220
    expect(f.honey).toBe(40);
    expect(f.wax).toBe(1);
  });

  it("converts eggs to weight", () => {
    expect(productToKg("eggs", 100)).toBeCloseTo(6);
    expect(productToKg("honey", 2)).toBe(2);
  });
});

describe("money", () => {
  it("values produce at market prices with a fallback", () => {
    expect(produceValue({ potato: 1000, unknown: 1000 })).toBeCloseTo(1.2 + DEFAULT_PRODUCE_PRICE);
  });

  it("values animal products with default or overridden prices", () => {
    const totals = { eggs: 100, honey: 2, meat: 0, wax: 0, milk: 0, wool: 0 };
    expect(animalProductValue(totals)).toBeCloseTo(100 * DEFAULT_PRODUCT_PRICES.eggs + 2 * DEFAULT_PRODUCT_PRICES.honey);
    expect(animalProductValue(totals, resolveProductPrices({ eggs: 0.5 }))).toBeCloseTo(50 + 24);
  });

  const expenses: Expense[] = [
    { id: "e1", gardenId: "", date: "2026-03-01", category: "seeds", description: "", amountCents: 1250 },
    { id: "e2", gardenId: "", date: "2026-04-01", category: "animal_feed", description: "", amountCents: 2000 },
    { id: "e3", gardenId: "", date: "2025-04-01", category: "tools", description: "", amountCents: 9900 },
  ];
  const feed: FeedEntry[] = [{ id: "f", animalId: "a", date: "2026-05-01", feedType: "Körner", quantity: 25, unit: "kg", cost: 15 }];
  const health: HealthEvent[] = [{ id: "h", animalId: "a", date: "2026-06-01", type: "vaccination", description: "", cost: 8 }];

  it("adds livestock feed and vet costs to the expenses, in euros", () => {
    const c = getCosts({ expenses, feedEntries: feed, healthEvents: health, period: 2026 });
    expect(c.expenses).toBeCloseTo(32.5);
    expect(c.feed).toBe(15);
    expect(c.veterinary).toBe(8);
    expect(c.total).toBeCloseTo(55.5);
    // One breakdown: the feed log is part of animal_feed, vet log of veterinary.
    expect(c.expenseByCategory).toEqual({ seeds: 12.5, animal_feed: 20 });
    expect(c.byCategory).toEqual({ seeds: 12.5, animal_feed: 35, veterinary: 8 });
    expect(c.animals).toBe(43);
  });

  it("counts a bill entered both as expense and in the livestock log only once", () => {
    const dup: Expense = { id: "e4", gardenId: "", date: "2026-06-01", category: "veterinary", description: "", amountCents: 800 };
    const c = getCosts({ expenses: [dup], feedEntries: [], healthEvents: health, period: 2026 });
    expect(c.veterinary).toBe(0);
    expect(c.total).toBe(8);
  });

  it("counts animal products as yield when animal costs are counted (balance & ROI)", () => {
    const b = getBalance({
      harvests, expenses, feedEntries: feed, healthEvents: health, period: 2026,
      animalProducts: [product("eggs", "2026-05-01", 100, "pieces")],
    });
    const harvestValue = 2 * 1.2 + 1.5 * 3.5;
    expect(b.produceValue).toBeCloseTo(harvestValue);
    expect(b.animalValue).toBeCloseTo(35);
    expect(b.net).toBeCloseTo(harvestValue + 35 - 55.5);
    expect(b.roi).toBeCloseTo(b.net / 55.5);
  });

  it("has no ROI without costs", () => {
    expect(getBalance({ harvests, expenses: [], animalProducts: [], period: 2026 }).roi).toBeNull();
  });
});

describe("self-sufficiency", () => {
  it("compares recorded and forecast calories with the household's annual need", () => {
    const s = getSelfSufficiency({
      harvests, animalProducts: [], gardens: [garden], animals: [], plants, gridCellSizeCm: 30, householdSize: 2, period: 2026,
    });
    expect(s.needKcal).toBe(annualCalorieNeed(2));
    expect(s.needKcal).toBe(2000 * 365 * 2);
    expect(s.actualKcal).toBeCloseTo(20 * 77 + 15 * 18); // 2 kg potato, 1.5 kg tomato
    expect(s.forecastKcal).toBeCloseTo(36 * 77 + 36 * 18);
    expect(s.actualRatio).toBeCloseTo(s.actualKcal / s.needKcal);
    expect(s.forecastRatio).toBeLessThanOrEqual(1);
  });

  it("includes the herd in the forecast", () => {
    const base = { harvests: [], animalProducts: [], gardens: [], plants, gridCellSizeCm: 30, householdSize: 1, period: 2026 };
    const without = getSelfSufficiency({ ...base, animals: [] });
    const withHens = getSelfSufficiency({ ...base, animals: [{ id: "a", type: "chicken", count: 5, acquiredDate: "2026-01-01" }] });
    expect(without.forecastKcal).toBe(0);
    // 5 hens lay 1 100 eggs, but one person eats ~240: only those count.
    expect(withHens.forecastKcal).toBeCloseTo(240 * 0.06 * 10 * 155);
    expect(withHens.forecastSurplusKg.eggs).toBeCloseTo((1100 - 240) * 0.06);
  });

  it("caps the ratio at 100 %", () => {
    const s = getSelfSufficiency({ harvests: [harvest("potato", "2026-08-01", 1e9)], animalProducts: [], gardens: [], animals: [], plants, gridCellSizeCm: 30, householdSize: 1, period: 2026 });
    expect(s.actualRatio).toBe(1);
  });
});

describe("crop plan", () => {
  it("does not let a surplus of one crop cover another", () => {
    const plan = getCropPlan({ gardens: [garden], plants, gridCellSizeCm: 30, harvests, householdSize: 1, period: 2026, targets: { potato: 2, tomato: 10 } });
    const p = plan.rows.find((r) => r.plantId === "potato")!;
    const tm = plan.rows.find((r) => r.plantId === "tomato")!;
    expect(p.forecastKg).toBeCloseTo(3.6);
    expect(p.deficitKg).toBe(0);
    expect(tm.deficitKg).toBeCloseTo(6.4);
    expect(tm.extraAreaM2).toBeCloseTo(0.8);
    expect(plan.forecastCoverage).toBeCloseTo((2 + 3.6) / 12);
    expect(plan.actualCoverage).toBeCloseTo((2 + 1.5) / 12);
    expect(plan.rows[0].plantId).toBe("tomato"); // largest deficit first
  });

  it("scales targets with household size", () => {
    const one = getCropPlan({ gardens: [], plants, gridCellSizeCm: 30, harvests: [], householdSize: 1, period: 2026 });
    const four = getCropPlan({ gardens: [], plants, gridCellSizeCm: 30, harvests: [], householdSize: 4, period: 2026 });
    expect(four.targetKg).toBeCloseTo(one.targetKg * 4);
  });
});
