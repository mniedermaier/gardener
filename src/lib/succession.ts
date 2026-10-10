import type { Plant } from "@/types/plant";
import { addWeeks, addDays, addYears, format, parseISO, startOfDay } from "date-fns";
import { seasonFrost } from "@/lib/season";

export interface SuccessionConfig {
  plantId: string;
  intervalWeeks: number;
  numberOfSowings: number;
  startWeeksRelativeToFrost: number;
}

export interface SuccessionTask {
  plantId: string;
  sowingNumber: number;
  date: string;
  label: string;
}

// Plants well-suited for succession planting with recommended intervals
export const SUCCESSION_PRESETS: Record<string, { intervalWeeks: number; sowings: number }> = {
  lettuce: { intervalWeeks: 3, sowings: 6 },
  radish: { intervalWeeks: 2, sowings: 8 },
  spinach: { intervalWeeks: 3, sowings: 5 },
  bean: { intervalWeeks: 3, sowings: 4 },
  pea: { intervalWeeks: 2, sowings: 5 },
  carrot: { intervalWeeks: 3, sowings: 4 },
  beetroot: { intervalWeeks: 4, sowings: 3 },
  chard: { intervalWeeks: 4, sowings: 3 },
  turnip: { intervalWeeks: 3, sowings: 4 },
  // No kale: it is sown once (May–June) and harvested over the winter, not in succession.
};

export function generateSuccessionSchedule(
  config: SuccessionConfig,
  lastFrostDate: string,
): SuccessionTask[] {
  const frostDate = parseISO(lastFrostDate);
  const tasks: SuccessionTask[] = [];

  for (let i = 0; i < config.numberOfSowings; i++) {
    const baseDate = addWeeks(frostDate, config.startWeeksRelativeToFrost);
    const sowDate = addWeeks(baseDate, i * config.intervalWeeks);

    tasks.push({
      plantId: config.plantId,
      sowingNumber: i + 1,
      date: format(sowDate, "yyyy-MM-dd"),
      label: `#${i + 1}`,
    });
  }

  return tasks;
}

export function getSuccessionEndDate(
  config: SuccessionConfig,
  plant: Plant,
  lastFrostDate: string,
): string {
  const frostDate = parseISO(lastFrostDate);
  const lastSowing = addWeeks(
    addWeeks(frostDate, config.startWeeksRelativeToFrost),
    (config.numberOfSowings - 1) * config.intervalWeeks
  );
  const harvestDate = addDays(lastSowing, plant.harvestDaysMax);
  return format(harvestDate, "yyyy-MM-dd");
}

export function isSuccessionCandidate(plant: Plant): boolean {
  return plant.id in SUCCESSION_PRESETS;
}

/** The default plan of a candidate (preset interval and count, start from the plant's sowing weeks). */
export function defaultSuccessionConfig(plant: Plant): SuccessionConfig | null {
  const preset = SUCCESSION_PRESETS[plant.id];
  if (!preset) return null;
  return {
    plantId: plant.id,
    intervalWeeks: preset.intervalWeeks,
    numberOfSowings: preset.sowings,
    startWeeksRelativeToFrost: plant.sowOutdoorsWeeks ?? plant.sowIndoorsWeeks ?? -4,
  };
}

/**
 * Which season a succession plan is for: this year's frost while at least one
 * default sowing of some candidate still lies ahead, otherwise next spring
 * (in autumn every window has closed, and offering bush beans in October
 * contradicts the frost warning).
 *
 * Returns the frost date (yyyy-MM-dd) to plan against, whether that is next
 * year, and the candidates that still have a sowing ahead in that season.
 */
export function successionSeason(plants: Plant[], lastFrostDate: string, today: Date = new Date()): { frostISO: string; nextYear: boolean; open: Plant[] } {
  const day = startOfDay(today);
  const thisFrost = seasonFrost(lastFrostDate, today);
  const candidates = plants.filter(isSuccessionCandidate);
  const thisISO = format(thisFrost, "yyyy-MM-dd");
  const open = candidates.filter((p) => {
    const config = defaultSuccessionConfig(p);
    if (!config) return false;
    const schedule = generateSuccessionSchedule(config, thisISO);
    return schedule.some((t) => parseISO(t.date) >= day);
  });
  if (open.length > 0) return { frostISO: thisISO, nextYear: false, open };
  // Next spring: only crops whose first sowing really falls in spring (before May).
  const nextFrost = addYears(thisFrost, 1);
  const nextISO = format(nextFrost, "yyyy-MM-dd");
  const spring = candidates.filter((p) => {
    const config = defaultSuccessionConfig(p);
    const first = config ? generateSuccessionSchedule(config, nextISO)[0] : undefined;
    return !!first && parseISO(first.date).getMonth() < 4;
  });
  return { frostISO: nextISO, nextYear: true, open: spring };
}
