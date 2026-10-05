/**
 * Canonical garden metrics — the one place where harvest amounts,
 * self-sufficiency and cost/yield are computed. Every analysis page and the
 * dashboard read their numbers from here, so the same garden never shows
 * three different totals.
 *
 * Vocabulary (use the same words in the UI):
 * - **Erfasst / recorded (`actual`)**: what was logged — harvest entries and
 *   animal products — within the season (calendar year) or all time.
 * - **Prognose / forecast (`forecast`)**: what the current planting plan and
 *   herd should yield over a full season (planted area × expected yield per
 *   m², animals × typical annual yield).
 *
 * All money values are **euros** (expenses are stored in cents and converted
 * here), all weights **grams** unless the name says Kg.
 */
import type { Garden } from "@/types/garden";
import type { Plant } from "@/types/plant";
import type { HarvestEntry } from "@/types/harvest";
import type { Expense, ExpenseCategory } from "@/types/expense";
import type { Animal, AnimalProduct, FeedEntry, HealthEvent, ProductType } from "@/types/animal";
import { ANNUAL_YIELD, PRODUCT_NUTRITION } from "@/types/animal";

// ------------------------------------------------------------------ prices

/**
 * Typical German retail prices (€/kg, organic-leaning, farmers' market level,
 * 2025) used to value the harvest. Deliberately conservative; unknown crops
 * fall back to DEFAULT_PRODUCE_PRICE.
 */
export const PRODUCE_PRICES: Record<string, number> = {
  tomato: 3.5, zucchini: 2.5, carrot: 1.5, lettuce: 2.0, bean: 4.0,
  pea: 5.0, radish: 3.0, cucumber: 2.0, pepper: 4.5, onion: 1.5,
  garlic: 12.0, potato: 1.2, kale: 3.0, spinach: 4.0, beetroot: 2.5,
  leek: 3.0, pumpkin: 2.0, squash: 2.0, chard: 3.0, kohlrabi: 2.5, fennel: 3.5,
  corn: 2.0, cabbage: 1.5, broccoli: 4.0, cauliflower: 3.5, celery: 3.0,
  turnip: 2.0, strawberry: 8.0, raspberry: 15.0, blueberry: 18.0,
  currant: 10.0, gooseberry: 10.0, basil: 25.0, parsley: 15.0,
  dill: 20.0, chives: 20.0, mint: 20.0, rosemary: 25.0, thyme: 30.0,
  sunflower: 5.0, eggplant: 4.0, arugula: 12.0, asparagus: 10.0, pak_choi: 4.0, endive: 3.0,
};
export const DEFAULT_PRODUCE_PRICE = 3.0;

/**
 * Default value of one recorded unit of an animal product (€ per egg, per kg,
 * per litre). Free-range/organic farm-gate level, 2025. Users can override
 * these on the cost page (stored in `useAnalysisPrefs().productPrices`).
 */
export const DEFAULT_PRODUCT_PRICES: Record<ProductType, number> = {
  eggs: 0.35, // € per egg
  honey: 12, // € per kg
  meat: 14, // € per kg
  wax: 15, // € per kg
  milk: 1.4, // € per litre
  wool: 4, // € per kg (raw fleece)
};

export function resolveProductPrices(overrides: Partial<Record<ProductType, number>> = {}): Record<ProductType, number> {
  return { ...DEFAULT_PRODUCT_PRICES, ...overrides };
}

export const PRODUCT_TYPES: ProductType[] = ["eggs", "honey", "milk", "meat", "wool", "wax"];

/** Average egg weight in kg — converts counted eggs to weight/nutrition. */
export const EGG_WEIGHT_KG = 0.06;

/** Daily need per person used for self-sufficiency (adult average). */
export const DAILY_KCAL_PER_PERSON = 2000;

// ------------------------------------------------------------------ periods

/** `null` = all time, otherwise a calendar year (= one garden season). */
export type Period = number | null;

export function inPeriod(isoDate: string, period: Period): boolean {
  return period === null || isoDate.startsWith(`${period}-`);
}

// ------------------------------------------------------------------ yield

export type YieldSource = "actual" | "forecast";

export interface SeasonYield {
  source: YieldSource;
  /** Total in grams. */
  totalGrams: number;
  /** Grams per plant id. */
  byPlant: Record<string, number>;
}

