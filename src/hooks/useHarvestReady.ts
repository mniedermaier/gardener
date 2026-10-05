import { useMemo } from "react";
import { addDays, isAfter, isBefore } from "date-fns";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { toDate } from "@/lib/format";

export interface HarvestReadyItem {
  key: string;
  plantId: string;
  bedId: string;
  gardenId: string;
  bedName: string;
  cells: number;
  /** Past the expected window: harvest soon or it gets woody. */
  late: boolean;
}

/**
 * Plantings whose harvest window (planting date + days to maturity) is open
 * now, grouped per bed and crop. Only cells with a planting date count.
 */
export function useHarvestReady(now: Date): HarvestReadyItem[] {
  const { gardens } = useStore(useShallow((s) => ({ gardens: s.gardens })));
  const plantMap = usePlantMap();
  return useMemo(() => {
    const byKey = new Map<string, HarvestReadyItem>();
    for (const g of gardens) {
      for (const b of g.beds) {
        for (const c of b.cells) {
          const planted = c.plantedDate ? toDate(c.plantedDate) : null;
          const plant = plantMap.get(c.plantId);
          if (!planted || !plant) continue;
          const from = addDays(planted, plant.harvestDaysMin);
          const to = addDays(planted, plant.harvestDaysMax);
          // Window open, and at most three weeks past its end.
          if (isBefore(now, from) || isAfter(now, addDays(to, 21))) continue;
          const key = `${b.id}:${c.plantId}`;
          const entry = byKey.get(key) ?? { key, plantId: c.plantId, bedId: b.id, gardenId: g.id, bedName: b.name, cells: 0, late: false };
          entry.cells += 1;
          entry.late = entry.late || isAfter(now, to);
          byKey.set(key, entry);
        }
      }
    }
    return Array.from(byKey.values()).sort((a, b) => Number(b.late) - Number(a.late) || b.cells - a.cells);
  }, [gardens, plantMap, now]);
}

