import type { Plant } from "@/types/plant";
import { addWeeks, addDays, format, parseISO } from "date-fns";

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
  kale: { intervalWeeks: 4, sowings: 3 },
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
