import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Droplets, Ruler, Check, X, CalendarDays } from "lucide-react";
import { addWeeks } from "date-fns";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import type { Plant } from "@/types/plant";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { toDate } from "@/lib/format";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useToday } from "@/hooks/useToday";

interface Props {
  plant: Plant;
  /** Weeks of frost protection of the bed (greenhouse etc.) — shifts dates earlier. */
  frostProtectionWeeks?: number;
}

/**
 * Compact plant facts for the planner side panel: needs, dates for this
 * season (already shifted for the bed's frost protection) and neighbours.
 */
export const PlantInfoPanel = memo(function PlantInfoPanel({ plant, frostProtectionWeeks = 0 }: Props) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { formatDate, formatNumber } = useFormat();
  const { lastFrostDate } = useStore(useShallow((s) => ({ lastFrostDate: s.lastFrostDate })));

  // This season's frost day, even if the stored date is from an earlier year.
  const now = useToday();
  const stored = toDate(lastFrostDate) ?? now;
  const frost = new Date(now.getFullYear(), stored.getMonth(), stored.getDate());
  const timings: Array<{ label: string; date: Date }> = [];
  const add = (label: string, weeks: number | null) => {
    if (weeks !== null) timings.push({ label, date: addWeeks(frost, weeks - frostProtectionWeeks) });
  };
  add(t("plants.details.sowIndoors"), plant.sowIndoorsWeeks);
  add(t("plants.details.sowOutdoors"), plant.sowOutdoorsWeeks);
  add(t("plants.details.transplant"), plant.transplantWeeks);

  const facts = [
    { icon: Sun, text: t(`plants.sun.${plant.sunRequirement}`) },
    { icon: Droplets, text: t(`plants.water.${plant.waterNeed}`) },
    { icon: Ruler, text: t("planner.spacing", { value: formatNumber(plant.spacingCm) }) },
  ];

  const neighbourChips = (ids: string[], good: boolean) => (
    <ul className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const p = plantMap.get(id);
        if (!p) return null;
        return (
          <li key={id} className="inline-flex items-center gap-1 rounded-md bg-gray-100 py-0.5 pr-2 pl-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
            {good
              ? <Check size={12} aria-hidden="true" className="text-positive" />
              : <X size={12} aria-hidden="true" className="text-danger" />}
            <PlantIconDisplay plantId={id} emoji={p.icon} size={14} />
            {getPlantName(id)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4 text-sm">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-gray-700 dark:text-gray-300">
        {facts.map(({ icon: Icon, text }) => (
          <li key={text} className="inline-flex items-center gap-1.5">
            <Icon size={14} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
            {text}
          </li>
        ))}
      </ul>

      {(timings.length > 0 || plant.harvestDaysMin > 0) && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <CalendarDays size={14} aria-hidden="true" />
            {t("planner.thisSeason")}
          </h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {timings.map((tm) => (
              <div key={tm.label} className="contents">
                <dt className="text-gray-500 dark:text-gray-400">{tm.label}</dt>
                <dd className="font-medium text-gray-900 tabular-nums dark:text-gray-100">{formatDate(tm.date, "short")}</dd>
              </div>
            ))}
            <dt className="text-gray-500 dark:text-gray-400">{t("planner.harvestAfter")}</dt>
            <dd className="font-medium text-gray-900 tabular-nums dark:text-gray-100">
              {t("planner.daysRange", { min: formatNumber(plant.harvestDaysMin), max: formatNumber(plant.harvestDaysMax) })}
            </dd>
          </dl>
        </div>
      )}

      {plant.companions.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t("planner.companions")}</h4>
          {neighbourChips(plant.companions, true)}
        </div>
      )}
      {plant.antagonists.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{t("planner.antagonists")}</h4>
          {neighbourChips(plant.antagonists, false)}
        </div>
      )}
    </div>
  );
});
