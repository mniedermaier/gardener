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

export type PlantingDirection = "rows_ew" | "rows_ns" | "blocks" | "companion_clusters";

export interface RecommendationConfig {
  gridCellSizeCm: number;
  lastFrostDate: string;
  strategy?: PlantingStrategy;
  direction?: PlantingDirection;
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

export const DIRECTION_DETAILS: Record<PlantingDirection, { icon: string; nameKey: string }> = {
  rows_ew: { icon: "\u2194\ufe0f", nameKey: "direction.rows_ew" },
  rows_ns: { icon: "\u2195\ufe0f", nameKey: "direction.rows_ns" },
  blocks: { icon: "\u25a6", nameKey: "direction.blocks" },
  companion_clusters: { icon: "\ud83c\udf3f", nameKey: "direction.companion_clusters" },
};

export function recommendBedPlanting(
  bed: Bed,
  allPlants: Plant[],
  config: RecommendationConfig,
): CellPlanting[] {
  const totalCells = bed.width * bed.height;
  const strategy = config.strategy ?? "balanced";
  const direction = config.direction ?? "rows_ew";

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

  // Filter out antagonist conflicts from the selected set
  const compatible = removeAntagonistConflicts(selected);

  return placePlantsOnGrid(compatible, bed, config.gridCellSizeCm, direction);
}

// --- Plant scoring (unchanged logic) ---

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
      const caloriesPerM2 = cal * yld * 10;
      if (caloriesPerM2 > 3000) { score += 30; reasons.push("high_cal_density"); }
      else if (caloriesPerM2 > 1500) { score += 20; reasons.push("good_cal_density"); }
      else if (caloriesPerM2 > 500) { score += 10; }
      else { score -= 10; }
      break;
    }

    case "selfsufficient": {
      let nutritionScore = 0;
      if ((plant.caloriesPer100g ?? 0) > 30) nutritionScore += 8;
      if ((plant.proteinPer100g ?? 0) > 2) nutritionScore += 10;
      if ((plant.vitaminCPer100g ?? 0) > 20) nutritionScore += 8;
      if ((plant.fiberPer100g ?? 0) > 2) nutritionScore += 6;
      if ((plant.expectedYieldKgPerM2 ?? 0) > 3) nutritionScore += 8;
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
      if (plant.sowOutdoorsWeeks !== null && plant.sowIndoorsWeeks === null) {
        score += 10; reasons.push("direct_sow");
      }
      if (plant.harvestDaysMax <= 60) { score += 10; reasons.push("fast_harvest"); }
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

// --- Plant selection ---

function selectDiversePlants(scored: ScoredPlant[], count: number, strategy: PlantingStrategy): Plant[] {
  const selected: Plant[] = [];
  const usedFamilies = new Set<string>();

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

// Remove plants that are antagonists of each other from the selection.
// Keep the higher-scored plant when conflicts exist.
function removeAntagonistConflicts(plants: Plant[]): Plant[] {
  const result: Plant[] = [];
  for (const plant of plants) {
    const hasConflict = result.some(
      (existing) =>
        existing.antagonists.includes(plant.id) || plant.antagonists.includes(existing.id)
    );
    if (!hasConflict) {
      result.push(plant);
    }
  }
  // Ensure at least 2 plants
  if (result.length < 2 && plants.length >= 2) {
    for (const plant of plants) {
      if (!result.includes(plant)) {
        result.push(plant);
        if (result.length >= 2) break;
      }
    }
  }
  return result;
}

// --- Grid placement (completely rewritten) ---

function placePlantsOnGrid(
  plants: Plant[],
  bed: Bed,
  gridCellSizeCm: number,
  direction: PlantingDirection,
): CellPlanting[] {
  if (plants.length === 0) return [];

  const { width, height } = bed;

  switch (direction) {
    case "rows_ew":
      return placeInRows(plants, width, height, gridCellSizeCm, "horizontal");
    case "rows_ns":
      return placeInRows(plants, width, height, gridCellSizeCm, "vertical");
    case "blocks":
      return placeInBlocks(plants, width, height, gridCellSizeCm);
    case "companion_clusters":
      return placeInCompanionClusters(plants, width, height, gridCellSizeCm);
  }
}

// --- Row-based placement (horizontal or vertical) ---
// Plants get assigned entire rows. Each plant gets consecutive rows.
// Within each row, we respect spacing by leaving cells empty for large-spacing plants.
function placeInRows(
  plants: Plant[],
  width: number,
  height: number,
  gridCellSizeCm: number,
  orientation: "horizontal" | "vertical",
): CellPlanting[] {
  const cells: CellPlanting[] = [];

  // In horizontal mode, rows go left-to-right (y is the row axis)
  // In vertical mode, columns go top-to-bottom (x is the row axis)
  const primaryLen = orientation === "horizontal" ? height : width;
  const secondaryLen = orientation === "horizontal" ? width : height;

  // Calculate how many rows each plant needs based on spacing
  const plantRowCounts = distributeRows(plants, primaryLen, gridCellSizeCm);

  let rowStart = 0;
  for (let pi = 0; pi < plants.length; pi++) {
    const plant = plants[pi];
    const rowCount = plantRowCounts[pi];
    if (rowCount === 0) continue;

    // Calculate step along secondary axis (within-row spacing)
    const stepSecondary = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));
    // Calculate step along primary axis (between-row spacing)
    const stepPrimary = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));

    for (let r = rowStart; r < rowStart + rowCount && r < primaryLen; r += stepPrimary) {
      // Offset every other row for better coverage (staggered planting)
      const offset = ((r - rowStart) / stepPrimary) % 2 === 1 ? Math.floor(stepSecondary / 2) : 0;

      for (let s = offset; s < secondaryLen; s += stepSecondary) {
        if (orientation === "horizontal") {
          cells.push({ cellX: s, cellY: r, plantId: plant.id });
        } else {
          cells.push({ cellX: r, cellY: s, plantId: plant.id });
        }
      }
    }

    rowStart += rowCount;
  }

  return cells;
}

