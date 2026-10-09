import type { Plant, PreservationMethod } from "@/types/plant";
import type { Garden } from "@/types/garden";
import type { Animal } from "@/types/animal";
import type { PantryItem } from "@/types/pantry";
import { PRODUCT_NUTRITION } from "@/types/animal";
import { capToConsumption, DAILY_KCAL_PER_PERSON, getForecastProductKg, PRODUCT_TYPES } from "@/lib/metrics";
import { addWeeks, addDays, parseISO, getMonth } from "date-fns";
import { getFrostProtectionWeeks } from "@/types/garden";

// --- Types ---

export interface PlantYieldEstimate {
  plantId: string;
  areaM2: number;
  estimatedKg: number;
  calories: number;
  proteinG: number;
  vitaminCMg: number;
  fiberG: number;
  harvestMonths: number[]; // 0-11
  preservable: boolean;
}

export interface MonthlyFood {
  month: number; // 0-11
  /** Garden produce eaten fresh in its harvest months (preserved surplus excluded). */
  freshKg: number;
  /** Eggs, honey, meat — kept apart so the garden kg match the yield forecast. */
  animalKg: number;
  storedKg: number;
  totalKg: number;
  calories: number;
  caloriesNeeded: number;
  coveragePercent: number;
}

export interface StorageRequirement {
  plantId: string;
  method: PreservationMethod;
  quantityKg: number;
  shelfLifeMonths: number;
  label: string;
}

export interface NutritionCoverage {
  calories: { produced: number; needed: number; percent: number };
  protein: { produced: number; needed: number; percent: number };
  vitaminC: { produced: number; needed: number; percent: number };
  fiber: { produced: number; needed: number; percent: number };
}

export interface NutritionGap {
  nutrient: "calories" | "protein" | "vitaminC" | "fiber";
  percent: number;
  suggestion: string;
}

/**
 * Months that have to be bridged from storage in a central-European climate
 * (no meaningful fresh harvest): November–April. Only these count towards
 * the *winter* gap; low months in summer are a planning gap, not a storage one.
 */
export const STORAGE_MONTHS = [10, 11, 0, 1, 2, 3];

/** Below this monthly calorie coverage a month counts as a gap. */
export const LOW_COVERAGE_PERCENT = 25;

export interface WinterGap {
  months: number[]; // storage-period months (Nov–Apr) with <25% coverage
  storedCaloriesNeeded: number;
  storedKgNeeded: number;
}

export interface AnimalYieldEstimate {
  animalType: string;
  productType: string;
  quantityKg: number;
  calories: number;
  proteinG: number;
}

export interface SufficiencyResult {
  plantYields: PlantYieldEstimate[];
  animalYields: AnimalYieldEstimate[];
  totalYieldKg: number;
  nutrition: NutritionCoverage;
  gaps: NutritionGap[];
  monthlyFood: MonthlyFood[];
  storageRequirements: StorageRequirement[];
  winterGap: WinterGap | null;
  /** All months (0–11) below LOW_COVERAGE_PERCENT, summer included. */
  lowMonths: number[];
  annualCoveragePercent: number;
}

// --- Constants ---

/**
 * Daily reference intake per adult (DGE reference values, rounded):
 * 2000 kcal (same as metrics.ts), protein 0.8 g/kg × ~65 kg ≈ 50 g,
 * vitamin C 95–110 mg → 100 mg, fibre ≥ 30 g.
 */
const DAILY_NEEDS = {
  calories: DAILY_KCAL_PER_PERSON,
  proteinG: 50,
  vitaminCMg: 100,
  fiberG: 30,
};

// How long each preservation method extends shelf life (months)
const PRESERVATION_SHELF_LIFE: Record<PreservationMethod, number> = {
  freezing: 12,
  canning: 24,
  fermenting: 6,
  drying: 12,
  root_cellar: 6,
};

