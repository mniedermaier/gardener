import { useMemo } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { getHarvestReady, type HarvestReadyItem } from "@/lib/season";

export type { HarvestReadyItem };

/**
 * Plantings that can be harvested on `now` (see `getHarvestReady`): planting
 * date + days to maturity, continuous croppers until the autumn frost, which
 * protected beds push back by their frost-protection weeks.
 */
export function useHarvestReady(now: Date): HarvestReadyItem[] {
  const { gardens, lastFrostDate } = useStore(useShallow((s) => ({ gardens: s.gardens, lastFrostDate: s.lastFrostDate })));
  const plantMap = usePlantMap();
  return useMemo(() => getHarvestReady(gardens, plantMap, now, lastFrostDate), [gardens, plantMap, now, lastFrostDate]);
}
