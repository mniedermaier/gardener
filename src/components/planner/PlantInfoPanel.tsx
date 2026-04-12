import { useTranslation } from "react-i18next";
import { Sun, Droplets, Ruler, Clock, Apple, X } from "lucide-react";
import type { Plant } from "@/types/plant";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useStore } from "@/store";
import { addWeeks, parseISO, format } from "date-fns";

interface Props {
  plant: Plant;
  onClose: () => void;
}

export function PlantInfoPanel({ plant, onClose }: Props) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { lastFrostDate } = useStore();

  const frostDate = parseISO(lastFrostDate);

  const timings: Array<{ label: string; date: string }> = [];
  if (plant.sowIndoorsWeeks !== null) {
    timings.push({
      label: t("plants.details.sowIndoors"),
      date: format(addWeeks(frostDate, plant.sowIndoorsWeeks), "dd.MM"),
    });
  }
  if (plant.sowOutdoorsWeeks !== null) {
    timings.push({
      label: t("plants.details.sowOutdoors"),
      date: format(addWeeks(frostDate, plant.sowOutdoorsWeeks), "dd.MM"),
    });
  }
  if (plant.transplantWeeks !== null) {
    timings.push({
      label: t("plants.details.transplant"),
      date: format(addWeeks(frostDate, plant.transplantWeeks), "dd.MM"),
    });
  }

  return (
    <div className="rounded-xl border border-garden-200 bg-garden-50/50 p-4 dark:border-garden-800 dark:bg-garden-900/20">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl" style={{ backgroundColor: plant.color + "20" }}>
            {plant.icon}
          </span>
          <div>
            <h3 className="font-semibold">{getPlantName(plant.id)}</h3>
            <p className="text-xs text-gray-500">{t(`plants.category.${plant.category}`)}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X size={16} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 dark:bg-gray-800">
          <Sun size={12} className="text-amber-500" />
          <span>{t(`plants.sun.${plant.sunRequirement}`)}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 dark:bg-gray-800">
          <Droplets size={12} className="text-sky-500" />
          <span>{t(`plants.water.${plant.waterNeed}`)}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 dark:bg-gray-800">
          <Ruler size={12} className="text-gray-500" />
          <span>{plant.spacingCm} cm</span>
        </div>
      </div>

      {timings.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {timings.map((t) => (
            <span key={t.label} className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs dark:bg-gray-800">
              <Clock size={10} className="text-gray-400" />
              {t.label}: <strong>{t.date}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-3 text-xs">
        {plant.expectedYieldKgPerM2 && (
          <span className="flex items-center gap-1">
            <Apple size={10} className="text-garden-500" />
            {plant.expectedYieldKgPerM2} kg/m²
          </span>
        )}
        {plant.caloriesPer100g && (
          <span className="text-gray-500">{plant.caloriesPer100g} kcal/100g</span>
        )}
        <span className="text-gray-500">{plant.harvestDaysMin}-{plant.harvestDaysMax} {t("common.days", { defaultValue: "days" })}</span>
      </div>

      {plant.companions.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">{t("planner.companions")}</p>
          <div className="flex flex-wrap gap-1">
            {plant.companions.map((id) => {
              const p = plantMap.get(id);
              return p ? (
                <span key={id} className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {p.icon} {getPlantName(id)}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {plant.antagonists.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">{t("planner.antagonists")}</p>
          <div className="flex flex-wrap gap-1">
            {plant.antagonists.map((id) => {
              const p = plantMap.get(id);
              return p ? (
                <span key={id} className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {p.icon} {getPlantName(id)}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
