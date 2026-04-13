import type { Plant } from "@/types/plant";
import type { Bed, CellPlanting } from "@/types/garden";
import { plantFamilyMap, type PlantFamily } from "@/data/plantFamilies";
import { differenceInWeeks, parseISO, addWeeks } from "date-fns";

export type PlantingStrategy =
  | "balanced"       // Default: mix of everything
  | "calories"       // Maximize calorie production
  | "selfsufficient" // Maximize nutritional coverage (protein, vitC, fiber, calories)
  | "yield"          // Maximize kg output
  | "beginner"       // Easy to grow, low maintenance
  | "quickharvest";  // Fastest time to harvest

export interface RecommendationConfig {
  gridCellSizeCm: number;
  lastFrostDate: string;
  strategy?: PlantingStrategy;
  excludeFamilies?: PlantFamily[];
  preferCompanionsOf?: string[];
}

interface ScoredPlant {
  plant: Plant;
  score: number;
  reasons: string[];
}

export const STRATEGY_DETAILS: Record<PlantingStrategy, { icon: string; nameKey: string; descKey: string }> = {
  balanced: { icon: "\u2696\ufe0f", nameKey: "strategy.balanced", descKey: "strategy.balancedDesc" },
  calories: { icon: "\ud83d\udd25", nameKey: "strategy.calories", descKey: "strategy.caloriesDesc" },
  selfsufficient: { icon: "\ud83c\udf3d", nameKey: "strategy.selfsufficient", descKey: "strategy.selfsufficientDesc" },
  yield: { icon: "\ud83d\udcca", nameKey: "strategy.yield", descKey: "strategy.yieldDesc" },
  beginner: { icon: "\ud83c\udf31", nameKey: "strategy.beginner", descKey: "strategy.beginnerDesc" },
  quickharvest: { icon: "\u26a1", nameKey: "strategy.quickharvest", descKey: "strategy.quickharvestDesc" },
};

export function recommendBedPlanting(
  bed: Bed,
  allPlants: Plant[],
  config: RecommendationConfig,
): CellPlanting[] {
  const totalCells = bed.width * bed.height;
  const strategy = config.strategy ?? "balanced";

  const scored = allPlants
    .filter((p) => p.category !== "berry")
    .map((p) => scorePlant(p, bed, config, strategy))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const plantCount = strategy === "yield" || strategy === "calories"
    ? Math.min(4, Math.ceil(totalCells / 4)) // fewer types, more of each
    : Math.min(6, Math.ceil(totalCells / 3));

  const selected = selectDiversePlants(scored, plantCount, strategy);
  return placePlantsOnGrid(selected, bed, config.gridCellSizeCm);
}

function scorePlant(
  plant: Plant,
  bed: Bed,
  config: RecommendationConfig,
  strategy: PlantingStrategy,
): ScoredPlant {
  let score = 30;
  const reasons: string[] = [];

  // --- Base scores (always applied) ---

  // Season check
  const now = new Date();
  const frostDate = parseISO(config.lastFrostDate);

  if (plant.sowOutdoorsWeeks !== null) {
    const sowDate = addWeeks(frostDate, plant.sowOutdoorsWeeks);
    const weeksDiff = Math.abs(differenceInWeeks(sowDate, now));
    if (weeksDiff <= 2) { score += 15; reasons.push("season_perfect"); }
    else if (weeksDiff <= 6) { score += 8; reasons.push("season_good"); }
    else if (weeksDiff > 12) { score -= 15; }
  } else if (plant.sowIndoorsWeeks !== null) {
    const sowDate = addWeeks(frostDate, plant.sowIndoorsWeeks);
    const weeksDiff = Math.abs(differenceInWeeks(sowDate, now));
    if (weeksDiff <= 4) { score += 10; reasons.push("season_indoor"); }
  }

  // Environment match
  const envType = bed.environmentType ?? "outdoor_bed";
  if (envType === "greenhouse" || envType === "polytunnel") {
    if (plant.sunRequirement === "full" && plant.waterNeed === "high") {
      score += 8; reasons.push("env_greenhouse_ideal");
    }
  }
  if (envType === "windowsill") {
    if (plant.category === "herb") { score += 15; reasons.push("env_windowsill_herb"); }
    if (plant.spacingCm > 40) { score -= 20; }
  }
  if (envType === "container" && plant.spacingCm > 60) { score -= 15; }

  // Crop rotation
  if (config.excludeFamilies) {
    const family = plantFamilyMap[plant.id];
    if (family && config.excludeFamilies.includes(family)) {
      score -= 30; reasons.push("rotation_avoid");
    }
  }

  // Companion preference
  if (config.preferCompanionsOf) {
    for (const otherId of config.preferCompanionsOf) {
      if (plant.companions.includes(otherId)) { score += 3; }
    }
  }

  // --- Strategy-specific scoring ---

  switch (strategy) {
    case "calories": {
      const cal = plant.caloriesPer100g ?? 0;
      const yld = plant.expectedYieldKgPerM2 ?? 0;
      const caloriesPerM2 = cal * yld * 10; // kcal per m2
      if (caloriesPerM2 > 3000) { score += 30; reasons.push("high_cal_density"); }
      else if (caloriesPerM2 > 1500) { score += 20; reasons.push("good_cal_density"); }
      else if (caloriesPerM2 > 500) { score += 10; }
      else { score -= 10; }
      break;
    }

    case "selfsufficient": {
      // Reward plants that cover multiple nutritional needs
      let nutritionScore = 0;
      if ((plant.caloriesPer100g ?? 0) > 30) nutritionScore += 8;
      if ((plant.proteinPer100g ?? 0) > 2) nutritionScore += 10;
      if ((plant.vitaminCPer100g ?? 0) > 20) nutritionScore += 8;
      if ((plant.fiberPer100g ?? 0) > 2) nutritionScore += 6;
      if ((plant.expectedYieldKgPerM2 ?? 0) > 3) nutritionScore += 8;
      // Bonus for storable plants
      if (plant.preservationMethods && plant.preservationMethods.length >= 2) {
        nutritionScore += 5; reasons.push("preservable");
      }
      score += nutritionScore;
      if (nutritionScore >= 25) reasons.push("nutritionally_complete");
      break;
    }

    case "yield": {
      const yld = plant.expectedYieldKgPerM2 ?? 0;
      if (yld >= 6) { score += 30; reasons.push("very_high_yield"); }
      else if (yld >= 4) { score += 20; reasons.push("high_yield"); }
      else if (yld >= 2) { score += 10; }
      else { score -= 10; }
      break;
    }

    case "beginner": {
      if (plant.waterNeed === "low") { score += 15; reasons.push("low_maintenance"); }
      else if (plant.waterNeed === "medium") { score += 8; }
      else { score -= 5; }
      // Prefer direct sow (no transplanting hassle)
      if (plant.sowOutdoorsWeeks !== null && plant.sowIndoorsWeeks === null) {
        score += 10; reasons.push("direct_sow");
      }
      // Prefer fast harvest (rewarding for beginners)
      if (plant.harvestDaysMax <= 60) { score += 10; reasons.push("fast_harvest"); }
      // Easy seed saving
      if (plant.seedSaving?.difficulty === "easy") { score += 5; }
      break;
    }

    case "quickharvest": {
      const days = plant.harvestDaysMin;
      if (days <= 30) { score += 30; reasons.push("ultra_fast"); }
      else if (days <= 50) { score += 20; reasons.push("fast"); }
      else if (days <= 70) { score += 10; }
      else { score -= 10; }
      break;
    }

    case "balanced":
    default: {
      // Gentle bonuses for everything
      if ((plant.caloriesPer100g ?? 0) > 40) { score += 5; }
      if ((plant.proteinPer100g ?? 0) > 3) { score += 5; }
      if ((plant.vitaminCPer100g ?? 0) > 50) { score += 5; }
      if ((plant.expectedYieldKgPerM2 ?? 0) > 4) { score += 5; }
      if (plant.waterNeed === "low") { score += 3; }
      break;
    }
  }

  return { plant, score: Math.max(0, score), reasons };
}