// Distribute rows proportionally across plants, ensuring each plant gets
// at least 1 row and larger-spacing plants don't waste rows.
function distributeRows(plants: Plant[], totalRows: number, gridCellSizeCm: number): number[] {
  if (plants.length === 0) return [];

  // Weight: small-spacing plants should get more rows (they fill densely)
  // Large-spacing plants need fewer rows but more space each
  const weights = plants.map((p) => {
    const rowsNeeded = Math.max(1, Math.round(p.spacingCm / gridCellSizeCm));
    // Give proportionally more cells to dense plants
    return 1 / rowsNeeded;
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const counts = weights.map((w) => Math.max(1, Math.round((w / totalWeight) * totalRows)));

  // Adjust to fit exactly
  let sum = counts.reduce((s, c) => s + c, 0);
  while (sum > totalRows) {
    // Reduce the plant with the most rows
    const maxIdx = counts.indexOf(Math.max(...counts));
    if (counts[maxIdx] > 1) { counts[maxIdx]--; sum--; }
    else break;
  }
  while (sum < totalRows) {
    // Increase the plant with the fewest rows
    const minIdx = counts.indexOf(Math.min(...counts));
    counts[minIdx]++;
    sum++;
  }

  return counts;
}

// --- Block-based placement ---
// Divides the bed into rectangular blocks, one per plant.
// Fills each block fully, respecting spacing within the block.
function placeInBlocks(
  plants: Plant[],
  width: number,
  height: number,
  gridCellSizeCm: number,
): CellPlanting[] {
  const cells: CellPlanting[] = [];
  const blocks = calculateBlocks(plants.length, width, height);

  for (let i = 0; i < plants.length && i < blocks.length; i++) {
    const plant = plants[i];
    const block = blocks[i];
    const step = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));

    for (let y = block.y; y < block.y + block.h; y += step) {
      const offset = ((y - block.y) / step) % 2 === 1 ? Math.floor(step / 2) : 0;
      for (let x = block.x + offset; x < block.x + block.w; x += step) {
        cells.push({ cellX: x, cellY: y, plantId: plant.id });
      }
    }
  }

  return cells;
}

interface Block { x: number; y: number; w: number; h: number }

// Calculate rectangular block regions that tile the bed area.
// Uses alternating horizontal/vertical splits to create roughly square blocks.
function calculateBlocks(count: number, width: number, height: number): Block[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, w: width, h: height }];

  const blocks: Block[] = [];
  splitBlock({ x: 0, y: 0, w: width, h: height }, count, blocks);
  return blocks;
}

function splitBlock(block: Block, count: number, result: Block[]): void {
  if (count <= 1) {
    result.push(block);
    return;
  }

  const half1 = Math.ceil(count / 2);
  const half2 = count - half1;

  // Split along the longer dimension
  if (block.w >= block.h) {
    const splitW = Math.round(block.w * (half1 / count));
    splitBlock({ x: block.x, y: block.y, w: splitW, h: block.h }, half1, result);
    splitBlock({ x: block.x + splitW, y: block.y, w: block.w - splitW, h: block.h }, half2, result);
  } else {
    const splitH = Math.round(block.h * (half1 / count));
    splitBlock({ x: block.x, y: block.y, w: block.w, h: splitH }, half1, result);
    splitBlock({ x: block.x, y: block.y + splitH, w: block.w, h: block.h - splitH }, half2, result);
  }
}