/** Planted area per plant id in m² (all gardens, all beds). */
export function plantedAreaByPlant(gardens: Garden[], gridCellSizeCm: number): Record<string, number> {
  const cellArea = (gridCellSizeCm / 100) ** 2;
  const area: Record<string, number> = {};
  for (const g of gardens) for (const b of g.beds) for (const c of b.cells) area[c.plantId] = (area[c.plantId] ?? 0) + cellArea;
  return area;
}

/** Recorded harvest in a period. Entries without weight count as 0 g. */
export function getActualYield(harvests: HarvestEntry[], period: Period): SeasonYield {
  const byPlant: Record<string, number> = {};
  let total = 0;
  for (const h of harvests) {
    if (!inPeriod(h.date, period)) continue;
    const g = h.weightGrams ?? 0;
    byPlant[h.plantId] = (byPlant[h.plantId] ?? 0) + g;
    total += g;
  }
  return { source: "actual", totalGrams: total, byPlant };
}

/** Expected season yield of the current planting plan: area × expected kg/m². */
export function getForecastYield(gardens: Garden[], plants: Plant[] | Map<string, Plant>, gridCellSizeCm: number): SeasonYield {
  const plantMap = plants instanceof Map ? plants : new Map(plants.map((p) => [p.id, p]));
  const byPlant: Record<string, number> = {};
  let total = 0;
  for (const [plantId, area] of Object.entries(plantedAreaByPlant(gardens, gridCellSizeCm))) {
    const kgPerM2 = plantMap.get(plantId)?.expectedYieldKgPerM2 ?? 0;
    const g = area * kgPerM2 * 1000;
    byPlant[plantId] = g;
    total += g;
  }
  return { source: "forecast", totalGrams: total, byPlant };
}

/** One entry point for both sources (see file header for the definitions). */
export function getSeasonYield(
  opts:
    | { source: "actual"; harvests: HarvestEntry[]; period: Period }
    | { source: "forecast"; gardens: Garden[]; plants: Plant[] | Map<string, Plant>; gridCellSizeCm: number },
): SeasonYield {
  return opts.source === "actual"
    ? getActualYield(opts.harvests, opts.period)
    : getForecastYield(opts.gardens, opts.plants, opts.gridCellSizeCm);
}

// ------------------------------------------------------------------ animals

export type ProductTotals = Record<ProductType, number>;

const emptyTotals = (): ProductTotals => ({ eggs: 0, honey: 0, meat: 0, wax: 0, milk: 0, wool: 0 });

/** Recorded animal products per type, in their recording unit (eggs, kg, l). */
export function getActualProducts(products: AnimalProduct[], period: Period): ProductTotals {
  const totals = emptyTotals();
  for (const p of products) {
    if (!inPeriod(p.date, period)) continue;
    // Old entries may store grams.
    totals[p.type] += p.unit === "g" ? p.quantity / 1000 : p.quantity;
  }
  return totals;
}

/** Expected annual products of the current herd (typical yields × count). */
export function getForecastProducts(animals: Animal[]): ProductTotals {
  const totals = emptyTotals();
  for (const a of animals) for (const y of ANNUAL_YIELD[a.type] ?? []) totals[y.product] += y.quantity * a.count;
  return totals;
}

/** Edible weight in kg of a product amount (eggs → 60 g each; milk ≈ 1 kg/l). */
export function productToKg(type: ProductType, quantity: number): number {
  return type === "eggs" ? quantity * EGG_WEIGHT_KG : quantity;
}

export function productCalories(totals: ProductTotals): number {
  let kcal = 0;
  for (const type of PRODUCT_TYPES) kcal += productToKg(type, totals[type]) * 10 * PRODUCT_NUTRITION[type].caloriesPer100g;
  return kcal;
}

// ------------------------------------------------------------------ value & costs

/** Market value (€) of a harvest given as grams per plant. */
export function produceValue(byPlantGrams: Record<string, number>, prices: Record<string, number> = PRODUCE_PRICES): number {
  let total = 0;
  for (const [plantId, g] of Object.entries(byPlantGrams)) total += (g / 1000) * (prices[plantId] ?? DEFAULT_PRODUCE_PRICE);
  return total;
}

/** Market value (€) of animal products (quantities in recording units). */
export function animalProductValue(totals: ProductTotals, prices: Record<ProductType, number> = DEFAULT_PRODUCT_PRICES): number {
  let total = 0;
  for (const type of PRODUCT_TYPES) total += totals[type] * prices[type];
  return total;
}

