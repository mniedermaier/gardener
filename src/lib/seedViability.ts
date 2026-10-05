/**
 * Horticultural facts about seed: how a crop is propagated, whether it is a
 * perennial, and how long its seed typically stays viable. Used by the seed
 * inventory ("Keimprobe empfohlen") and the "Saatgut benötigt" list.
 */
import type { Plant } from "@/types/plant";

/** Grown from tubers, cloves, crowns, runners or cuttings — not from seed. */
const VEGETATIVE = new Set([
  "potato", "garlic", "strawberry", "raspberry", "blueberry", "currant", "gooseberry", "asparagus", "mint", "rosemary",
]);

/** Plants that stay in the bed for years once established. */
const PERENNIAL = new Set([
  "strawberry", "raspberry", "blueberry", "currant", "gooseberry", "asparagus", "rosemary", "thyme", "mint", "chives",
]);

export type Propagation = "seed" | "vegetative";

export function propagation(plant: Pick<Plant, "id"> | undefined): Propagation {
  return plant && VEGETATIVE.has(plant.id) ? "vegetative" : "seed";
}

export function isPerennial(plant: Pick<Plant, "id" | "category"> | undefined): boolean {
  if (!plant) return false;
  return plant.category === "fruit" || plant.category === "berry" || PERENNIAL.has(plant.id);
}

/**
 * Whether a planted crop needs new seed or planting stock next season.
 * Perennials are already in the ground; they are not on the shopping list.
 */
export function needsNewStock(plant: Pick<Plant, "id" | "category"> | undefined): boolean {
  return Boolean(plant) && !isPerennial(plant);
}

export type ViabilityStatus = "good" | "lastYear" | "testRecommended" | "notApplicable";

export interface Viability {
  status: ViabilityStatus;
  /** Typical years the seed germinates well. */
  viabilityYears: number;
  /** Years of typical viability left from `year` (may be ≤ 0). */
  yearsLeft: number;
}

/** Default when a plant has no data: most vegetable seed keeps 3–4 years. */
const DEFAULT_VIABILITY = 3;

/**
 * Seed is not "expired" after its typical viability — germination rate just
 * drops. Past that point we recommend a germination test instead of a ban.
 */
export function seedViability(plant: Plant | undefined, yearAcquired: number, year = new Date().getFullYear()): Viability {
  const viabilityYears = plant?.seedSaving?.seedViabilityYears ?? DEFAULT_VIABILITY;
  const yearsLeft = yearAcquired + viabilityYears - year;
  if (propagation(plant) === "vegetative") return { status: "notApplicable", viabilityYears, yearsLeft };
  const status: ViabilityStatus = yearsLeft <= 0 ? "testRecommended" : yearsLeft === 1 ? "lastYear" : "good";
  return { status, viabilityYears, yearsLeft };
}
