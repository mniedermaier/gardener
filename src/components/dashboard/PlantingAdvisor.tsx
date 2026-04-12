import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { useStore } from "@/store";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { getPlantingAdvice } from "@/lib/advisor";
import { Card } from "@/components/ui/Card";

const URGENCY_STYLES = {
  now: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const ACTION_KEYS = {
  sow_indoors: "calendar.taskTypes.sow_indoors",
  sow_outdoors: "calendar.taskTypes.sow_outdoors",
  transplant: "calendar.taskTypes.transplant",
};

export function PlantingAdvisor() {
  const { t } = useTranslation();
  const { gardens, lastFrostDate } = useStore();
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const alreadyPlanted = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return ids;
  }, [gardens]);

  const advice = useMemo(
    () => getPlantingAdvice(plants, lastFrostDate, alreadyPlanted).slice(0, 8),
    [plants, lastFrostDate, alreadyPlanted]
  );

  if (advice.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Lightbulb size={16} className="text-amber-500" />
        {t("advisor.title")}
      </h2>
      <div className="space-y-2">
        {advice.map((a) => {
          const plant = plantMap.get(a.plantId);
          if (!plant) return null;
          return (
            <div
              key={`${a.plantId}-${a.action}`}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <span>{plant.icon}</span>
                <span className="text-sm font-medium">{getPlantName(a.plantId)}</span>
                <span className="text-xs text-gray-500">{t(ACTION_KEYS[a.action])}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[a.urgency]}`}>
                {a.urgency === "now"
                  ? t("advisor.now")
                  : t("advisor.inWeeks", { weeks: a.weeksUntil })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