function selectDiversePlants(scored: ScoredPlant[], count: number, strategy: PlantingStrategy): Plant[] {
  const selected: Plant[] = [];
  const usedFamilies = new Set<string>();

  // For calorie/yield strategies, allow more of the same family
  const allowDuplicateFamilies = strategy === "calories" || strategy === "yield";

  for (const s of scored) {
    if (selected.length >= count) break;
    const family = plantFamilyMap[s.plant.id] ?? "other";

    if (!allowDuplicateFamilies && usedFamilies.has(family) && selected.length < count - 1) {
      continue;
    }

    selected.push(s.plant);
    usedFamilies.add(family);
  }

  if (selected.length < count) {
    for (const s of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(s.plant)) {
        selected.push(s.plant);
      }
    }
  }

  return selected;
}

function placePlantsOnGrid(
  plants: Plant[],
  bed: Bed,
  gridCellSizeCm: number,
): CellPlanting[] {
  const cells: CellPlanting[] = [];
  const occupied = new Set<string>();
  const totalCells = bed.width * bed.height;
  const cellsPerPlant = Math.max(1, Math.floor(totalCells / plants.length));

  let cellIndex = 0;
  for (const plant of plants) {
    let placed = 0;
    const maxForThisPlant = cellsPerPlant;

    for (let i = 0; i < maxForThisPlant && cellIndex < totalCells; i++) {
      const x = cellIndex % bed.width;
      const y = Math.floor(cellIndex / bed.width);
      const key = `${x}-${y}`;

      if (!occupied.has(key)) {
        const tooClose = cells.some((c) => {
          if (c.plantId !== plant.id) return false;
          const dist = Math.sqrt(
            ((c.cellX - x) * gridCellSizeCm) ** 2 +
            ((c.cellY - y) * gridCellSizeCm) ** 2
          );
          return dist < plant.spacingCm * 0.4;
        });

        if (!tooClose) {
          const hasAntagonist = cells.some((c) => {
            if (Math.abs(c.cellX - x) > 1 || Math.abs(c.cellY - y) > 1) return false;
            return plant.antagonists.includes(c.plantId);
          });

          if (!hasAntagonist) {
            cells.push({ cellX: x, cellY: y, plantId: plant.id });
            occupied.add(key);
            placed++;
          }
        }
      }
      cellIndex++;
    }

    if (placed === 0) cellIndex += cellsPerPlant;
  }

  return cells;
}

export function getRecommendedPlants(
  bed: Bed,
  allPlants: Plant[],
  config: RecommendationConfig,
): Array<{ plant: Plant; score: number; reasons: string[] }> {
  const strategy = config.strategy ?? "balanced";
  return allPlants
    .map((p) => scorePlant(p, bed, config, strategy))
    .filter((s) => s.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => ({ plant: s.plant, score: s.score, reasons: s.reasons }));
}
