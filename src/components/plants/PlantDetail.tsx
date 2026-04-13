import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Droplets, Ruler, ArrowLeft, MapPin } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import type { Plant } from "@/types/plant";
import { usePlantMap } from "@/hooks/usePlants";
import { useStore } from "@/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ENVIRONMENT_ICONS } from "@/types/garden";

function PlantedLocations({ plantId }: { plantId: string }) {
  const { t } = useTranslation();
  const gardens = useStore((s) => s.gardens);

  const locations = useMemo(() => {
    const result: Array<{ gardenName: string; bedName: string; envIcon: string; count: number }> = [];
    for (const g of gardens) {
      for (const b of g.beds) {
        const count = b.cells.filter((c) => c.plantId === plantId).length;
        if (count > 0) {
          result.push({
            gardenName: g.name,
            bedName: b.name,
            envIcon: ENVIRONMENT_ICONS[b.environmentType ?? "outdoor_bed"],
            count,
          });
        }
      }
    }
    return result;
  }, [gardens, plantId]);

  if (locations.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
        <MapPin size={14} />
        {t("plants.details.plantedIn")}
      </h2>
      <div className="space-y-1">
        {locations.map((loc, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs dark:bg-gray-800">
            <span>
              <span className="mr-1">{loc.envIcon}</span>
              <span className="font-medium">{loc.gardenName}</span>
              <span className="mx-1 text-gray-400">/</span>
              {loc.bedName}
            </span>
            <span className="text-gray-500">{loc.count}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PlantDetailProps {
  plant: Plant;
  onBack: () => void;
}

export function PlantDetail({ plant, onBack }: PlantDetailProps) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();

  const renderTiming = () => {
    const items = [];
    if (plant.sowIndoorsWeeks !== null) {
      const label = plant.sowIndoorsWeeks < 0
        ? t("plants.details.weeksBeforeFrost", { weeks: Math.abs(plant.sowIndoorsWeeks) })
        : t("plants.details.weeksAfterFrost", { weeks: plant.sowIndoorsWeeks });
      items.push({ key: "sowIndoors", label: t("plants.details.sowIndoors"), value: label });
    }
    if (plant.sowOutdoorsWeeks !== null) {
      const label = plant.sowOutdoorsWeeks < 0
        ? t("plants.details.weeksBeforeFrost", { weeks: Math.abs(plant.sowOutdoorsWeeks) })
        : t("plants.details.weeksAfterFrost", { weeks: plant.sowOutdoorsWeeks });
      items.push({ key: "sowOutdoors", label: t("plants.details.sowOutdoors"), value: label });
    }
    if (plant.transplantWeeks !== null) {
      const label = plant.transplantWeeks <= 0
        ? t("plants.details.weeksBeforeFrost", { weeks: Math.abs(plant.transplantWeeks) })
        : t("plants.details.weeksAfterFrost", { weeks: plant.transplantWeeks });
      items.push({ key: "transplant", label: t("plants.details.transplant"), value: label });
    }
    items.push({
      key: "harvest",
      label: t("plants.details.harvest"),
      value: t("plants.details.daysToHarvest", { min: plant.harvestDaysMin, max: plant.harvestDaysMax }),
    });
    return items;
  };

  const companionNames = plant.companions
    .map((id) => plantMap.get(id))
    .filter(Boolean)
    .map((p) => t(`plants.catalog.${p!.id}.name`));

  const antagonistNames = plant.antagonists
    .map((id) => plantMap.get(id))
    .filter(Boolean)
    .map((p) => t(`plants.catalog.${p!.id}.name`));

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft size={16} />
        {t("nav.plants")}
      </Button>

      <Card>
        <div className="flex items-start gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-4xl"
            style={{ backgroundColor: plant.color + "20" }}
          >
            <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={40} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t(`plants.catalog.${plant.id}.name`)}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t(`plants.category.${plant.category}`)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-gray-700 dark:text-gray-300">
          {t(`plants.catalog.${plant.id}.description`)}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <Sun size={16} className="text-amber-500" />
            <span className="text-gray-600 dark:text-gray-400">{t("plants.details.sun")}:</span>
            <span className="font-medium">{t(`plants.sun.${plant.sunRequirement}`)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Droplets size={16} className="text-sky-500" />
            <span className="text-gray-600 dark:text-gray-400">{t("plants.details.water")}:</span>
            <span className="font-medium">{t(`plants.water.${plant.waterNeed}`)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Ruler size={16} className="text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">{t("plants.details.spacing")}:</span>
            <span className="font-medium">{plant.spacingCm} {t("common.cm")}</span>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">{t("plants.details.timing")}</h2>
          <div className="space-y-2">
            {renderTiming().map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {companionNames.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">
              {t("plants.details.companions")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {companionNames.map((name) => (
                <span key={name} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {antagonistNames.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
              {t("plants.details.antagonists")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {antagonistNames.map((name) => (
                <span key={name} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <PlantedLocations plantId={plant.id} />
      </Card>
    </div>
  );
}
