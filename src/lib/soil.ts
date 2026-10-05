/**
 * Soil test interpretation. pH advice depends on what grows in the bed:
 * lime only when the soil is below the crops' preferred range, sulphur only
 * when it is clearly above it (and alkaline) — never for near-neutral soil.
 */

export interface PhRange { min: number; max: number }

/** Preferred soil pH per crop (common horticultural ranges). */
const CROP_PH: Record<string, PhRange> = {
  blueberry: { min: 4.5, max: 5.5 },
  potato: { min: 5.0, max: 6.5 },
  strawberry: { min: 5.5, max: 6.5 },
  raspberry: { min: 5.5, max: 6.5 },
  eggplant: { min: 5.5, max: 6.8 },
  tomato: { min: 6.0, max: 6.8 },
  pepper: { min: 6.0, max: 6.8 },
  corn: { min: 5.8, max: 7.0 },
  pumpkin: { min: 6.0, max: 7.0 },
  squash: { min: 6.0, max: 7.0 },
  zucchini: { min: 6.0, max: 7.0 },
  cucumber: { min: 6.0, max: 7.0 },
  carrot: { min: 6.0, max: 7.0 },
  lettuce: { min: 6.0, max: 7.0 },
  radish: { min: 6.0, max: 7.0 },
  basil: { min: 6.0, max: 7.0 },
  parsley: { min: 6.0, max: 7.0 },
  celery: { min: 6.0, max: 7.0 },
  bean: { min: 6.0, max: 7.5 },
  pea: { min: 6.0, max: 7.5 },
  onion: { min: 6.0, max: 7.5 },
  garlic: { min: 6.0, max: 7.5 },
  leek: { min: 6.0, max: 7.5 },
  chives: { min: 6.0, max: 7.5 },
  beetroot: { min: 6.0, max: 7.5 },
  chard: { min: 6.0, max: 7.5 },
  rosemary: { min: 6.0, max: 7.5 },
  thyme: { min: 6.0, max: 7.5 },
  currant: { min: 6.0, max: 7.0 },
  gooseberry: { min: 6.0, max: 7.0 },
  spinach: { min: 6.5, max: 7.5 },
  cabbage: { min: 6.5, max: 7.5 },
  broccoli: { min: 6.5, max: 7.5 },
  cauliflower: { min: 6.5, max: 7.5 },
  kale: { min: 6.5, max: 7.5 },
  kohlrabi: { min: 6.5, max: 7.5 },
  asparagus: { min: 6.5, max: 7.5 },
};

/** Most vegetables are happy here. */
export const DEFAULT_PH: PhRange = { min: 6.0, max: 7.0 };

/**
 * Target range for a bed: the overlap of its crops' ranges; if the crops
 * disagree (no overlap), the span between the highest minimum and the
 * lowest maximum is widened to cover both, so nothing is "corrected" in a
 * direction that hurts one of them.
 */
export function targetPh(plantIds: Iterable<string>): PhRange {
  const ranges = [...new Set(plantIds)].map((id) => CROP_PH[id]).filter(Boolean);
  if (ranges.length === 0) return DEFAULT_PH;
  const min = Math.max(...ranges.map((r) => r.min));
  const max = Math.min(...ranges.map((r) => r.max));
  return min <= max ? { min, max } : { min: max, max: min };
}

export type PhAdvice =
  | "limeStrong"      // well below target: lime
  | "limeLight"       // slightly below: a little lime / algae lime
  | "optimal"
  | "noLime"          // slightly above: no lime, organic matter, no sulphur needed
  | "sulfur";         // clearly above target and alkaline: sulphur

/** Margin (pH units) that separates "slightly" from "clearly" off target. */
const MARGIN = 0.5;

export function phAdvice(ph: number, target: PhRange = DEFAULT_PH): PhAdvice {
  if (ph < target.min - MARGIN) return "limeStrong";
  if (ph < target.min) return "limeLight";
  if (ph <= target.max) return "optimal";
  // Sulphur only for clearly alkaline soil well above what the crops want.
  if (ph >= 7.5 && ph - target.max >= MARGIN) return "sulfur";
  return "noLime";
}

export type NutrientLevel = "low" | "optimal" | "high";
export type Nutrient = "nitrogen" | "phosphorus" | "potassium" | "organicMatter";

/** Rough optimal bands for home-garden soil tests (ppm; organic matter in %). */
export const NUTRIENT_RANGE: Record<Nutrient, { min: number; max: number; scaleMax: number }> = {
  nitrogen: { min: 25, max: 50, scaleMax: 100 },
  phosphorus: { min: 25, max: 50, scaleMax: 100 },
  potassium: { min: 120, max: 250, scaleMax: 400 },
  organicMatter: { min: 3, max: 8, scaleMax: 12 },
};

export function nutrientLevel(n: Nutrient, value: number): NutrientLevel {
  const r = NUTRIENT_RANGE[n];
  return value < r.min ? "low" : value > r.max ? "high" : "optimal";
}
