import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Badge } from "@/components/ui/Badge";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import type { Plant } from "@/types/plant";

interface PlantCardProps {
  plant: Plant;
  /** Stands in at least one bed. */
  planted?: boolean;
  custom?: boolean;
  onOpen: (id: string) => void;
  /** A category filter is active: the category would repeat on every row. */
  hideCategory?: boolean;
}

/** Catalogue tile: icon, name, category and the three facts people filter by. */
export const PlantCard = memo(function PlantCard({ plant, planted, custom, onOpen, hideCategory = false }: PlantCardProps) {
  const { t } = useTranslation();
  const getPlantName = usePlantName();
  const { formatNumber } = useFormat();

  return (
    <button
      type="button"
      onClick={() => onOpen(plant.id)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/60 sm:rounded-xl sm:border sm:border-gray-200 sm:bg-white sm:p-4 sm:shadow-xs sm:hover:border-garden-300 dark:hover:bg-white/5 sm:dark:border-white/10 sm:dark:bg-gray-900 sm:dark:hover:border-garden-500/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 sm:size-12 dark:bg-white/5" aria-hidden="true">
        <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={30} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{getPlantName(plant.id)}</span>
          {planted && <Badge tone="brand" size="sm">{t("plants.inGarden")}</Badge>}
          {custom && <Badge variant="outline" size="sm">{t("plants.custom")}</Badge>}
        </span>
        {/* Two fixed meta lines, so every card wraps the same way:
            category · sun / water · spacing (category left out when a category filter shows it). */}
        {[
          [hideCategory ? null : t(`plants.category.${plant.category}`), t(`plants.sun.${plant.sunRequirement}`)],
          [t("plants.waterCaption", { level: t(`plants.water.${plant.waterNeed}`) }), t("plants.spacingCaption", { value: `${formatNumber(plant.spacingCm)}\u00a0${t("common.cm")}` })],
        ].map((line, li) => (
          <span key={li} className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-400">
            {line.filter(Boolean).join(" · ")}
          </span>
        ))}
      </span>
      {/* Row affordance: the whole tile opens the plant. */}
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 self-center text-gray-400 dark:text-gray-500" />
    </button>
  );
});
