import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import type { PreservationMethod } from "@/types/plant";

const METHOD_ICONS: Record<PreservationMethod, string> = {
  canning: "\ud83c\udf6f",
  freezing: "\u2744\ufe0f",
  fermenting: "\ud83e\uddc5",
  drying: "\u2600\ufe0f",
  root_cellar: "\ud83c\udfe0",
};

export function PreservationGuide() {
  const { t } = useTranslation();
  const { gardens } = useStore();
  const plantMap = usePlantMap();

  const plantedPlants = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return Array.from(ids).map((id) => plantMap.get(id)).filter(Boolean).filter((p) => p!.preservationMethods && p!.preservationMethods.length > 0);
  }, [gardens, plantMap]);

  const seedSavingPlants = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return Array.from(ids).map((id) => plantMap.get(id)).filter(Boolean).filter((p) => p!.seedSaving);
  }, [gardens, plantMap]);

  if (plantedPlants.length === 0 && seedSavingPlants.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500">{t("sufficiency.noPlantings")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {plantedPlants.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("preservation.title")}</h2>
          <p className="mb-4 text-xs text-gray-500">{t("preservation.desc")}</p>
          <div className="space-y-2">
            {plantedPlants.map((plant) => (
              <div key={plant!.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span>{plant!.icon}</span>
                  <span className="text-sm font-medium">{t(`plants.catalog.${plant!.id}.name`)}</span>
                </div>
                <div className="flex gap-2">
                  {plant!.preservationMethods!.map((method) => (
                    <span
                      key={method}
                      className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
                      title={t(`preservation.methods.${method}`)}
                    >
                      {METHOD_ICONS[method]} {t(`preservation.methods.${method}`)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {seedSavingPlants.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("preservation.seedSaving")}</h2>
          <div className="space-y-2">
            {seedSavingPlants.map((plant) => {
              const ss = plant!.seedSaving!;
              return (
                <div key={plant!.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <span>{plant!.icon}</span>
                    <span className="text-sm font-medium">{t(`plants.catalog.${plant!.id}.name`)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`rounded-full px-2 py-0.5 ${
                      ss.difficulty === "easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      ss.difficulty === "moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {t(`preservation.difficulty.${ss.difficulty}`)}
                    </span>
                    {ss.isolationDistanceM && <span>{ss.isolationDistanceM}m</span>}
                    <span>{ss.seedViabilityYears} {t("preservation.years")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
