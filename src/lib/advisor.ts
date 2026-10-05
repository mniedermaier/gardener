import type { Plant } from "@/types/plant";
import type { EnvironmentType } from "@/types/garden";
import { addDays, addWeeks } from "date-fns";
import { seasonFrost, suitsEnvironment } from "@/lib/season";

// --- "Jetzt säen & pflanzen": one source for palette, dashboard and calendar ---

export type PlantableAction = "sow_indoors" | "sow_outdoors" | "transplant" | "plant_autumn" | "sow_autumn";

export interface PlantableNow {
  plantId: string;
  action: PlantableAction;
  /** Last day of the window (local date). */
  until: Date;
}

export interface PlantableSoon {
  plantId: string;
  action: PlantableAction;
  /** First day of the window (local date). */
  from: Date;
}

/**
 * Autumn windows the frost-relative data cannot express (months, 1-based,
 * inclusive). `protectedTo` extends the window under glass/fleece.
 */
const AUTUMN_WINDOWS: Record<string, { action: PlantableAction; from: number; to: number; protectedTo?: number }> = {
  garlic: { action: "plant_autumn", from: 9, to: 11 },
  currant: { action: "plant_autumn", from: 10, to: 11 },
  gooseberry: { action: "plant_autumn", from: 10, to: 11 },
  raspberry: { action: "plant_autumn", from: 10, to: 11 },
  blueberry: { action: "plant_autumn", from: 10, to: 11 },
  strawberry: { action: "plant_autumn", from: 8, to: 9 },
  spinach: { action: "sow_autumn", from: 8, to: 9, protectedTo: 11 },
  arugula: { action: "sow_autumn", from: 8, to: 9, protectedTo: 10 },
  radish: { action: "sow_autumn", from: 8, to: 9, protectedTo: 10 },
  lettuce: { action: "sow_autumn", from: 8, to: 8, protectedTo: 10 },
  pak_choi: { action: "sow_autumn", from: 8, to: 8, protectedTo: 10 },
  endive: { action: "sow_autumn", from: 7, to: 7, protectedTo: 9 },
};

export interface SowingOptions {
  now?: Date;
  /** Greenhouse, cold frame …: spring dates earlier, autumn sowing longer. */
  frostProtectionWeeks?: number;
  /** Only crops that belong in this bed type (no shrubs in the greenhouse). */
  environmentType?: EnvironmentType;
  /** Include sowing indoors (not an in-bed action; the dashboard shows it, the palette does not). */
  includeIndoor?: boolean;
  /** How far "soon" reaches (weeks, default 4). */
  horizonWeeks?: number;
}

interface Window { action: PlantableAction; start: Date; end: Date }

function windowsFor(plant: Plant, frost: Date, year: number, protection: number, includeIndoor: boolean): Window[] {
  const result: Window[] = [];
  // Frost-relative: [date − 1 week, date + 3 weeks].
  const rel = (action: PlantableAction, weeks: number | null) => {
    if (weeks === null) return;
    const date = addWeeks(frost, weeks - protection);
    result.push({ action, start: addDays(date, -7), end: addDays(date, 21) });
  };
  if (includeIndoor) rel("sow_indoors", plant.sowIndoorsWeeks);
  rel("sow_outdoors", plant.sowOutdoorsWeeks);
  rel("transplant", plant.transplantWeeks);
  const autumn = AUTUMN_WINDOWS[plant.id];
  if (autumn) {
    const to = protection >= 3 && autumn.protectedTo ? autumn.protectedTo : autumn.to;
    result.push({ action: autumn.action, start: new Date(year, autumn.from - 1, 1), end: new Date(year, to, 0) });
  }
  return result;
}

/**
 * What can be sown or planted now, and what opens within the next weeks.
 * Frost-relative windows plus the autumn windows above; filtered by the bed
 * type. Sorted: now by closing date, soon by opening date.
 */
export function getSowingAgenda(plants: Plant[], lastFrostDate: string, opts: SowingOptions = {}): { now: PlantableNow[]; soon: PlantableSoon[] } {
  const now = opts.now ?? new Date();
  const protection = opts.frostProtectionWeeks ?? 0;
  const frost = seasonFrost(lastFrostDate, now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = addWeeks(today, opts.horizonWeeks ?? 4);
  const current: PlantableNow[] = [];
  const soon: PlantableSoon[] = [];

  for (const plant of plants) {
    if (opts.environmentType && !suitsEnvironment(plant, opts.environmentType)) continue;
    const windows = windowsFor(plant, frost, now.getFullYear(), protection, !!opts.includeIndoor);
    let best: PlantableNow | null = null;
    let next: PlantableSoon | null = null;
    for (const w of windows) {
      if (today >= w.start && today <= w.end) {
        if (!best || w.end > best.until) best = { plantId: plant.id, action: w.action, until: w.end };
      } else if (w.start > today && w.start <= horizon) {
        if (!next || w.start < next.from) next = { plantId: plant.id, action: w.action, from: w.start };
      }
    }
    if (best) current.push(best);
    else if (next) soon.push(next);
  }
  current.sort((a, b) => a.until.getTime() - b.until.getTime());
  soon.sort((a, b) => a.from.getTime() - b.from.getTime());
  return { now: current, soon };
}

/**
 * Plants that can go into a bed right now (no indoor sowing). Used by the
 * planner palette; the calendar and the dashboard read the same agenda.
 */
export function getPlantableNow(plants: Plant[], lastFrostDate: string, opts: Omit<SowingOptions, "includeIndoor" | "horizonWeeks"> = {}): PlantableNow[] {
  return getSowingAgenda(plants, lastFrostDate, { ...opts, includeIndoor: false }).now;
}
