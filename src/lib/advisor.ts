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
