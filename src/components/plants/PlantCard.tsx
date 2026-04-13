import { useTranslation } from "react-i18next";
import { Sun, Droplets } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import type { Plant } from "@/types/plant";

interface PlantCardProps {
  plant: Plant;
  onClick?: () => void;
}

export function PlantCard({ plant, onClick }: PlantCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-garden-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-garden-600"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
        style={{ backgroundColor: plant.color + "20" }}
      >
        <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t(`plants.catalog.${plant.id}.name`)}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t(`plants.category.${plant.category}`)}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Sun size={12} />
            {t(`plants.sun.${plant.sunRequirement}`)}
          </span>
          <span className="flex items-center gap-1">
            <Droplets size={12} />
            {t(`plants.water.${plant.waterNeed}`)}
          </span>
        </div>
      </div>
    </button>
  );
}
