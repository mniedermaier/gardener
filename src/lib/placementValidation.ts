import type { Plant } from "@/types/plant";
import type { Bed, EnvironmentType } from "@/types/garden";

export type ValidationSeverity = "error" | "warning" | "info";

export interface PlacementIssue {
  severity: ValidationSeverity;
  type: "antagonist" | "spacing" | "environment" | "duplicate";
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

export interface PlacementResult {
  issues: PlacementIssue[];
  companionCount: number;
  antagonistCount: number;
  isRecommended: boolean;
}

const ENV_SUN_MAP: Partial<Record<EnvironmentType, "full" | "partial" | "shade">> = {
  greenhouse: "full",
  windowsill: "partial",
};

export function validatePlacement(
  plantId: string,
  cellX: number,
  cellY: number,
  bed: Bed,
  plantMap: Map<string, Plant>,
  gridCellSizeCm: number,
): PlacementResult {
  const plant = plantMap.get(plantId);
  if (!plant) return { issues: [], companionCount: 0, antagonistCount: 0, isRecommended: false };

  const issues: PlacementIssue[] = [];
  let companionCount = 0;
  let antagonistCount = 0;

  // Check all existing cells in the bed
  for (const cell of bed.cells) {
    const neighbor = plantMap.get(cell.plantId);
    if (!neighbor) continue;

    const distX = Math.abs(cell.cellX - cellX);
    const distY = Math.abs(cell.cellY - cellY);
    const distCm = Math.sqrt((distX * gridCellSizeCm) ** 2 + (distY * gridCellSizeCm) ** 2);

    // Antagonist check (within 3 cells ~90cm)
    if (distX <= 3 && distY <= 3) {
      if (plant.antagonists.includes(cell.plantId) || neighbor.antagonists.includes(plantId)) {
        antagonistCount++;
        // Bad neighbours are advice, not a ban: placing stays possible.
        if (distX <= 1 && distY <= 1) {
          issues.push({
            severity: "warning",
            type: "antagonist",
            messageKey: "validation.antagonistDirect",
            messageParams: { plant: plantId, neighbor: cell.plantId },
          });
        } else {
          issues.push({
            severity: "warning",
            type: "antagonist",
            messageKey: "validation.antagonistNear",
            messageParams: { plant: plantId, neighbor: cell.plantId },
          });
        }
      }
      if (plant.companions.includes(cell.plantId) || neighbor.companions.includes(plantId)) {
        companionCount++;
      }
    }

    // Spacing check for same species - only warn if MUCH too close
    // In a grid system, one cell apart is the expected minimum spacing.
    // Only warn if plants are in the exact same or directly adjacent cell
    // AND the plant needs significantly more space than the grid provides.
    if (cell.plantId === plantId && distCm > 0) {
      if (distCm < plant.spacingCm * 0.4) {
        issues.push({
          severity: "warning",
          type: "spacing",
          messageKey: "validation.tooClose",
          messageParams: { spacing: plant.spacingCm, actual: Math.round(distCm) },
        });
      }
    }
  }

  // Environment-plant match
  const envType = bed.environmentType ?? "outdoor_bed";
  const envSun = ENV_SUN_MAP[envType];
  if (envSun) {
    if (plant.sunRequirement === "shade" && envSun === "full") {
      issues.push({
        severity: "warning",
        type: "environment",
        messageKey: "validation.tooMuchSun",
      });
    }
  }

  // Container volume check
  if (envType === "container" && bed.containerConfig) {
    const plantVolume = (plant.spacingCm / 100) * (plant.rowSpacingCm / 100) * 0.3 * 1000; // rough liters
    if (plantVolume > bed.containerConfig.volumeLiters * 0.7) {
      issues.push({
        severity: "warning",
        type: "environment",
        messageKey: "validation.containerTooSmall",
      });
    }
  }

  const isRecommended = companionCount > 0 && antagonistCount === 0 && issues.filter((i) => i.severity === "error").length === 0;

  return { issues, companionCount, antagonistCount, isRecommended };
}

export function getCompanionHighlights(
  plantId: string,
  bed: Bed,
  plantMap: Map<string, Plant>,
): Set<string> {
  const plant = plantMap.get(plantId);
  if (!plant) return new Set();

  const highlighted = new Set<string>();
  for (const cell of bed.cells) {
    if (plant.companions.includes(cell.plantId)) {
      highlighted.add(`${cell.cellX}-${cell.cellY}`);
    }
  }
  return highlighted;
}

export function getAntagonistHighlights(
  plantId: string,
  bed: Bed,
  plantMap: Map<string, Plant>,
): Set<string> {
  const plant = plantMap.get(plantId);
  if (!plant) return new Set();

  const highlighted = new Set<string>();
  for (const cell of bed.cells) {
    if (plant.antagonists.includes(cell.plantId)) {
      highlighted.add(`${cell.cellX}-${cell.cellY}`);
    }
  }
  return highlighted;
}

export function calculateBedScore(bed: Bed, plantMap: Map<string, Plant>): {
  companionPairs: number;
  antagonistPairs: number;
  score: number; // 0-100
} {
  let companionPairs = 0;
  let antagonistPairs = 0;
  const checked = new Set<string>();

  for (const cell of bed.cells) {
    const plant = plantMap.get(cell.plantId);
    if (!plant) continue;

    for (const other of bed.cells) {
      if (cell === other) continue;
      const key = [cell.cellX, cell.cellY, other.cellX, other.cellY].sort().join(",");
      if (checked.has(key)) continue;
      checked.add(key);

      const distX = Math.abs(cell.cellX - other.cellX);
      const distY = Math.abs(cell.cellY - other.cellY);
      if (distX > 2 || distY > 2) continue;

      if (plant.companions.includes(other.plantId)) companionPairs++;
      if (plant.antagonists.includes(other.plantId)) antagonistPairs++;
    }
  }

  const total = companionPairs + antagonistPairs;
  if (total === 0) return { companionPairs, antagonistPairs, score: 50 };
  const score = Math.round((companionPairs / total) * 100);
  return { companionPairs, antagonistPairs, score };
}

// --- Direct-neighbour analysis (8-neighbourhood) ---------------------------

export type CellSide = "top" | "right" | "bottom" | "left";

export interface NeighbourCell {
  x: number;
  y: number;
  plantId: string;
}

/** Two directly adjacent plantings that are bad neighbours. */
export interface ConflictPair {
  a: NeighbourCell;
  b: NeighbourCell;
}

export interface CellConflict {
  /** Orthogonal sides that touch a conflicting neighbour (drawn as a red edge). */
  sides: CellSide[];
  /** Diagonal conflicts only (drawn as a corner mark). */
  diagonal: boolean;
  /** Plant ids of the conflicting neighbours. */
  partners: string[];
}

const isBadPair = (a: Plant | undefined, b: Plant | undefined) =>
  !!a && !!b && (a.antagonists.includes(b.id) || b.antagonists.includes(a.id));
const isGoodPair = (a: Plant | undefined, b: Plant | undefined) =>
  !!a && !!b && a.id !== b.id && (a.companions.includes(b.id) || b.companions.includes(a.id));

// Each unordered neighbour pair is visited exactly once.
const FORWARD: Array<[number, number]> = [[1, 0], [0, 1], [1, 1], [-1, 1]];

/**
 * Concrete neighbour pairs in a bed: conflicts (antagonists touching, incl.
 * diagonals) and the number of good companion pairs. Only direct neighbours
 * count — a tomato three cells away from a cucumber is not a conflict.
 */
export function analyzeNeighbours(bed: Bed, plantMap: Map<string, Plant>): { conflicts: ConflictPair[]; companionPairs: number } {
  const byKey = new Map<string, NeighbourCell>();
  for (const c of bed.cells) byKey.set(`${c.cellX}-${c.cellY}`, { x: c.cellX, y: c.cellY, plantId: c.plantId });
  const conflicts: ConflictPair[] = [];
  let companionPairs = 0;
  for (const a of byKey.values()) {
    const pa = plantMap.get(a.plantId);
    for (const [dx, dy] of FORWARD) {
      const b = byKey.get(`${a.x + dx}-${a.y + dy}`);
      if (!b) continue;
      const pb = plantMap.get(b.plantId);
      if (isBadPair(pa, pb)) conflicts.push({ a, b });
      else if (isGoodPair(pa, pb)) companionPairs++;
    }
  }
  return { conflicts, companionPairs };
}

/** Per-cell view of the conflict pairs, keyed "x-y". */
export function getCellConflicts(pairs: ConflictPair[]): Map<string, CellConflict> {
  const map = new Map<string, CellConflict>();
  const entry = (c: NeighbourCell) => {
    const key = `${c.x}-${c.y}`;
    let e = map.get(key);
    if (!e) {
      e = { sides: [], diagonal: false, partners: [] };
      map.set(key, e);
    }
    return e;
  };
  const sideOf = (from: NeighbourCell, to: NeighbourCell): CellSide | null => {
    if (to.x === from.x + 1 && to.y === from.y) return "right";
    if (to.x === from.x - 1 && to.y === from.y) return "left";
    if (to.y === from.y + 1 && to.x === from.x) return "bottom";
    if (to.y === from.y - 1 && to.x === from.x) return "top";
    return null;
  };
  for (const { a, b } of pairs) {
    for (const [self, other] of [[a, b], [b, a]] as const) {
      const e = entry(self);
      const side = sideOf(self, other);
      if (side) {
        if (!e.sides.includes(side)) e.sides.push(side);
      } else {
        e.diagonal = true;
      }
      if (!e.partners.includes(other.plantId)) e.partners.push(other.plantId);
    }
  }
  return map;
}

/**
 * Where would `plantId` fit? For every free, non-path cell: "bad" when a
 * direct neighbour is an antagonist (placing there is refused), "good" when a
 * direct neighbour is a companion and none is an antagonist.
 */
export function getPlacementHints(plantId: string, bed: Bed, plantMap: Map<string, Plant>): Map<string, "good" | "bad"> {
  const plant = plantMap.get(plantId);
  const hints = new Map<string, "good" | "bad">();
  if (!plant) return hints;
  const occupied = new Map<string, string>();
  for (const c of bed.cells) occupied.set(`${c.cellX}-${c.cellY}`, c.plantId);
  const paths = new Set(bed.paths ?? []);
  for (let y = 0; y < bed.height; y++) {
    for (let x = 0; x < bed.width; x++) {
      const key = `${x}-${y}`;
      if (occupied.has(key) || paths.has(key)) continue;
      let good = false;
      let bad = false;
      for (let dy = -1; dy <= 1 && !bad; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const n = occupied.get(`${x + dx}-${y + dy}`);
          if (!n) continue;
          const np = plantMap.get(n);
          if (isBadPair(plant, np)) { bad = true; break; }
          if (isGoodPair(plant, np)) good = true;
        }
      }
      if (bad) hints.set(key, "bad");
      else if (good) hints.set(key, "good");
    }
  }
  return hints;
}
