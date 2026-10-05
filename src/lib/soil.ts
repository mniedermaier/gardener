/**
 * Soil test interpretation. pH advice depends on what grows in the bed:
 * lime only when the soil is below the crops' preferred range, sulphur only
 * when it is clearly above it (and alkaline) — never for near-neutral soil.
 *
 * Crop-specific rules (horticultural consensus, e.g. LWG/LfL Bavaria, RHS):
 * - **Lime-averse** crops veto liming: potatoes (lime promotes common scab,
 *   *Streptomyces scabies*, thrives above pH 6), blueberries (calcifuge, need
 *   pH 4.5–5.5), raspberries and strawberries (lime-induced chlorosis, prefer
 *   slightly acid soil). If they share a bed with crops that would like more
 *   lime, the advice is "no lime now — lime after the harvest for the next crop".
 * - **Lime-loving** brassicas (cabbage, kale, broccoli, cauliflower, kohlrabi,
 *   pak choi): a pH of 7 and above also suppresses clubroot
 *   (*Plasmodiophora brassicae*), so lime advice mentions it.
 */

export interface PhRange { min: number; max: number }

interface CropPh extends PhRange {
  lime?: "avoid" | "likes";
}

/** Preferred soil pH per crop (common horticultural ranges). */
const CROP_PH: Record<string, CropPh> = {
  blueberry: { min: 4.5, max: 5.5, lime: "avoid" },
  potato: { min: 5.0, max: 6.0, lime: "avoid" },
  strawberry: { min: 5.5, max: 6.5, lime: "avoid" },
  raspberry: { min: 5.5, max: 6.5, lime: "avoid" },
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
  endive: { min: 6.0, max: 7.0 },
  arugula: { min: 6.0, max: 7.0 },
  radish: { min: 6.0, max: 7.0 },
  turnip: { min: 6.0, max: 7.0 },
  basil: { min: 6.0, max: 7.0 },
  parsley: { min: 6.0, max: 7.0 },
  dill: { min: 6.0, max: 7.0 },
  fennel: { min: 6.0, max: 7.0 },
  celery: { min: 6.0, max: 7.0 },
  mint: { min: 6.0, max: 7.0 },
  sunflower: { min: 6.0, max: 7.5 },
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
  asparagus: { min: 6.5, max: 7.5 },
  cabbage: { min: 6.5, max: 7.5, lime: "likes" },
  broccoli: { min: 6.5, max: 7.5, lime: "likes" },
  cauliflower: { min: 6.5, max: 7.5, lime: "likes" },
  kale: { min: 6.5, max: 7.5, lime: "likes" },
  kohlrabi: { min: 6.5, max: 7.5, lime: "likes" },
  pak_choi: { min: 6.5, max: 7.5, lime: "likes" },
};

/** Most vegetables are happy here. */
export const DEFAULT_PH: PhRange = { min: 6.0, max: 7.0 };

/** pH preferences of a crop, if known. */
export function cropPh(plantId: string): CropPh | undefined {
  return CROP_PH[plantId];
}

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
  | "sulfur"          // clearly above target and alkaline: sulphur
  | "limeVeto"        // other crops would like more lime, but a lime-averse crop is in the bed
  | "averseHigh"      // too high for the lime-averse crop (e.g. scab risk for potatoes)
  | "acidify";        // acid-loving crop (blueberry) far above its range: acid substrate / sulphur

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

export interface PhAssessment {
  advice: PhAdvice;
  /** Range the advice refers to (the lime-averse crop's range when it decides). */
  target: PhRange;
  /** Lime-averse crops in the bed (they decide about lime). */
  limeAverse: string[];
  /** Lime-loving brassicas in the bed — mention clubroot when liming. */
  limeLoving: string[];
}

/** The range a bed is managed towards: the lime-averse crops' range if any, else the overlap of all. */
export function bedPhTarget(plantIds: Iterable<string>): PhRange {
  const ids = [...new Set(plantIds)];
  const averse = ids.filter((id) => CROP_PH[id]?.lime === "avoid");
  return targetPh(averse.length > 0 ? averse : ids);
}

/** pH advice for a bed, with the crop-specific rules from the file header. */
export function assessPh(ph: number, plantIds: Iterable<string>): PhAssessment {
  const ids = [...new Set(plantIds)].filter((id) => CROP_PH[id]);
  const limeAverse = ids.filter((id) => CROP_PH[id].lime === "avoid");
  const limeLoving = ids.filter((id) => CROP_PH[id].lime === "likes");
  const bedTarget = targetPh(ids);

  if (limeAverse.length === 0) return { advice: phAdvice(ph, bedTarget), target: bedTarget, limeAverse, limeLoving };

  // The lime-averse crops set the range; others in the bed adapt this season.
  const target = bedPhTarget(ids);
  const acidLover = limeAverse.some((id) => CROP_PH[id].max <= 5.5);
  let advice: PhAdvice;
  if (ph < target.min - MARGIN) advice = "limeLight"; // too acid even for them: a little lime only
  else if (ph > target.max + MARGIN && acidLover) advice = "acidify";
  else if (ph > target.max) advice = "averseHigh";
  else if (ph < bedTarget.min) advice = "limeVeto";
  else advice = "optimal";
  return { advice, target, limeAverse, limeLoving };
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