// Average calories per kg for preservation loss factor
const PRESERVATION_LOSS: Record<PreservationMethod, number> = {
  freezing: 0.9,   // 10% nutrient loss
  canning: 0.8,    // 20% loss
  fermenting: 0.85,
  drying: 0.7,     // concentrated but some loss
  root_cellar: 0.95,
};

const SUGGESTIONS: Record<string, string> = {
  calories: "potato,corn,bean,pumpkin,squash",
  protein: "bean,pea,kale,spinach,broccoli",
  vitaminC: "pepper,kale,broccoli,parsley,strawberry",
  fiber: "pea,bean,kale,raspberry,beetroot",
};

// --- Core Functions ---

export function estimatePlantArea(
  gardens: Garden[],
  plantId: string,
  gridCellSizeCm: number,
): number {
  let cellCount = 0;
  for (const g of gardens) {
    for (const b of g.beds) {
      cellCount += b.cells.filter((c) => c.plantId === plantId).length;
    }
  }
  return cellCount * (gridCellSizeCm / 100) ** 2;
}

export function calculatePlantYield(
  plant: Plant,
  areaM2: number,
): PlantYieldEstimate {
  const yieldKg = areaM2 * (plant.expectedYieldKgPerM2 ?? 0);
  const yieldG = yieldKg * 1000;
  const portions = yieldG / 100;

  return {
    plantId: plant.id,
    areaM2,
    estimatedKg: Math.round(yieldKg * 10) / 10,
    calories: Math.round(portions * (plant.caloriesPer100g ?? 0)),
    proteinG: Math.round(portions * (plant.proteinPer100g ?? 0) * 10) / 10,
    vitaminCMg: Math.round(portions * (plant.vitaminCPer100g ?? 0)),
    fiberG: Math.round(portions * (plant.fiberPer100g ?? 0) * 10) / 10,
    harvestMonths: [],
    preservable: (plant.preservationMethods ?? []).length > 0,
  };
}

function getHarvestMonths(
  plant: Plant,
  lastFrostDate: string,
  frostProtectionWeeks: number,
): number[] {
  const frostDate = parseISO(lastFrostDate);
  const effectiveFrost = addWeeks(frostDate, -frostProtectionWeeks);

  const base = plant.transplantWeeks !== null
    ? addWeeks(effectiveFrost, plant.transplantWeeks)
    : plant.sowOutdoorsWeeks !== null
      ? addWeeks(effectiveFrost, plant.sowOutdoorsWeeks)
      : effectiveFrost;

  const start = addDays(base, plant.harvestDaysMin);
  const end = addDays(base, plant.harvestDaysMax);

  if (plant.harvestDaysMax >= 365) return []; // perennials, skip

  const months = new Set<number>();
  let d = start;
  while (d <= end) {
    months.add(getMonth(d));
    d = addDays(d, 15); // check every 2 weeks
  }
  months.add(getMonth(end));
  return Array.from(months).sort((a, b) => a - b);
}

