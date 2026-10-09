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
import { ANNUAL_YIELD, EGG_WEIGHT_KG_BY_ANIMAL, PRODUCT_NUTRITION } from "@/types/animal";
import { getFrostProtectionWeeks } from "@/types/garden";

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

/** Edible weight in kg of a product amount (eggs → 60 g each, i.e. hen's eggs; milk ≈ 1 kg/l). */
export function productToKg(type: ProductType, quantity: number): number {
  return type === "eggs" ? quantity * EGG_WEIGHT_KG : quantity;
}

/** Product amounts as edible mass in kg (eggs weighed per species). */
export type ProductKg = Record<ProductType, number>;

const eggWeight = (animal: Animal | undefined) => (animal && EGG_WEIGHT_KG_BY_ANIMAL[animal.type]) ?? EGG_WEIGHT_KG;

/** Recorded products as edible kg — a quail egg weighs 11 g, not 60 g. */
export function getActualProductKg(products: AnimalProduct[], animals: Animal[], period: Period): ProductKg {
  const byId = new Map(animals.map((a) => [a.id, a]));
  const kg = emptyTotals();
  for (const p of products) {
    if (!inPeriod(p.date, period)) continue;
    const q = p.unit === "g" ? p.quantity / 1000 : p.quantity;
    kg[p.type] += p.type === "eggs" ? q * eggWeight(byId.get(p.animalId)) : q;
  }
  return kg;
}

/** Expected annual products of the herd as edible kg. */
export function getForecastProductKg(animals: Animal[]): ProductKg {
  const kg = emptyTotals();
  for (const a of animals)
    for (const y of ANNUAL_YIELD[a.type] ?? []) kg[y.product] += y.quantity * a.count * (y.product === "eggs" ? eggWeight(a) : 1);
  return kg;
}

/** kcal of products given as edible kg. */
export function productKgCalories(kg: ProductKg): number {
  let kcal = 0;
  for (const type of PRODUCT_TYPES) kcal += kg[type] * 10 * PRODUCT_NUTRITION[type].caloriesPer100g;
  return kcal;
}

/** kcal of products in recording units (eggs counted as hen's eggs). */
export function productCalories(totals: ProductTotals): number {
  let kcal = 0;
  for (const type of PRODUCT_TYPES) kcal += productToKg(type, totals[type]) * 10 * PRODUCT_NUTRITION[type].caloriesPer100g;
  return kcal;
}

/**
 * Typical annual consumption per person in Germany (edible kg; milk in
 * litres incl. what goes into cheese and yoghurt). Self-sufficiency counts an
 * animal product only up to this amount: a small flock or two bee colonies
 * quickly produce far more eggs or honey than a household eats, and that
 * surplus (sold, swapped, given away) feeds nobody at home.
 * Sources: BLE Versorgungsbilanzen 2023 (≈ 230–240 eggs, ≈ 1 kg honey,
 * ≈ 52 kg meat per person and year).
 */
export const ANNUAL_CONSUMPTION_KG_PER_PERSON: Partial<Record<ProductType, number>> = {
  eggs: 240 * EGG_WEIGHT_KG, // 240 hen's eggs ≈ 14.4 kg
  honey: 1,
  meat: 52,
  milk: 300,
};

export interface CappedProducts {
  /** Counted towards self-sufficiency (≤ typical consumption), edible kg. */
  counted: ProductKg;
  /** Above typical consumption, edible kg. */
  surplus: ProductKg;
}

/** Splits product kg into what the household eats and the surplus. */
export function capToConsumption(kg: ProductKg, householdSize: number): CappedProducts {
  const counted = emptyTotals();
  const surplus = emptyTotals();
  const persons = Math.max(1, householdSize);
  for (const type of PRODUCT_TYPES) {
    const cap = ANNUAL_CONSUMPTION_KG_PER_PERSON[type];
    if (cap === undefined) {
      counted[type] = kg[type];
      continue;
    }
    counted[type] = Math.min(kg[type], cap * persons);
    surplus[type] = Math.max(0, kg[type] - cap * persons);
  }
  return { counted, surplus };
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
  /** Health/vet costs logged in the livestock section (minus entries already in expenses), € */
  veterinary: number;
  /** Sum of the three, € */
  total: number;
  /**
   * Costs per category, € — **including** the livestock logs: feed entries
   * count as `animal_feed`, vet costs from the health log as `veterinary`.
   * This is the one breakdown every page shows.
   */
  byCategory: Partial<Record<ExpenseCategory, number>>;
  /** Cost page entries only, per category, € */
  expenseByCategory: Partial<Record<ExpenseCategory, number>>;
  /** All livestock costs (animal_feed + veterinary, both sources), € */
  animals: number;
  /** Livestock log entries skipped because the same bill is already an expense. */
  duplicatesSkipped: number;
}

/** A log entry within this many days of an expense with the same amount is the same bill. */
const DUPLICATE_WINDOW_DAYS = 3;