export interface CostBreakdown {
  /** Expenses logged on the cost page, € */
  expenses: number;
  /** Feed costs logged in the livestock section (minus entries already in expenses), € */
  feed: number;
  /** Health/vet costs logged in the livestock section, € */
  veterinary: number;
  /** Sum of the three, € */
  total: number;
  /** Expenses per category, € (cost page entries only) */
  byCategory: Partial<Record<ExpenseCategory, number>>;
}

export function getCosts(input: { expenses: Expense[]; feedEntries?: FeedEntry[]; healthEvents?: HealthEvent[]; period: Period }): CostBreakdown {
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  let expenses = 0;
  for (const e of input.expenses) {
    if (!inPeriod(e.date, input.period)) continue;
    const eur = e.amountCents / 100;
    expenses += eur;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + eur;
  }
  // A bill entered both as expense and in the livestock log counts once:
  // log entries matching an animal_feed/veterinary expense (same date and
  // amount) are skipped.
  const expenseKeys = new Set(
    input.expenses
      .filter((e) => e.category === "animal_feed" || e.category === "veterinary")
      .map((e) => `${e.category}|${e.date}|${e.amountCents}`),
  );
  const isDuplicate = (category: ExpenseCategory, date: string, cost: number) => expenseKeys.has(`${category}|${date}|${Math.round(cost * 100)}`);
  const feed = (input.feedEntries ?? [])
    .filter((f) => inPeriod(f.date, input.period) && !isDuplicate("animal_feed", f.date, f.cost ?? 0))
    .reduce((s, f) => s + (f.cost ?? 0), 0);
  const veterinary = (input.healthEvents ?? [])
    .filter((h) => inPeriod(h.date, input.period) && !isDuplicate("veterinary", h.date, h.cost ?? 0))
    .reduce((s, h) => s + (h.cost ?? 0), 0);
  return { expenses, feed, veterinary, total: expenses + feed + veterinary, byCategory };
}

export interface Balance {
  costs: CostBreakdown;
  /** Value of recorded harvests, € */
  produceValue: number;
  /** Value of recorded animal products, € */
  animalValue: number;
  /** produceValue + animalValue, € */
  totalValue: number;
  /** totalValue − costs.total, € */
  net: number;
  /** net / costs (ratio, 0.25 = +25 %). null when there are no costs. */
  roi: number | null;
}

export function getBalance(input: {
  harvests: HarvestEntry[];
  animalProducts: AnimalProduct[];
  expenses: Expense[];
  feedEntries?: FeedEntry[];
  healthEvents?: HealthEvent[];
  period: Period;
  productPrices?: Record<ProductType, number>;
}): Balance {
  const costs = getCosts(input);
  const pv = produceValue(getActualYield(input.harvests, input.period).byPlant);
  const av = animalProductValue(getActualProducts(input.animalProducts, input.period), input.productPrices ?? DEFAULT_PRODUCT_PRICES);
  const totalValue = pv + av;
  const net = totalValue - costs.total;
  return { costs, produceValue: pv, animalValue: av, totalValue, net, roi: costs.total > 0 ? net / costs.total : null };
}

// ------------------------------------------------------------------ self-sufficiency

export function annualCalorieNeed(householdSize: number): number {
  return DAILY_KCAL_PER_PERSON * 365 * Math.max(1, householdSize);
}

/** kcal of a harvest given as grams per plant. */
export function harvestCalories(byPlantGrams: Record<string, number>, plants: Plant[] | Map<string, Plant>): number {
  const plantMap = plants instanceof Map ? plants : new Map(plants.map((p) => [p.id, p]));
  let kcal = 0;
  for (const [plantId, g] of Object.entries(byPlantGrams)) kcal += (g / 100) * (plantMap.get(plantId)?.caloriesPer100g ?? 0);
  return kcal;
}

export interface SelfSufficiency {
  householdSize: number;
  /** Annual calorie need of the household. */
  needKcal: number;
  /** kcal recorded (harvests + animal products) in the period. */
  actualKcal: number;
  /** kcal the plan should produce in a full season (plants + herd). */
  forecastKcal: number;
  /** actualKcal / needKcal, capped at 1. */
  actualRatio: number;
  /** forecastKcal / needKcal, capped at 1. */
  forecastRatio: number;
}