export function calculateSufficiency(
  gardens: Garden[],
  plants: Plant[],
  familySize: number,
  gridCellSizeCm: number,
  lastFrostDate: string = "2026-05-15",
  animals: Animal[] = [],
  pantryItems: PantryItem[] = [],
  now: Date = new Date(),
): SufficiencyResult {
  const plantMap = new Map(plants.map((p) => [p.id, p]));

  // Calculate yields with harvest months
  const plantYields: PlantYieldEstimate[] = [];
  // Aggregate by plant
  const plantAreas = new Map<string, { area: number; protections: number[] }>();
  for (const g of gardens) {
    for (const b of g.beds) {
      const protection = getFrostProtectionWeeks(b);
      for (const c of b.cells) {
        const existing = plantAreas.get(c.plantId) ?? { area: 0, protections: [] };
        existing.area += (gridCellSizeCm / 100) ** 2;
        if (!existing.protections.includes(protection)) existing.protections.push(protection);
        plantAreas.set(c.plantId, existing);
      }
    }
  }

  for (const [plantId, { area, protections }] of plantAreas) {
    const plant = plantMap.get(plantId);
    if (!plant || area <= 0) continue;
    const yield_ = calculatePlantYield(plant, area);
    // Use max frost protection for harvest months
    yield_.harvestMonths = getHarvestMonths(plant, lastFrostDate, Math.max(...protections));
    plantYields.push(yield_);
  }

  // --- Animal yields ---
  // Typical herd output (metrics.ts), counted only up to the household's
  // typical consumption — the same rule as the headline self-sufficiency, so
  // the nutrition card and the headline never disagree. Non-food products
  // (wax, wool) are left out.
  const herd = capToConsumption(getForecastProductKg(animals), familySize);
  const animalYields: AnimalYieldEstimate[] = [];
  for (const productType of PRODUCT_TYPES) {
    const kg = herd.counted[productType];
    const nutrition = PRODUCT_NUTRITION[productType];
    if (kg <= 0 || nutrition.caloriesPer100g <= 0) continue;
    animalYields.push({
      animalType: "herd",
      productType,
      quantityKg: Math.round(kg * 10) / 10,
      calories: kg * 10 * nutrition.caloriesPer100g,
      proteinG: Math.round(kg * 10 * nutrition.proteinPer100g * 10) / 10,
    });
  }

  const totalAnimalKg = animalYields.reduce((s, y) => s + y.quantityKg, 0);
  const totalYieldKg = plantYields.reduce((s, y) => s + y.estimatedKg, 0) + totalAnimalKg;

  // --- Monthly food availability ---
  const monthlyCalories = Array.from({ length: 12 }, () => 0);
  const monthlyKg = Array.from({ length: 12 }, () => 0);
  const animalKg = Array.from({ length: 12 }, () => 0);

  // Distribute animal production across months
  // Eggs: year-round (all 12 months), honey: May-Sep, meat: spread across year
  for (const ay of animalYields) {
    const months = ay.productType === "honey"
      ? [4, 5, 6, 7, 8] // May-Sep
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // year-round
    const kgPerMonth = ay.quantityKg / months.length;
    const calPerMonth = ay.calories / months.length;
    for (const m of months) {
      animalKg[m] += kgPerMonth;
      monthlyCalories[m] += calPerMonth;
    }
  }

  // Distribute fresh production across harvest months
  for (const y of plantYields) {
    if (y.harvestMonths.length === 0) continue;
    const kgPerMonth = y.estimatedKg / y.harvestMonths.length;
    const calPerMonth = y.calories / y.harvestMonths.length;
    for (const m of y.harvestMonths) {
      monthlyKg[m] += kgPerMonth;
      monthlyCalories[m] += calPerMonth;
    }
  }

  // Calculate storage: surplus from harvest months extends to winter months
  const storedKg = Array.from({ length: 12 }, () => 0);
  const storedCalories = Array.from({ length: 12 }, () => 0);

  // Preserve surplus: if a month produces > 50% more than monthly need, preserve the rest
  const monthlyCalNeed = (DAILY_NEEDS.calories * familySize * 30.5);
  const storageRequirements: StorageRequirement[] = [];

  for (const y of plantYields) {
    if (!y.preservable || y.harvestMonths.length === 0) continue;
    const plant = plantMap.get(y.plantId);
    if (!plant) continue;

    const methods = plant.preservationMethods ?? [];
    if (methods.length === 0) continue;
    const bestMethod = methods[0]; // use first method as primary
    const shelfLife = PRESERVATION_SHELF_LIFE[bestMethod];
    const lossFactor = PRESERVATION_LOSS[bestMethod];

    // Calculate surplus beyond fresh eating
    const totalHarvestCal = y.calories;
    const freshUseCal = Math.min(totalHarvestCal, monthlyCalNeed * y.harvestMonths.length * 0.5);
    const surplusCal = totalHarvestCal - freshUseCal;

    if (surplusCal > 0 && shelfLife > 0) {
      const surplusKg = y.estimatedKg * (surplusCal / totalHarvestCal);
      const preservedCal = surplusCal * lossFactor;
      const preservedKg = surplusKg * lossFactor;

      // Spread preserved food across following months
      const lastHarvestMonth = Math.max(...y.harvestMonths);
      const storageMonths: number[] = [];
      for (let i = 1; i <= shelfLife && i <= 12; i++) {
        const m = (lastHarvestMonth + i) % 12;
        if (!y.harvestMonths.includes(m)) {
          storageMonths.push(m);
        }
      }

      if (storageMonths.length > 0) {
        const calPerStorageMonth = preservedCal / storageMonths.length;
        const kgPerStorageMonth = preservedKg / storageMonths.length;
        for (const m of storageMonths) {
          storedCalories[m] += calPerStorageMonth;
          storedKg[m] += kgPerStorageMonth;
        }
        // The preserved part is no longer eaten fresh: move it out of the
        // harvest months, so no kilogram is counted twice.
        for (const m of y.harvestMonths) {
          monthlyKg[m] -= surplusKg / y.harvestMonths.length;
          monthlyCalories[m] -= surplusCal / y.harvestMonths.length;
        }

        storageRequirements.push({
          plantId: y.plantId,
          method: bestMethod,
          quantityKg: Math.round(surplusKg * 10) / 10,
          shelfLifeMonths: shelfLife,
          label: bestMethod,
        });
      }
    }
  }

  // Real stock from the pantry (not yet consumed): spread evenly from this
  // month until it expires (at most a year). Per month the larger of the
  // simulated preservation and the real stock counts — the stock usually *is*
  // this season's preserved surplus, so adding both would count it twice.
  // The annual coverage below stays a pure forecast.
  const pantryKg = Array.from({ length: 12 }, () => 0);
  const pantryCalories = Array.from({ length: 12 }, () => 0);
  const nowMonth = now.getFullYear() * 12 + now.getMonth();
  for (const item of pantryItems) {
    if (item.consumed || !(item.quantityKg > 0)) continue;
    const exp = parseISO(item.expiresDate);
    const expMonth = Number.isNaN(exp.getTime()) ? nowMonth + 11 : exp.getFullYear() * 12 + exp.getMonth();
    const span = Math.max(1, Math.min(12, expMonth - nowMonth + 1));
    const kcalPerKg = (plantMap.get(item.plantId)?.caloriesPer100g ?? 0) * 10;
    for (let i = 0; i < span; i++) {
      const m = (now.getMonth() + i) % 12;
      pantryKg[m] += item.quantityKg / span;
      pantryCalories[m] += (item.quantityKg * kcalPerKg) / span;
    }
  }
  const simulatedStoredCal = storedCalories.slice();
  for (let m = 0; m < 12; m++) {
    if (pantryKg[m] > storedKg[m]) {
      storedKg[m] = pantryKg[m];
      storedCalories[m] = pantryCalories[m];
    }
  }

  // Build monthly food array
  const monthlyFood: MonthlyFood[] = Array.from({ length: 12 }, (_, month) => {
    const freshCal = monthlyCalories[month];
    const storedCal = storedCalories[month];
    return {
      month,
      freshKg: Math.round(Math.max(0, monthlyKg[month]) * 10) / 10,
      animalKg: Math.round(animalKg[month] * 10) / 10,
      storedKg: Math.round(storedKg[month] * 10) / 10,
      totalKg: Math.round((Math.max(0, monthlyKg[month]) + animalKg[month] + storedKg[month]) * 10) / 10,
      calories: Math.round(freshCal + storedCal),
      caloriesNeeded: Math.round(monthlyCalNeed),
      coveragePercent: Math.min(100, Math.round(((freshCal + storedCal) / monthlyCalNeed) * 100)),
    };
  });

  // Winter gap: only the storage period counts (see STORAGE_MONTHS)
  const lowMonths = monthlyFood.filter((m) => m.coveragePercent < LOW_COVERAGE_PERCENT).map((m) => m.month);
  const gapMonths = lowMonths.filter((m) => STORAGE_MONTHS.includes(m)).sort((a, b) => STORAGE_MONTHS.indexOf(a) - STORAGE_MONTHS.indexOf(b));
  const winterGap: WinterGap | null = gapMonths.length > 0
    ? {
        months: gapMonths,
        storedCaloriesNeeded: gapMonths.reduce((s, m) => s + monthlyFood[m].caloriesNeeded - monthlyFood[m].calories, 0),
        storedKgNeeded: Math.round(gapMonths.reduce((s, m) => s + monthlyFood[m].caloriesNeeded - monthlyFood[m].calories, 0) / 500), // ~500 cal/kg avg
      }
    : null;

  // Annual coverage
  const totalProducedCal = monthlyCalories.reduce((s, c, m) => s + c + simulatedStoredCal[m], 0);
  const totalNeededCal = monthlyFood.reduce((s, m) => s + m.caloriesNeeded, 0);
  const annualCoveragePercent = Math.min(100, Math.round((totalProducedCal / totalNeededCal) * 100));

  // Overall nutrition (annual) - plants + animals
  const animalCalories = animalYields.reduce((s, y) => s + y.calories, 0);
  const animalProtein = animalYields.reduce((s, y) => s + y.proteinG, 0);
  const totalCalories = plantYields.reduce((s, y) => s + y.calories, 0) + animalCalories;
  const totalProtein = plantYields.reduce((s, y) => s + y.proteinG, 0) + animalProtein;
  const totalVitC = plantYields.reduce((s, y) => s + y.vitaminCMg, 0);
  const totalFiber = plantYields.reduce((s, y) => s + y.fiberG, 0);

  const annualNeeds = {
    calories: DAILY_NEEDS.calories * 365 * familySize,
    protein: DAILY_NEEDS.proteinG * 365 * familySize,
    vitaminC: DAILY_NEEDS.vitaminCMg * 365 * familySize,
    fiber: DAILY_NEEDS.fiberG * 365 * familySize,
  };

  const nutrition: NutritionCoverage = {
    calories: {
      produced: totalCalories,
      needed: annualNeeds.calories,
      percent: Math.min(100, Math.round((totalCalories / annualNeeds.calories) * 100)),
    },
    protein: {
      produced: Math.round(totalProtein),
      needed: annualNeeds.protein,
      percent: Math.min(100, Math.round((totalProtein / annualNeeds.protein) * 100)),
    },
    vitaminC: {
      produced: totalVitC,
      needed: annualNeeds.vitaminC,
      percent: Math.min(100, Math.round((totalVitC / annualNeeds.vitaminC) * 100)),
    },
    fiber: {
      produced: Math.round(totalFiber),
      needed: annualNeeds.fiber,
      percent: Math.min(100, Math.round((totalFiber / annualNeeds.fiber) * 100)),
    },
  };

  const gaps: NutritionGap[] = [];
  for (const [nutrient, data] of Object.entries(nutrition)) {
    if (data.percent < 50) {
      gaps.push({
        nutrient: nutrient as NutritionGap["nutrient"],
        percent: data.percent,
        suggestion: SUGGESTIONS[nutrient] ?? "",
      });
    }
  }
  gaps.sort((a, b) => a.percent - b.percent);

  return {
    plantYields,
    animalYields,
    totalYieldKg,
    nutrition,
    gaps,
    monthlyFood,
    storageRequirements,
    winterGap,
    lowMonths,
    annualCoveragePercent,
  };
}

/**
 * Logged harvest per calendar month of `year`, in kg (index 0 = January).
 * The monthly chart shows these for months that are over or running, so past
 * months never contradict the harvest log; the forecast covers the rest.
 */
export function loggedKgByMonth(harvests: { date: string; weightGrams?: number }[], year: number): number[] {
  const out: number[] = Array.from({ length: 12 }, () => 0);
  for (const h of harvests) {
    if (!h.weightGrams || Number(h.date.slice(0, 4)) !== year) continue;
    const m = Number(h.date.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) out[m] += h.weightGrams / 1000;
  }
  return out;
}
