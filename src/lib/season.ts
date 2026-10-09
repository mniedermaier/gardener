import { addDays, addWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import type { Plant } from "@/types/plant";
import type { EnvironmentType, Garden } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import { toDate } from "@/lib/format";

/**
 * One source of truth for a crop's season: the phase windows (Kalender,
 * Pflanzendetail), "what is harvestable now" (Dashboard) and which crops suit
 * which bed type (Palette "Jetzt"). Everything is relative to the user's last
 * spring frost; protected beds (greenhouse, cold frame …) shift spring dates
 * earlier AND keep the season open longer in autumn.
 */

export type Phase = "sowIndoors" | "sowOutdoors" | "transplant" | "harvest";
export const PHASES: Phase[] = ["sowIndoors", "sowOutdoors", "transplant", "harvest"];

export interface PhaseWindow {
  phase: Phase;
  start: Date;
  end: Date;
}

/** Window lengths in weeks (shared by every view). */
const PHASE_WEEKS = { sowIndoors: 3, sowOutdoors: 4, transplant: 3 } as const;

/** Typical gap between last spring and first autumn frost in Central Europe (~5 months). */
export const FROST_FREE_DAYS = 150;

/** The frost day of the stored date, moved into `now`'s year (a stale year must not shift every window). */
export function seasonFrost(lastFrostDate: string, now: Date = new Date()): Date {
  const stored = toDate(lastFrostDate) ?? new Date(now.getFullYear(), 4, 15);
  return new Date(now.getFullYear(), stored.getMonth(), stored.getDate());
}

/** Estimated first autumn frost for a last spring frost. */
export function estimateFirstFrost(lastFrost: Date): Date {
  return addDays(lastFrost, FROST_FREE_DAYS);
}

/** Crops that keep bearing until the autumn frost once they have started. */
const CONTINUOUS = new Set([
  "tomato", "pepper", "eggplant", "cucumber", "zucchini", "chard", "kale", "leek",
  "basil", "parsley", "chives", "mint", "thyme", "rosemary", "pumpkin", "squash", "celery", "endive",
]);

/** Perennials and shrubs: they stay for years, so no crop rotation and no greenhouse space. */
const PERENNIAL = new Set(["raspberry", "blueberry", "currant", "gooseberry", "asparagus", "rosemary", "thyme", "chives", "mint", "strawberry"]);
const WOODY = new Set(["raspberry", "blueberry", "currant", "gooseberry", "rosemary"]);

export function isContinuousCropper(plant: Plant): boolean {
  return CONTINUOUS.has(plant.id);
}

export function isPerennial(plant: Plant): boolean {
  return PERENNIAL.has(plant.id) || plant.harvestDaysMax >= 365;
}

export function isWoody(plant: Plant): boolean {
  return WOODY.has(plant.id) || (plant.category === "berry" && plant.harvestDaysMax >= 365);
}

const PROTECTED: EnvironmentType[] = ["greenhouse", "polytunnel", "cold_frame"];

/**
 * Does the crop belong in this kind of bed? Protected structures are for
 * annual crops (no shrubs, nothing that blocks the space for 9 months like
 * garlic); windowsills take herbs and small leafy crops; containers nothing
 * that sprawls over 60 cm; raised and vertical beds no shrubs.
 */
export function suitsEnvironment(plant: Plant, env: EnvironmentType = "outdoor_bed"): boolean {
  if (PROTECTED.includes(env)) return !isPerennial(plant) && plant.harvestDaysMax < 200;
  if (env === "windowsill") return !isWoody(plant) && (plant.category === "herb" || plant.spacingCm <= 20);
  if (env === "container") return plant.spacingCm <= 60;
  // Raised and vertical beds are vegetable beds: shrubs belong in the ground.
  if (env === "raised_bed" || env === "vertical") return !isWoody(plant);
  return true;
}

/**
 * Phase windows for one crop in one season. `frost` is the (this year's) last
 * frost; `frostProtectionWeeks` shifts spring earlier and extends the harvest
 * of continuous croppers past the autumn frost by the same amount.
 */
export function getPhaseWindows(plant: Plant, frost: Date, opts: { frostProtectionWeeks?: number } = {}): PhaseWindow[] {
  const protection = opts.frostProtectionWeeks ?? 0;
  const effective = addWeeks(frost, -protection);
  const at = (weeks: number | null) => (weeks === null ? null : addWeeks(effective, weeks));
  const windows: PhaseWindow[] = [];
  const indoors = at(plant.sowIndoorsWeeks);
  const outdoors = at(plant.sowOutdoorsWeeks);
  const transplant = at(plant.transplantWeeks);
  if (indoors) windows.push({ phase: "sowIndoors", start: indoors, end: addWeeks(indoors, PHASE_WEEKS.sowIndoors) });
  if (outdoors) windows.push({ phase: "sowOutdoors", start: outdoors, end: addWeeks(outdoors, PHASE_WEEKS.sowOutdoors) });
  if (transplant) windows.push({ phase: "transplant", start: transplant, end: addWeeks(transplant, PHASE_WEEKS.transplant) });
  // Harvest counts from planting out (or direct sowing). Long-lived crops get no window.
  const base = transplant ?? outdoors;
  if (base && plant.harvestDaysMax < 200) {
    const start = addDays(base, plant.harvestDaysMin);
    let end = addDays(addWeeks(base, transplant ? PHASE_WEEKS.transplant : PHASE_WEEKS.sowOutdoors), plant.harvestDaysMax);
    // Continuous croppers bear until the autumn frost — not shorter, and not
    // longer either (rosemary's 180 days would otherwise outlast its bed mates).
    if (isContinuousCropper(plant)) end = addWeeks(estimateFirstFrost(frost), protection);
    windows.push({ phase: "harvest", start, end });
  }
  return windows;
}

// --- Harvest ready -------------------------------------------------------------

export interface HarvestReadyItem {
  key: string;
  plantId: string;
  bedId: string;
  gardenId: string;
  bedName: string;
  cells: number;
  /** Past the expected window: harvest soon or it gets woody. */
  late: boolean;
  /** Earliest end of the window among the cells (sort key: what closes first). */
  end: Date;
}

/** Days a harvest stays listed after its window closed (then marked late). */
export const HARVEST_GRACE_DAYS = 21;

/**
 * Harvest window from real planting dates: earliest planting + min days to
 * the latest + max days. Continuous croppers (tomato, chard …) stay open
 * until the autumn frost, shifted by the bed's frost protection — the same
 * rule as getHarvestReady, so "Heute", calendar and bed list agree. Null
 * without dates or for perennials — callers then fall back to the season
 * windows from the frost date.
 */
export function plantedHarvestWindow(
  plant: Plant,
  plantedDates: string[],
  season?: { lastFrostDate: string; now: Date; protectionWeeks: number },
): { start: Date; end: Date } | null {
  if (plant.harvestDaysMax >= 365) return null;
  const times = plantedDates.flatMap((d) => toDate(d)?.getTime() ?? []);
  if (times.length === 0) return null;
  const start = addDays(Math.min(...times), plant.harvestDaysMin);
  let end = addDays(Math.max(...times), plant.harvestDaysMax);
  if (season && isContinuousCropper(plant)) {
    const seasonEnd = addWeeks(estimateFirstFrost(seasonFrost(season.lastFrostDate, season.now)), season.protectionWeeks);
    end = seasonEnd; // bears until the frost — not shorter, not longer (same rule as getPhaseWindows)
  }
  return { start, end };
}

/**
 * Plantings whose harvest window (planting date + days to maturity) is open
 * on `now`, grouped per bed and crop. Continuous croppers stay open until the
 * autumn frost, shifted by the bed's frost protection. Only cells with a
 * planting date count.
 */
export function getHarvestReady(
  gardens: Garden[],
  plantMap: Map<string, Plant>,
  now: Date,
  lastFrostDate: string,
): HarvestReadyItem[] {
  const day = startOfDay(now);
  const autumnFrost = estimateFirstFrost(seasonFrost(lastFrostDate, now));
  const byKey = new Map<string, HarvestReadyItem>();
  for (const g of gardens) {
    for (const b of g.beds) {
      const protection = getFrostProtectionWeeks(b);
      for (const c of b.cells) {
        const planted = c.plantedDate ? toDate(c.plantedDate) : null;
        const plant = plantMap.get(c.plantId);
        if (!planted || !plant || plant.harvestDaysMax >= 365) continue;
        const from = addDays(planted, plant.harvestDaysMin);
        let to = addDays(planted, plant.harvestDaysMax);
        let grace = HARVEST_GRACE_DAYS;
        if (isContinuousCropper(plant)) {
          const seasonEnd = addWeeks(autumnFrost, protection);
          to = seasonEnd; grace = 0; // until the frost, never past it
        }
        // Window open, and at most three weeks past its end.
        if (isBefore(day, from) || isAfter(day, addDays(to, grace))) continue;
        const key = `${b.id}:${c.plantId}`;
        const entry = byKey.get(key) ?? { key, plantId: c.plantId, bedId: b.id, gardenId: g.id, bedName: b.name, cells: 0, late: false, end: to };
        entry.cells += 1;
        if (to < entry.end) entry.end = to;
        entry.late = entry.late || isAfter(day, to);
        byKey.set(key, entry);
      }
    }
  }
  // Late first, then what closes first — the same order as the calendar's "Jetzt dran".
  return Array.from(byKey.values()).sort((a, b) => Number(b.late) - Number(a.late) || a.end.getTime() - b.end.getTime() || a.plantId.localeCompare(b.plantId));
}
