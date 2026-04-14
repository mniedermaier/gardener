import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ANIMAL_ICONS, PRODUCT_ICONS, ANNUAL_YIELD } from "@/types/animal";
import type { Animal, HealthEvent, HealthEventType } from "@/types/animal";

const HEALTH_ICONS: Record<HealthEventType, string> = {
  vaccination: "💉", deworming: "💊", illness: "🤒", injury: "🩹",
  checkup: "🩺", treatment: "💊", death: "✝️", other: "📋",
};

interface AnimalCardProps {
  animal: Animal;
  productCount: number;
  feedCost: number;
  healthCount: number;
  lastHealth?: HealthEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export const AnimalCard = memo(function AnimalCard({
  animal, productCount, feedCost, healthCount, lastHealth,
  onEdit, onDelete, onClick,
}: AnimalCardProps) {
  const { t } = useTranslation();
  const yields = ANNUAL_YIELD[animal.type];

  return (
    <div onClick={onClick} className="cursor-pointer">
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{ANIMAL_ICONS[animal.type]}</span>
          <div>
            <h3 className="font-semibold">{animal.name || t(`livestock.types.${animal.type}`)}</h3>
            <p className="text-sm text-gray-500">
              {animal.count}× {t(`livestock.types.${animal.type}`)}
              <span className="ml-2 text-xs text-gray-400">{t("livestock.since")} {animal.acquiredDate}</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
              {yields.map((y) => (
                <span key={y.product}>
                  {PRODUCT_ICONS[y.product]} ~{y.quantity * animal.count} {y.unit}/{t("livestock.year")}
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
              <span>{t("livestock.productionEntries", { count: productCount })}</span>
              {feedCost > 0 && <span>{t("livestock.feedTotal")}: {feedCost.toFixed(2)} €</span>}
              {healthCount > 0 && <span>🩺 {healthCount}</span>}
            </div>
            {animal.notes && <p className="mt-1 text-xs italic text-gray-400">{animal.notes}</p>}
            {lastHealth && (
              <p className="mt-1 text-xs text-gray-400">
                {HEALTH_ICONS[lastHealth.type]} {t(`livestock.healthTypes.${lastHealth.type}`)} · {lastHealth.date}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="rounded p-1 text-gray-300 hover:text-garden-500">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-gray-300 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
    </div>
  );
});
