import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { useToday } from "@/hooks/useToday";
import { getPhaseWindows, plantedHarvestWindow, seasonFrost } from "@/lib/season";
import { autumnPhaseWindows } from "@/lib/advisor";
import { getFrostProtectionWeeks, type Bed } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";

interface Props {
  bed: Bed;
  plantMap: Map<string, Plant>;
  getPlantName: (id: string) => string;
  /** Selects the first cell of that crop in the grid. */
  onSelectCell: (x: number, y: number) => void;
}

/**
 * What stands in the bed, one row per crop: count and this season's harvest
 * window — from the cells' planting dates when set, else the same season
 * windows as the calendar (`getPhaseWindows` with the bed's frost protection). Fills the side pane next to a tall bed on wide
 * screens.
 */
export const BedCropList = memo(function BedCropList({ bed, plantMap, getPlantName, onSelectCell }: Props) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const lastFrostDate = useStore((s) => s.lastFrostDate);
  const today = useToday();

  const rows = useMemo(() => {
    const byPlant = new Map<string, { plant: Plant; count: number; x: number; y: number; planted: string[] }>();
    for (const cell of bed.cells) {
      const plant = plantMap.get(cell.plantId);
      if (!plant) continue;
      const row = byPlant.get(plant.id) ?? { plant, count: 0, x: cell.cellX, y: cell.cellY, planted: [] };
      row.count++;
      if (cell.plantedDate) row.planted.push(cell.plantedDate);
      byPlant.set(plant.id, row);
    }
    const frostProtectionWeeks = getFrostProtectionWeeks(bed);
    const frost = seasonFrost(lastFrostDate, today);
    return [...byPlant.values()]
      .map((r) => {
        // Real planting dates win (the harvest log follows them, as does the
        // sufficiency forecast): earliest planting + min days … latest + max days.
        const planted = plantedHarvestWindow(r.plant, r.planted);
        if (planted) return { ...r, window: planted };
        // Spring harvest and, for autumn-sown crops, the autumn harvest: show the
        // one still ahead or running (lamb's lettuce in October → autumn/winter).
        const spring = getPhaseWindows(r.plant, frost, { frostProtectionWeeks }).find((w) => w.phase === "harvest") ?? null;
        const autumn = autumnPhaseWindows(r.plant.id, frost.getFullYear(), frostProtectionWeeks, bed.environmentType, r.plant).find((w) => w.phase === "harvest") ?? null;
        const window = autumn && (!spring || spring.end < today) ? autumn : spring;
        return { ...r, window };
      })
      // Crops without a seasonal window (perennials) go last.
      .sort((a, b) => (a.window?.start.getTime() ?? Infinity) - (b.window?.start.getTime() ?? Infinity));
  }, [bed, plantMap, lastFrostDate, today]);

  // "Mai" for a single month, "Jun–Nov" otherwise (unspaced en dash, DESIGN_SYSTEM §13).
  const range = (start: Date, end: Date) => {
    const a = formatDate(start, "month");
    const b = formatDate(end, "month");
    return a === b ? a : `${a}–${b}`;
  };

  if (rows.length === 0) return null;

  return (
    <section className="border-t border-gray-100 px-3 py-4 sm:px-4 dark:border-white/5" aria-labelledby={`crops-${bed.id}`}>
      <h3 id={`crops-${bed.id}`} className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("planner.cropListTitle")}</h3>
      <ul className="divide-y divide-gray-100 dark:divide-white/5">
        {rows.map(({ plant, count, x, y, window }) => (
          <li key={plant.id}>
            <button
              type="button"
              onClick={() => onSelectCell(x, y)}
              className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{getPlantName(plant.id)}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {t("planner.cropListCount", { count })}
                  {window && <> · {t("planner.cropListHarvest", { range: range(window.start, window.end) })}</>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
});
