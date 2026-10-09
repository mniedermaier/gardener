import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Bed } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { useFormat } from "@/hooks/useFormat";
import { cn } from "@/lib/cn";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface Props {
  bed: Bed;
  plantMap: Map<string, Plant>;
  gridCellSizeCm: number;
  companionPairs: number;
  conflictPairs: number;
  className?: string;
}

/** Bed key figures: occupancy, species, forecast yield, neighbour pairs. */
export const BedStats = memo(function BedStats({ bed, plantMap, gridCellSizeCm, companionPairs, conflictPairs, className = "" }: Props) {
  const { t } = useTranslation();
  const { formatPercent, formatWeight } = useFormat();

  const stats = useMemo(() => {
    const paths = new Set(bed.paths ?? []).size;
    const usable = Math.max(1, bed.width * bed.height - paths);
    const cellAreaM2 = (gridCellSizeCm / 100) ** 2;
    let yieldKg = 0;
    const species = new Set<string>();
    for (const cell of bed.cells) {
      const plant = plantMap.get(cell.plantId);
      if (!plant) continue;
      yieldKg += (plant.expectedYieldKgPerM2 ?? 0) * cellAreaM2;
      species.add(cell.plantId);
    }
    return { occupancy: bed.cells.length / usable, species: species.size, yieldGrams: yieldKg * 1000 };
  }, [bed, plantMap, gridCellSizeCm]);

  const items = [
    { label: t("bedStats.occupancy"), value: formatPercent(stats.occupancy) },
    { label: t("bedStats.species"), value: String(stats.species) },
    { label: t("bedStats.forecast"), value: `~${formatWeight(stats.yieldGrams)}` },
    {
      label: t("bedStats.neighbours"),
      value: (
        <>
          <span>{t("bedStats.goodPairs", { count: companionPairs })}</span>
          {conflictPairs > 0 && <Badge tone="warning" icon={TriangleAlert} className="ml-1.5 align-middle">{t("bedStats.conflictPairs", { count: conflictPairs })}</Badge>}
        </>
      ),
    },
  ];

  return (
    // Own container: four columns under the full-width grid, two in the narrow side pane next to a tall bed.
    <div className="@container">
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-4", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{it.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900 tabular-nums dark:text-gray-100">{it.value}</dd>
        </div>
      ))}
    </dl>
    </div>
  );
});
