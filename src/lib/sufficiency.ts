import type { Plant } from "@/types/plant";
import type { Garden } from "@/types/garden";

export interface PlantYieldEstimate {
  plantId: string;
  areaM2: number;
  estimatedKg: number;
  calories: number;
  proteinG: number;
  vitaminCMg: number;
  fiberG: number;
}

export interface NutritionCoverage {
  calories: { produced: number; needed: number; percent: number };
  protein: { produced: number; needed: number; percent: number };
  vitaminC: { produced: number; needed: number; percent: number };
  fiber: { produced: number; needed: number; percent: number };
}

export interface SufficiencyResult {
  plantYields: PlantYieldEstimate[];
  totalYieldKg: number;
  nutrition: NutritionCoverage;
  gaps: NutritionGap[];
}

export interface NutritionGap {
  nutrient: "calories" | "protein" | "vitaminC" | "fiber";
  percent: number;
  suggestion: string;
}

// Daily recommended values per person (average adult)
const DAILY_NEEDS = {
  calories: 2000, // kcal
  proteinG: 50,   // g
  vitaminCMg: 90, // mg
  fiberG: 30,     // g
};

// Growing season in days (central European)
const GROWING_SEASON_DAYS = 180;

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
  const cellAreaM2 = (gridCellSizeCm / 100) ** 2;
  return cellCount * cellAreaM2;
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
  };
}

export function calculateSufficiency(
  gardens: Garden[],
  plants: Plant[],
  familySize: number,
  gridCellSizeCm: number,
): SufficiencyResult {
  const plantMap = new Map(plants.map((p) => [p.id, p]));

  // Find all planted plant IDs
  const plantedIds = new Set<string>();
  for (const g of gardens) {
    for (const b of g.beds) {
      for (const c of b.cells) {
        plantedIds.add(c.plantId);
      }
    }
  }

  const plantYields: PlantYieldEstimate[] = [];
  for (const plantId of plantedIds) {
    const plant = plantMap.get(plantId);
    if (!plant) continue;
    const area = estimatePlantArea(gardens, plantId, gridCellSizeCm);
    if (area > 0) {
      plantYields.push(calculatePlantYield(plant, area));
    }
  }

  const totalYieldKg = plantYields.reduce((s, y) => s + y.estimatedKg, 0);
  const totalCalories = plantYields.reduce((s, y) => s + y.calories, 0);
  const totalProtein = plantYields.reduce((s, y) => s + y.proteinG, 0);
  const totalVitC = plantYields.reduce((s, y) => s + y.vitaminCMg, 0);
  const totalFiber = plantYields.reduce((s, y) => s + y.fiberG, 0);

  // Annual need = daily * 365 * family size
  // But garden only produces during growing season, and we're estimating seasonal yield
  // So compare seasonal production against seasonal need
  const seasonalFactor = GROWING_SEASON_DAYS / 365;
  const annualNeeds = {
    calories: DAILY_NEEDS.calories * 365 * familySize,
    protein: DAILY_NEEDS.proteinG * 365 * familySize,
    vitaminC: DAILY_NEEDS.vitaminCMg * 365 * familySize,
    fiber: DAILY_NEEDS.fiberG * 365 * familySize,
  };

  // Assume production covers the growing season; with preservation can extend
  const nutrition: NutritionCoverage = {
    calories: {
      produced: totalCalories,
      needed: Math.round(annualNeeds.calories * seasonalFactor),
      percent: Math.min(100, Math.round((totalCalories / (annualNeeds.calories * seasonalFactor)) * 100)),
    },
    protein: {
      produced: Math.round(totalProtein),
      needed: Math.round(annualNeeds.protein * seasonalFactor),
      percent: Math.min(100, Math.round((totalProtein / (annualNeeds.protein * seasonalFactor)) * 100)),
    },
    vitaminC: {
      produced: totalVitC,
      needed: Math.round(annualNeeds.vitaminC * seasonalFactor),
      percent: Math.min(100, Math.round((totalVitC / (annualNeeds.vitaminC * seasonalFactor)) * 100)),
    },
    fiber: {
      produced: Math.round(totalFiber),
      needed: Math.round(annualNeeds.fiber * seasonalFactor),
      percent: Math.min(100, Math.round((totalFiber / (annualNeeds.fiber * seasonalFactor)) * 100)),
    },
  };

  // Gap analysis
  const gaps: NutritionGap[] = [];
  const SUGGESTIONS: Record<string, string> = {
    calories: "potato,corn,bean,pumpkin",
    protein: "bean,pea,kale,spinach,broccoli",
    vitaminC: "pepper,kale,broccoli,parsley,strawberry",
    fiber: "pea,bean,kale,raspberry,beetroot",
  };

  for (const [nutrient, data] of Object.entries(nutrition)) {
    if (data.percent < 50) {
      gaps.push({
        nutrient: nutrient as NutritionGap["nutrient"],
        percent: data.percent,
        suggestion: SUGGESTIONS[nutrient] ?? "",
      });
    }
  }

  // Sort gaps by lowest coverage first
  gaps.sort((a, b) => a.percent - b.percent);

  return { plantYields, totalYieldKg, nutrition, gaps };
}
