import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sprout, Apple, Heart, AlertTriangle } from "lucide-react";
import type { Bed } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { calculateBedScore } from "@/lib/placementValidation";

interface Props {
  bed: Bed;
  plantMap: Map<string, Plant>;
  gridCellSizeCm: number;
}

export function BedStats({ bed, plantMap, gridCellSizeCm }: Props) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const totalCells = bed.width * bed.height;
    const plantedCells = bed.cells.length;
    const occupancy = totalCells > 0 ? Math.round((plantedCells / totalCells) * 100) : 0;

    const cellAreaM2 = (gridCellSizeCm / 100) ** 2;
    let yieldKg = 0;
    const uniquePlants = new Set<string>();

    for (const cell of bed.cells) {
      const plant = plantMap.get(cell.plantId);
      if (plant) {
        yieldKg += (plant.expectedYieldKgPerM2 ?? 0) * cellAreaM2;
        uniquePlants.add(cell.plantId);
      }
    }

    const { score, companionPairs, antagonistPairs } = calculateBedScore(bed, plantMap);

    return {
      plantedCells,
      totalCells,
      occupancy,
      uniquePlants: uniquePlants.size,
      yieldKg: Math.round(yieldKg * 10) / 10,
      score,
      companionPairs,
      antagonistPairs,
    };
  }, [bed, plantMap, gridCellSizeCm]);

  if (stats.plantedCells === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <Sprout size={11} className="text-garden-500" />
        {stats.uniquePlants} {t("bedStats.types")} / {stats.occupancy}%
      </span>
      <span className="flex items-center gap-1">
        <Apple size={11} className="text-amber-500" />
        ~{stats.yieldKg} kg
      </span>
      <span className="flex items-center gap-1">
        <Heart size={11} className={stats.score >= 60 ? "text-green-500" : stats.score >= 40 ? "text-amber-500" : "text-red-500"} />
        {t("bedStats.compatibility")}: {stats.score}%
      </span>
      {stats.antagonistPairs > 0 && (
        <span className="flex items-center gap-1 text-red-500">
          <AlertTriangle size={11} />
          {stats.antagonistPairs} {t("bedStats.conflicts")}
        </span>
      )}
    </div>
  );
}
