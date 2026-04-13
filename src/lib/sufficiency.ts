import type { Plant, PreservationMethod } from "@/types/plant";
import type { Garden } from "@/types/garden";
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
  freshKg: number;
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

export interface WinterGap {
  months: number[]; // months with <25% coverage
  storedCaloriesNeeded: number;
  storedKgNeeded: number;
}

export interface SufficiencyResult {
  plantYields: PlantYieldEstimate[];
  totalYieldKg: number;
  nutrition: NutritionCoverage;
  gaps: NutritionGap[];
  monthlyFood: MonthlyFood[];
  storageRequirements: StorageRequirement[];
  winterGap: WinterGap | null;
  annualCoveragePercent: number;
}

// --- Constants ---

const DAILY_NEEDS = {
  calories: 2000,
  proteinG: 50,
  vitaminCMg: 90,
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
): SufficiencyResult {
  const plantMap = new Map(plants.map((p) => [p.id, p]));

  // Calculate yields with harvest months
  const plantYields: PlantYieldEstimate[] = [];
  const plantedIds = new Set<string>();
  for (const g of gardens) {
    for (const b of g.beds) {
      const protection = getFrostProtectionWeeks(b);
      for (const c of b.cells) {
        if (!plantedIds.has(c.plantId + "-" + protection)) {
          plantedIds.add(c.plantId + "-" + protection);
        }
      }
    }
  }

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

  const totalYieldKg = plantYields.reduce((s, y) => s + y.estimatedKg, 0);

  // --- Monthly food availability ---
  const monthlyCalories = new Array(12).fill(0);
  const monthlyKg = new Array(12).fill(0);

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
  const storedKg = new Array(12).fill(0);
  const storedCalories = new Array(12).fill(0);

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

  // Build monthly food array
  const monthlyFood: MonthlyFood[] = Array.from({ length: 12 }, (_, month) => {
    const freshCal = monthlyCalories[month];
    const storedCal = storedCalories[month];
    return {
      month,
      freshKg: Math.round(monthlyKg[month] * 10) / 10,
      storedKg: Math.round(storedKg[month] * 10) / 10,
      totalKg: Math.round((monthlyKg[month] + storedKg[month]) * 10) / 10,
      calories: Math.round(freshCal + storedCal),
      caloriesNeeded: Math.round(monthlyCalNeed),
      coveragePercent: Math.min(100, Math.round(((freshCal + storedCal) / monthlyCalNeed) * 100)),
    };
  });

  // Winter gap
  const gapMonths = monthlyFood.filter((m) => m.coveragePercent < 25).map((m) => m.month);
  const winterGap: WinterGap | null = gapMonths.length > 0
    ? {
        months: gapMonths,
        storedCaloriesNeeded: gapMonths.reduce((s, m) => s + monthlyFood[m].caloriesNeeded - monthlyFood[m].calories, 0),
        storedKgNeeded: Math.round(gapMonths.reduce((s, m) => s + monthlyFood[m].caloriesNeeded - monthlyFood[m].calories, 0) / 500), // ~500 cal/kg avg
      }
    : null;

  // Annual coverage
  const totalProducedCal = monthlyFood.reduce((s, m) => s + m.calories, 0);
  const totalNeededCal = monthlyFood.reduce((s, m) => s + m.caloriesNeeded, 0);
  const annualCoveragePercent = Math.min(100, Math.round((totalProducedCal / totalNeededCal) * 100));

  // Overall nutrition (annual)
  const totalCalories = plantYields.reduce((s, y) => s + y.calories, 0);
  const totalProtein = plantYields.reduce((s, y) => s + y.proteinG, 0);
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
    totalYieldKg,
    nutrition,
    gaps,
    monthlyFood,
    storageRequirements,
    winterGap,
    annualCoveragePercent,
  };
}