// --- Companion cluster placement ---
// Groups plants that are companions and places them adjacent to each other.
// Each cluster contains a primary plant surrounded by its companions.
function placeInCompanionClusters(
  plants: Plant[],
  width: number,
  height: number,
  gridCellSizeCm: number,
): CellPlanting[] {
  const cells: CellPlanting[] = [];
  const occupied = new Set<string>();
  const key = (x: number, y: number) => `${x}-${y}`;

  // Build companion adjacency: which selected plants are companions?
  const plantIds = new Set(plants.map((p) => p.id));
  const companionMap = new Map<string, string[]>();
  for (const plant of plants) {
    const companions = plant.companions.filter((c) => plantIds.has(c));
    companionMap.set(plant.id, companions);
  }

  // Sort: plants with most companion connections first (they anchor clusters)
  const sorted = [...plants].sort(
    (a, b) => (companionMap.get(b.id)?.length ?? 0) - (companionMap.get(a.id)?.length ?? 0)
  );

  // Place each plant as a group, trying to be near its companions
  const totalCells = width * height;
  const cellsPerPlant = Math.max(1, Math.floor(totalCells / plants.length));

  for (const plant of sorted) {
    const step = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));
    let placed = 0;
    const target = cellsPerPlant;

    // Find the best starting position: near existing companions
    const companionIds = companionMap.get(plant.id) ?? [];
    const startPos = findBestStartPosition(cells, companionIds, width, height, occupied);

    // BFS outward from startPos to place this plant's cells
    const queue: [number, number][] = [startPos];
    const visited = new Set<string>();
    visited.add(key(startPos[0], startPos[1]));

    while (queue.length > 0 && placed < target) {
      const [x, y] = queue.shift()!;

      if (x >= 0 && x < width && y >= 0 && y < height && !occupied.has(key(x, y))) {
        // Check spacing: only apply for same-plant proximity
        const tooClose = step > 1 && cells.some((c) => {
          if (c.plantId !== plant.id) return false;
          const dx = Math.abs(c.cellX - x);
          const dy = Math.abs(c.cellY - y);
          return dx < step && dy < step && (dx + dy) > 0;
        });

        if (!tooClose) {
          cells.push({ cellX: x, cellY: y, plantId: plant.id });
          occupied.add(key(x, y));
          placed++;
        }
      }

      // Add neighbors (4-directional, spiraling outward)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = key(nx, ny);
        if (!visited.has(nk) && nx >= 0 && nx < width && ny >= 0 && ny < height) {
          visited.add(nk);
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Fill any remaining empty cells with the best-fitting plant
  fillRemainingCells(cells, plants, width, height, occupied, gridCellSizeCm);

  return cells;
}

// Find a good starting position for a plant near its companions
function findBestStartPosition(
  existingCells: CellPlanting[],
  companionIds: string[],
  width: number,
  height: number,
  occupied: Set<string>,
): [number, number] {
  if (companionIds.length === 0 || existingCells.length === 0) {
    // Start from the first available cell
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!occupied.has(`${x}-${y}`)) return [x, y];
      }
    }
    return [0, 0];
  }

  // Find cells adjacent to companion plants
  let bestPos: [number, number] = [0, 0];
  let bestScore = -1;

  const companionCells = existingCells.filter((c) => companionIds.includes(c.plantId));
  if (companionCells.length === 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!occupied.has(`${x}-${y}`)) return [x, y];
      }
    }
    return [0, 0];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (occupied.has(`${x}-${y}`)) continue;
      // Score = number of adjacent companion cells
      let score = 0;
      for (const c of companionCells) {
        const dist = Math.abs(c.cellX - x) + Math.abs(c.cellY - y);
        if (dist <= 2) score += 3 - dist; // closer = better
      }
      if (score > bestScore) {
        bestScore = score;
        bestPos = [x, y];
      }
    }
  }

  return bestPos;
}

// Fill remaining empty cells to avoid gaps
function fillRemainingCells(
  cells: CellPlanting[],
  plants: Plant[],
  width: number,
  height: number,
  occupied: Set<string>,
  gridCellSizeCm: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = `${x}-${y}`;
      if (occupied.has(k)) continue;

      // Find the best plant for this empty cell
      let bestPlant: Plant | null = null;
      let bestScore = -Infinity;

      for (const plant of plants) {
        let score = 0;
        const step = Math.max(1, Math.round(plant.spacingCm / gridCellSizeCm));

        // Prefer placing near same-species (continuity)
        let hasSameSpeciesNear = false;
        let hasAntagonistNear = false;

        for (const c of cells) {
          const dx = Math.abs(c.cellX - x);
          const dy = Math.abs(c.cellY - y);

          if (dx <= 1 && dy <= 1 && (dx + dy) > 0) {
            if (c.plantId === plant.id) { score += 5; hasSameSpeciesNear = true; }
            if (plant.antagonists.includes(c.plantId)) { hasAntagonistNear = true; }
            if (plant.companions.includes(c.plantId)) { score += 3; }
          }

          // Same-species spacing check
          if (c.plantId === plant.id && dx < step && dy < step && (dx + dy) > 0) {
            if (step > 1) score -= 20; // Too close
          }
        }

        if (hasAntagonistNear) continue; // Hard reject
        if (hasSameSpeciesNear) score += 2; // Prefer grouping
        if (score > bestScore) {
          bestScore = score;
          bestPlant = plant;
        }
      }

      if (bestPlant) {
        cells.push({ cellX: x, cellY: y, plantId: bestPlant.id });
        occupied.add(k);
      }
    }
  }
}

// --- Public API ---

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