export function getSelfSufficiency(input: {
  harvests: HarvestEntry[];
  animalProducts: AnimalProduct[];
  gardens: Garden[];
  animals: Animal[];
  plants: Plant[] | Map<string, Plant>;
  gridCellSizeCm: number;
  householdSize: number;
  period: Period;
}): SelfSufficiency {
  const needKcal = annualCalorieNeed(input.householdSize);
  const actualKcal =
    harvestCalories(getActualYield(input.harvests, input.period).byPlant, input.plants) +
    productCalories(getActualProducts(input.animalProducts, input.period));
  const forecastKcal =
    harvestCalories(getForecastYield(input.gardens, input.plants, input.gridCellSizeCm).byPlant, input.plants) +
    productCalories(getForecastProducts(input.animals));
  return {
    householdSize: input.householdSize,
    needKcal,
    actualKcal,
    forecastKcal,
    actualRatio: Math.min(1, actualKcal / needKcal),
    forecastRatio: Math.min(1, forecastKcal / needKcal),
  };
}

// ------------------------------------------------------------------ food plan

/** Annual consumption per person in kg (average central-European diet). */
export const ANNUAL_KG_TARGETS: Record<string, number> = {
  potato: 30, carrot: 8, onion: 10, tomato: 15, cucumber: 5, zucchini: 5, pepper: 4,
  lettuce: 5, cabbage: 8, bean: 5, pea: 3, spinach: 3, kale: 3, beetroot: 4, leek: 3,
  garlic: 1, pumpkin: 5, squash: 5, strawberry: 3, raspberry: 1,
};

export interface CropPlanRow {
  plantId: string;
  targetKg: number;
  /** Recorded harvest in the period, kg */
  actualKg: number;
  /** Expected yield of the planted area, kg */
  forecastKg: number;
  areaM2: number;
  /** Area needed to reach the target at the expected yield */
  neededAreaM2: number;
  /** max(0, target − forecast), kg */
  deficitKg: number;
  /** Extra area needed to close the deficit */
  extraAreaM2: number;
}

export interface CropPlan {
  rows: CropPlanRow[];
  targetKg: number;
  actualKg: number;
  forecastKg: number;
  areaM2: number;
  neededAreaM2: number;
  /** Σ min(forecast, target) / Σ target — surplus of one crop does not cover another. */
  forecastCoverage: number;
  /** Σ min(actual, target) / Σ target */
  actualCoverage: number;
}

export function getCropPlan(input: {
  gardens: Garden[];
  plants: Plant[] | Map<string, Plant>;
  gridCellSizeCm: number;
  harvests: HarvestEntry[];
  householdSize: number;
  period: Period;
  targets?: Record<string, number>;
}): CropPlan {
  const plantMap = input.plants instanceof Map ? input.plants : new Map(input.plants.map((p) => [p.id, p]));
  const area = plantedAreaByPlant(input.gardens, input.gridCellSizeCm);
  const actual = getActualYield(input.harvests, input.period).byPlant;
  const rows: CropPlanRow[] = [];
  for (const [plantId, perPerson] of Object.entries(input.targets ?? ANNUAL_KG_TARGETS)) {
    const plant = plantMap.get(plantId);
    if (!plant) continue;
    const kgPerM2 = plant.expectedYieldKgPerM2 ?? 0;
    const targetKg = perPerson * input.householdSize;
    const areaM2 = area[plantId] ?? 0;
    const forecastKg = areaM2 * kgPerM2;
    const deficitKg = Math.max(0, targetKg - forecastKg);
    rows.push({
      plantId,
      targetKg,
      actualKg: (actual[plantId] ?? 0) / 1000,
      forecastKg,
      areaM2,
      neededAreaM2: kgPerM2 > 0 ? targetKg / kgPerM2 : 0,
      deficitKg,
      extraAreaM2: kgPerM2 > 0 ? deficitKg / kgPerM2 : 0,
    });
  }
  rows.sort((a, b) => b.deficitKg - a.deficitKg);
  const sum = (f: (r: CropPlanRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const targetKg = sum((r) => r.targetKg);
  return {
    rows,
    targetKg,
    actualKg: sum((r) => r.actualKg),
    forecastKg: sum((r) => r.forecastKg),
    areaM2: sum((r) => r.areaM2),
    neededAreaM2: sum((r) => r.neededAreaM2),
    forecastCoverage: targetKg > 0 ? sum((r) => Math.min(r.forecastKg, r.targetKg)) / targetKg : 0,
    actualCoverage: targetKg > 0 ? sum((r) => Math.min(r.actualKg, r.targetKg)) / targetKg : 0,
  };
}
