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
      if (plant.antagonists.includes(cell.plantId)) {
        antagonistCount++;
        if (distX <= 1 && distY <= 1) {
          issues.push({
            severity: "error",
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
      if (plant.companions.includes(cell.plantId)) {
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
