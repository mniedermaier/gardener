import type { Plant } from "@/types/plant";
import type { Bed, CellPlanting } from "@/types/garden";
import { plantFamilyMap, type PlantFamily } from "@/data/plantFamilies";
import { differenceInWeeks, parseISO, addWeeks } from "date-fns";

interface RecommendationConfig {
  gridCellSizeCm: number;
  lastFrostDate: string;
  excludeFamilies?: PlantFamily[];
  preferCompanionsOf?: string[]; // plant IDs already planted in other beds
}

interface ScoredPlant {
  plant: Plant;
  score: number;
  reasons: string[];
}

export function recommendBedPlanting(
  bed: Bed,
  allPlants: Plant[],
  config: RecommendationConfig,
): CellPlanting[] {
  const totalCells = bed.width * bed.height;

  // Score each plant for this bed
  const scored = allPlants
    .filter((p) => p.category !== "berry") // berries are perennials, less suited for annual bed planning
    .map((p) => scorePlant(p, bed, config))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  // Pick diverse plants (top scorers, different families)
  const selected = selectDiversePlants(scored, Math.min(6, Math.ceil(totalCells / 3)));

  // Place them on the grid respecting spacing
  return placePlantsOnGrid(selected, bed, config.gridCellSizeCm);
}

function scorePlant(plant: Plant, bed: Bed, config: RecommendationConfig): ScoredPlant {
  let score = 50; // base
  const reasons: string[] = [];

  // Season check: is it a good time to plant this?
  const now = new Date();
  const frostDate = parseISO(config.lastFrostDate);

  if (plant.sowOutdoorsWeeks !== null) {
    const sowDate = addWeeks(frostDate, plant.sowOutdoorsWeeks);
    const weeksDiff = Math.abs(differenceInWeeks(sowDate, now));
    if (weeksDiff <= 2) { score += 20; reasons.push("season_perfect"); }
    else if (weeksDiff <= 6) { score += 10; reasons.push("season_good"); }
    else if (weeksDiff > 12) { score -= 20; }
  } else if (plant.sowIndoorsWeeks !== null) {
    const sowDate = addWeeks(frostDate, plant.sowIndoorsWeeks);
    const weeksDiff = Math.abs(differenceInWeeks(sowDate, now));
    if (weeksDiff <= 4) { score += 15; reasons.push("season_indoor"); }
  }

  // Environment match
  const envType = bed.environmentType ?? "outdoor_bed";
  if (envType === "greenhouse" || envType === "polytunnel") {
    if (plant.sunRequirement === "full" && plant.waterNeed === "high") {
      score += 10; reasons.push("env_greenhouse_ideal");
    }
  }
  if (envType === "windowsill") {
    if (plant.category === "herb") { score += 15; reasons.push("env_windowsill_herb"); }
    if (plant.spacingCm > 40) { score -= 20; } // too big for windowsill
  }
  if (envType === "container") {
    if (plant.spacingCm <= 30) { score += 5; }
    if (plant.spacingCm > 60) { score -= 15; }
  }

  // Companion preference (from other beds)
  if (config.preferCompanionsOf) {
    for (const otherId of config.preferCompanionsOf) {
      if (plant.companions.includes(otherId)) { score += 5; }
    }
  }

  // Exclude families (crop rotation)
  if (config.excludeFamilies) {
    const family = plantFamilyMap[plant.id];
    if (family && config.excludeFamilies.includes(family)) {
      score -= 30;
      reasons.push("rotation_avoid");
    }
  }

  // Nutrition diversity bonus
  if (plant.caloriesPer100g && plant.caloriesPer100g > 40) { score += 5; reasons.push("calorie_dense"); }
  if (plant.proteinPer100g && plant.proteinPer100g > 3) { score += 5; reasons.push("protein_rich"); }
  if (plant.vitaminCPer100g && plant.vitaminCPer100g > 50) { score += 5; reasons.push("vitaminc_rich"); }

  // Yield bonus
  if (plant.expectedYieldKgPerM2 && plant.expectedYieldKgPerM2 > 4) { score += 5; }

  // Easy to grow bonus
  if (plant.waterNeed === "low") { score += 3; }

  return { plant, score: Math.max(0, score), reasons };
}

function selectDiversePlants(scored: ScoredPlant[], count: number): Plant[] {
  const selected: Plant[] = [];
  const usedFamilies = new Set<string>();

  for (const s of scored) {
    if (selected.length >= count) break;
    const family = plantFamilyMap[s.plant.id] ?? "other";

    // Prefer different families for diversity
    if (usedFamilies.has(family) && selected.length < count - 1) {
      // Allow one duplicate family at the end
      continue;
    }

    selected.push(s.plant);
    usedFamilies.add(family);
  }

  // If we didn't fill enough from diversity, add top scorers
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

  // Divide bed into zones for each plant
  const totalCells = bed.width * bed.height;
  const cellsPerPlant = Math.max(1, Math.floor(totalCells / plants.length));

  let cellIndex = 0;
  for (const plant of plants) {
    // Calculate how many cells this plant should skip based on spacing
    const spacingCells = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));
    let placed = 0;
    const maxForThisPlant = Math.min(cellsPerPlant, Math.ceil(cellsPerPlant / (spacingCells * spacingCells)) * (spacingCells * spacingCells));

    for (let i = 0; i < maxForThisPlant && cellIndex < totalCells; i++) {
      const x = cellIndex % bed.width;
      const y = Math.floor(cellIndex / bed.width);
      const key = `${x}-${y}`;

      if (!occupied.has(key)) {
        // Check spacing from same species
        const tooClose = cells.some((c) => {
          if (c.plantId !== plant.id) return false;
          const dist = Math.sqrt(
            ((c.cellX - x) * gridCellSizeCm) ** 2 +
            ((c.cellY - y) * gridCellSizeCm) ** 2
          );
          return dist < plant.spacingCm * 0.4;
        });

        if (!tooClose) {
          // Check no antagonist adjacent
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

    // If we couldn't place any, skip remaining cells for this plant
    if (placed === 0) {
      cellIndex += cellsPerPlant;
    }
  }

  return cells;
}

export function getRecommendedPlants(
  bed: Bed,
  allPlants: Plant[],
  config: RecommendationConfig,
): Array<{ plant: Plant; score: number; reasons: string[] }> {
  return allPlants
    .map((p) => scorePlant(p, bed, config))
    .filter((s) => s.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => ({ plant: s.plant, score: s.score, reasons: s.reasons }));
}