export function getCosts(input: { expenses: Expense[]; feedEntries?: FeedEntry[]; healthEvents?: HealthEvent[]; period: Period }): CostBreakdown {
  const expenseByCategory: Partial<Record<ExpenseCategory, number>> = {};
  let expenses = 0;
  for (const e of input.expenses) {
    if (!inPeriod(e.date, input.period)) continue;
    const eur = e.amountCents / 100;
    expenses += eur;
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + eur;
  }
  // A bill entered both as expense and in the livestock log counts once:
  // a log entry is skipped when an animal_feed/veterinary expense with the
  // same amount lies within ±3 days. Each expense absorbs at most one entry.
  const used = new Set<string>();
  let duplicatesSkipped = 0;
  const isDuplicate = (category: ExpenseCategory, date: string, cost: number) => {
    const cents = Math.round(cost * 100);
    const t = Date.parse(date);
    const match = input.expenses.find(
      (e) => !used.has(e.id) && e.category === category && e.amountCents === cents && Math.abs(Date.parse(e.date) - t) <= DUPLICATE_WINDOW_DAYS * 86_400_000,
    );
    if (!match) return false;
    used.add(match.id);
    duplicatesSkipped++;
    return true;
  };
  const sumLog = (entries: { date: string; cost?: number }[], category: ExpenseCategory) =>
    entries
      .filter((x) => inPeriod(x.date, input.period) && (x.cost ?? 0) > 0 && !isDuplicate(category, x.date, x.cost ?? 0))
      .reduce((s, x) => s + (x.cost ?? 0), 0);
  const feed = sumLog(input.feedEntries ?? [], "animal_feed");
  const veterinary = sumLog(input.healthEvents ?? [], "veterinary");

  const byCategory = { ...expenseByCategory };
  if (feed > 0) byCategory.animal_feed = (byCategory.animal_feed ?? 0) + feed;
  if (veterinary > 0) byCategory.veterinary = (byCategory.veterinary ?? 0) + veterinary;
  return {
    expenses,
    feed,
    veterinary,
    total: expenses + feed + veterinary,
    byCategory,
    expenseByCategory,
    animals: (byCategory.animal_feed ?? 0) + (byCategory.veterinary ?? 0),
    duplicatesSkipped,
  };
}

export interface FeedCostStats {
  /** Calendar month of `now`, € */
  thisMonth: number;
  /** Previous calendar month, € */
  lastMonth: number;
  /** Rolling 30 days up to `now`, € */
  last30Days: number;
  /** All entries, € */
  total: number;
  /**
   * Average per month over the logging span (first entry → now, at least one
   * month), € — the stable figure for "what does feed cost me per month".
   */
  perMonth: number;
  /** Months the average spans (≥ 1). */
  months: number;
  /** Date of the first entry (YYYY-MM-DD), the start of the `perMonth` span. */
  since: string | null;
  /** Entries in the last 30 days. */
  entriesLast30Days: number;
}

