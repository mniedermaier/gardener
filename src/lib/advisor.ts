import type { Plant } from "@/types/plant";
import { addWeeks, parseISO, differenceInWeeks } from "date-fns";

export interface PlantingAdvice {
  plantId: string;
  action: "sow_indoors" | "sow_outdoors" | "transplant";
  urgency: "now" | "soon" | "upcoming";
  weeksUntil: number;
}

export function getPlantingAdvice(
  plants: Plant[],
  lastFrostDate: string,
  alreadyPlanted: Set<string>,
): PlantingAdvice[] {
  const now = new Date();
  const frostDate = parseISO(lastFrostDate);
  const advice: PlantingAdvice[] = [];

  for (const plant of plants) {
    if (alreadyPlanted.has(plant.id)) continue;

    // Check sow indoors
    if (plant.sowIndoorsWeeks !== null) {
      const sowDate = addWeeks(frostDate, plant.sowIndoorsWeeks);
      const weeksUntil = differenceInWeeks(sowDate, now);
      if (weeksUntil >= -1 && weeksUntil <= 4) {
        advice.push({
          plantId: plant.id,
          action: "sow_indoors",
          urgency: weeksUntil <= 0 ? "now" : weeksUntil <= 2 ? "soon" : "upcoming",
          weeksUntil: Math.max(0, weeksUntil),
        });
      }
    }

    // Check sow outdoors
    if (plant.sowOutdoorsWeeks !== null) {
      const sowDate = addWeeks(frostDate, plant.sowOutdoorsWeeks);
      const weeksUntil = differenceInWeeks(sowDate, now);
      if (weeksUntil >= -1 && weeksUntil <= 4) {
        advice.push({
          plantId: plant.id,
          action: "sow_outdoors",
          urgency: weeksUntil <= 0 ? "now" : weeksUntil <= 2 ? "soon" : "upcoming",
          weeksUntil: Math.max(0, weeksUntil),
        });
      }
    }

    // Check transplant
    if (plant.transplantWeeks !== null) {
      const date = addWeeks(frostDate, plant.transplantWeeks);
      const weeksUntil = differenceInWeeks(date, now);
      if (weeksUntil >= -1 && weeksUntil <= 4) {
        advice.push({
          plantId: plant.id,
          action: "transplant",
          urgency: weeksUntil <= 0 ? "now" : weeksUntil <= 2 ? "soon" : "upcoming",
          weeksUntil: Math.max(0, weeksUntil),
        });
      }
    }
  }

  // Sort: now first, then soon, then upcoming
  const urgencyOrder = { now: 0, soon: 1, upcoming: 2 };
  advice.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.weeksUntil - b.weeksUntil);

  return advice;
}

// --- "Jetzt pflanzbar" for the planner palette ------------------------------

export type PlantableAction = "sow_outdoors" | "transplant" | "plant_autumn" | "sow_autumn";

export interface PlantableNow {
  plantId: string;
  action: PlantableAction;
  /** Last day of the window (local date). */
  until: Date;
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
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Plants that can go into a bed right now: direct sowing or planting out
 * within [date − 1 week, date + 3 weeks] of their frost-relative date, plus
 * the autumn windows above. Indoor sowing is left out — it does not happen in
 * a bed. `frostProtectionWeeks` (greenhouse, cold frame …) shifts spring
 * dates earlier and extends autumn sowing.
 */
export function getPlantableNow(
  plants: Plant[],
  lastFrostDate: string,
  opts: { now?: Date; frostProtectionWeeks?: number } = {},
): PlantableNow[] {
  const now = opts.now ?? new Date();
  const protection = opts.frostProtectionWeeks ?? 0;
  // Use this year's frost day: a stored date from an earlier season must not
  // push every window into the past.
  const stored = parseISO(lastFrostDate);
  const frost = new Date(now.getFullYear(), stored.getMonth(), stored.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = now.getMonth() + 1;
  const result: PlantableNow[] = [];

  for (const plant of plants) {
    let best: PlantableNow | null = null;
    const consider = (action: PlantableAction, weeks: number | null) => {
      if (weeks === null) return;
      const date = addWeeks(frost, weeks - protection);
      const start = new Date(date.getTime() - 7 * DAY);
      const end = new Date(date.getTime() + 21 * DAY);
      if (today >= start && today <= end && (!best || end > best.until)) best = { plantId: plant.id, action, until: end };
    };
    consider("sow_outdoors", plant.sowOutdoorsWeeks);
    consider("transplant", plant.transplantWeeks);

    const autumn = AUTUMN_WINDOWS[plant.id];
    if (!best && autumn) {
      const to = protection >= 3 && autumn.protectedTo ? autumn.protectedTo : autumn.to;
      if (month >= autumn.from && month <= to) {
        best = { plantId: plant.id, action: autumn.action, until: new Date(now.getFullYear(), to, 0) };
      }
    }
    if (best) result.push(best);
  }
  return result.sort((a, b) => a.until.getTime() - b.until.getTime());
}
