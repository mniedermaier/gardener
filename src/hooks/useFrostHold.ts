import { useCallback, useMemo } from "react";
import { addDays } from "date-fns";
import { useWeatherGlance } from "@/hooks/useWeatherGlance";
import { useToday } from "@/hooks/useToday";
import { useFrostSummary } from "@/components/weather/frost";
import { isFrostSensitive } from "@/lib/weatherAlerts";
import { toDate, toISODate } from "@/lib/format";
import type { Plant } from "@/types/plant";

/** Planted in autumn on purpose to overwinter: frost does not stop them. */
export const OVERWINTERING = new Set(["garlic", "onion", "currant", "gooseberry", "raspberry", "blueberry", "strawberry"]);

/**
 * The last forecast frost night (≤ 0 °C) when one comes in the next three
 * nights, and whether it holds back planting a crop out. One rule for the
 * calendar's "Jetzt säen & pflanzen" and the planner palette, so both say the
 * same as the frost warning on "Heute" and "Wetter".
 */
export function useFrostHold(): {
  lastFrostNight: Date | null;
  holds: (plant: Pick<Plant, "id" | "harvestDaysMax" | "transplantWeeks">, actions: readonly string[]) => boolean;
} {
  const today = useToday();
  const glance = useWeatherGlance();
  const frost = useFrostSummary(glance.status === "ready" ? glance.data.days : undefined);
  const lastFrostNight = useMemo(() => {
    const until = toISODate(addDays(today, 3));
    const hard = frost?.summary.nights.filter((n) => n.tempMin <= 0) ?? [];
    if (!hard.some((n) => n.date <= until)) return null;
    return toDate(hard.reduce((a, b) => (b.date > a.date ? b : a)).date);
  }, [frost, today]);
  const holds = useCallback(
    (plant: Pick<Plant, "id" | "harvestDaysMax" | "transplantWeeks">, actions: readonly string[]) =>
      !!lastFrostNight && !OVERWINTERING.has(plant.id)
      && actions.some((a) => a === "transplant" || a === "plant_autumn")
      && (isFrostSensitive(plant) || actions.includes("plant_autumn")),
    [lastFrostNight],
  );
  return { lastFrostNight, holds };
}