/** Feed cost figures from the livestock feed log (one definition for all pages). */
export function getFeedCostStats(feedEntries: FeedEntry[], now: Date = new Date()): FeedCostStats {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const month = iso(now).slice(0, 7);
  const prev = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const from30 = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  const today = iso(now);
  let thisMonth = 0, lastMonth = 0, last30Days = 0, total = 0, entriesLast30Days = 0;
  let first: string | null = null;
  for (const e of feedEntries) {
    const c = e.cost ?? 0;
    total += c;
    if (e.date.startsWith(month)) thisMonth += c;
    if (e.date.startsWith(prev)) lastMonth += c;
    if (e.date >= from30 && e.date <= today) { last30Days += c; entriesLast30Days++; }
    if (first === null || e.date < first) first = e.date;
  }
  const span = first ? (now.getTime() - Date.parse(first)) / (30.44 * 86_400_000) : 1;
  const months = Math.max(1, span);
  return { thisMonth, lastMonth, last30Days, total, perMonth: total / months, months, since: first, entriesLast30Days };
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

/**
 * Share of a product's annual amount expected by `asOf` in the current year,
 * counting only from `since` (e.g. when the animal arrived) if that is later
 * than 1 January. Honey comes in May–August, everything else evenly.
 */
export function expectedShareToDate(type: ProductType, asOf: Date = new Date(), since?: string): number {
  const year = asOf.getFullYear();
  const [start, end] = productWindow(type, year);
  const from = since ? new Date(Math.max(start.getTime(), Date.parse(since))) : start;
  if (from >= end) return 0;
  const full = end.getTime() - start.getTime();
  const covered = Math.max(0, Math.min(asOf.getTime(), end.getTime()) - from.getTime());
  return Math.min(1, covered / full);
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

// ------------------------------------------------------------------ seasonality

const DAY_MS = 86_400_000;

/** Share (0–1) of a [start, end] window that has passed at `asOf`. */
function elapsedShare(start: Date, end: Date, asOf: Date): number {
  if (asOf <= start) return 0;
  if (asOf >= end || end <= start) return 1;
  return (asOf.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

/**
 * Harvest window of a crop in `year`: planting date (last frost shifted by
 * the bed's frost protection, plus transplant/sowing offset) + harvest days.
 * Perennials (harvest after ≥ 1 year) are assumed to crop June–September.
 */
export function harvestWindow(plant: Plant, lastFrostDate: string, protectionWeeks: number, year: number): [Date, Date] {
  if (plant.harvestDaysMax >= 365) return [new Date(year, 5, 1), new Date(year, 8, 30)];
  const [, m, d] = lastFrostDate.split("-").map(Number);
  const frost = new Date(year, (m || 5) - 1, d || 15);
  const offsetWeeks = (plant.transplantWeeks ?? plant.sowOutdoorsWeeks ?? 0) - protectionWeeks;
  const base = new Date(frost.getTime() + offsetWeeks * 7 * DAY_MS);
  return [new Date(base.getTime() + plant.harvestDaysMin * DAY_MS), new Date(base.getTime() + plant.harvestDaysMax * DAY_MS)];
}

/** When animal products come in over the year (honey and wax: May–August harvests, the rest evenly). */
function productWindow(type: ProductType, year: number): [Date, Date] {
  return type === "honey" || type === "wax" ? [new Date(year, 4, 15), new Date(year, 7, 31)] : [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59)];
}

// ------------------------------------------------------------------ self-sufficiency

export interface SelfSufficiency {
  householdSize: number;
  /** Annual calorie need of the household. */
  needKcal: number;
  /** kcal recorded (harvests + animal products up to typical consumption) in the period. */
  actualKcal: number;
  actualPlantKcal: number;
  actualAnimalKcal: number;
  /** kcal the plan should produce in a full season (plants + herd up to typical consumption). */
  forecastKcal: number;
  forecastPlantKcal: number;
  forecastAnimalKcal: number;
  /**
   * Part of the season forecast that should have come in by `asOf` (same
   * time basis as `actualKcal`). null when the period is not the current year.
   */
  forecastToDateKcal: number | null;
  /** actualKcal / needKcal, capped at 1 — share of the *annual* need recorded so far. */
  actualRatio: number;
  /** forecastKcal / needKcal, capped at 1. */
  forecastRatio: number;
  /** forecastToDateKcal / needKcal, capped at 1; null like forecastToDateKcal. */
  forecastToDateRatio: number | null;
  /** Animal products above typical consumption (forecast, edible kg) — not counted. */
  forecastSurplusKg: ProductKg;
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
  /** Needed for the "expected by today" value; defaults to 15 May. */
  lastFrostDate?: string;
  /** Reference date for `forecastToDate*`; defaults to now. */
  asOf?: Date;
}): SelfSufficiency {
  const plantMap = input.plants instanceof Map ? input.plants : new Map(input.plants.map((p) => [p.id, p]));
  const needKcal = annualCalorieNeed(input.householdSize);
  const asOf = input.asOf ?? new Date();

  const actualPlantKcal = harvestCalories(getActualYield(input.harvests, input.period).byPlant, plantMap);
  const actualAnimalKcal = productKgCalories(
    capToConsumption(getActualProductKg(input.animalProducts, input.animals, input.period), input.householdSize).counted,
  );
  const forecastPlantKcal = harvestCalories(getForecastYield(input.gardens, plantMap, input.gridCellSizeCm).byPlant, plantMap);
  const herd = capToConsumption(getForecastProductKg(input.animals), input.householdSize);
  const forecastAnimalKcal = productKgCalories(herd.counted);

  let forecastToDateKcal: number | null = null;
  if (input.period !== null && input.period === asOf.getFullYear()) {
    const year = input.period;
    const frost = input.lastFrostDate ?? `${year}-05-15`;
    const cellArea = (input.gridCellSizeCm / 100) ** 2;
    let kcal = 0;
    for (const g of input.gardens)
      for (const b of g.beds) {
        const protection = getFrostProtectionWeeks(b);
        for (const c of b.cells) {
          const p = plantMap.get(c.plantId);
          if (!p) continue;
          const [start, end] = harvestWindow(p, frost, protection, year);
          kcal += cellArea * (p.expectedYieldKgPerM2 ?? 0) * 10 * (p.caloriesPer100g ?? 0) * elapsedShare(start, end, asOf);
        }
      }
    for (const type of PRODUCT_TYPES) {
      const [start, end] = productWindow(type, year);
      kcal += herd.counted[type] * 10 * PRODUCT_NUTRITION[type].caloriesPer100g * elapsedShare(start, end, asOf);
    }
    forecastToDateKcal = kcal;
  }

  const actualKcal = actualPlantKcal + actualAnimalKcal;
  const forecastKcal = forecastPlantKcal + forecastAnimalKcal;
  return {
    householdSize: input.householdSize,
    needKcal,
    actualKcal,
    actualPlantKcal,
    actualAnimalKcal,
    forecastKcal,
    forecastPlantKcal,
    forecastAnimalKcal,
    forecastToDateKcal,
    actualRatio: Math.min(1, actualKcal / needKcal),
    forecastRatio: Math.min(1, forecastKcal / needKcal),
    forecastToDateRatio: forecastToDateKcal === null ? null : Math.min(1, forecastToDateKcal / needKcal),
    forecastSurplusKg: herd.surplus,
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
