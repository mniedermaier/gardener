import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Apple, Bug, ChevronDown, ChevronUp, NotebookPen, Plus, Trash2, X, TriangleAlert } from "lucide-react";
import type { Bed, CellPlanting } from "@/types/garden";
import type { Plant } from "@/types/plant";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Textarea } from "@/components/ui/Textarea";
import { PlantInfoPanel } from "./PlantInfoPanel";

interface Props {
  gardenId: string;
  bed: Bed;
  cell: CellPlanting;
  plant: Plant;
  frostProtectionWeeks: number;
  conflictPartners: string[];
  onClose: () => void;
  onPlantMore: (plant: Plant) => void;
  onRemove: (cell: CellPlanting) => void;
  onUpdate: (updates: Partial<CellPlanting>) => void;
  /** In the mobile sheet the sheet header already names the plant. */
  hideHeader?: boolean;
  /** Mobile peek: only the actions, plus a button that expands the sheet. */
  compact?: boolean;
  onExpand?: () => void;
}

/**
 * Inspect mode: what is planted in the selected cell, its notes, and the
 * things you do with a planting — log a harvest, report a problem, write a
 * journal note (deep links into those pages, pre-filled), plant more of it.
 */
export const CellInspector = memo(function CellInspector({
  gardenId, bed, cell, plant, frostProtectionWeeks, conflictPartners, onClose, onPlantMore, onRemove, onUpdate, hideHeader = false, compact = false, onExpand,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const getPlantName = usePlantName();
  const name = getPlantName(plant.id);

  // Deep links that open the target page's add dialog pre-filled (?plant=…&bed=…).
  const go = (to: string) => {
    const q = new URLSearchParams(to === "/journal" ? { add: "1" } : {});
    q.set("plant", plant.id);
    q.set("bed", bed.id);
    navigate(`${to}?${q.toString()}`, { state: { openAdd: true, prefill: { plantId: plant.id, bedId: bed.id, gardenId } } satisfies OpenAddState });
  };

  return (
    <section aria-label={t("planner.inspectorLabel", { name })} className={compact ? "space-y-3" : "space-y-4"}>
      {!hideHeader && <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: plant.color + "22" }}>
          <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
            {name}
            {cell.variety && <span className="font-normal text-gray-500 dark:text-gray-400"> · {cell.variety}</span>}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {bed.name} · {t("planner.cellPosition", { row: cell.cellY + 1, col: cell.cellX + 1 })}
          </p>
        </div>
        <IconButton icon={X} label={t("common.close")} onClick={onClose} className="-mt-1 -mr-1" />
      </div>}

      {conflictPartners.length > 0 && (
        <div role="note" className="flex gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning dark:bg-warning/15">
          <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t("planner.conflictWith", { plants: conflictPartners.map(getPlantName).join(", ") })}</p>
            {!compact && <p className="mt-0.5 text-gray-700 dark:text-gray-300">{t("planner.conflictWhy")}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPlantMore(plant)}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-garden-600 px-3 py-2 text-left text-sm font-medium text-white transition-colors hover:bg-garden-700"
        >
          <Plus size={18} aria-hidden="true" className="shrink-0" />
          {t("planner.plantMore")}
        </button>
        {[
          { icon: Apple, label: t("planner.actions.harvest"), to: "/harvest" },
          { icon: Bug, label: t("planner.actions.problem"), to: "/pests" },
          { icon: NotebookPen, label: t("planner.actions.note"), to: "/journal" },
        ].map(({ icon: Icon, label, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => go(to)}
            className="flex min-h-12 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-800 transition-colors hover:border-garden-400 hover:bg-garden-50 dark:border-white/10 dark:text-gray-200 dark:hover:border-garden-500/50 dark:hover:bg-garden-500/10"
          >
            <Icon size={18} aria-hidden="true" className="shrink-0 text-garden-700 dark:text-garden-300" />
            {label}
          </button>
        ))}
      </div>

      {compact ? (
        <button
          type="button"
          onClick={onExpand}
          className="flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-sm font-medium text-garden-700 dark:text-garden-300"
        >
          {t("planner.sheetMore")}
          <ChevronUp size={18} aria-hidden="true" />
        </button>
      ) : <>
      <div className="space-y-3">
        <Input
          label={t("planner.variety")}
          value={cell.variety ?? ""}
          onChange={(e) => onUpdate({ variety: e.target.value || undefined })}
          placeholder={t("planner.varietyPlaceholder")}
        />
        <DatePicker
          label={t("planner.plantedDate")}
          value={cell.plantedDate ?? ""}
          onChange={(e) => onUpdate({ plantedDate: e.target.value || undefined })}
        />
        <Textarea label={t("harvest.notes")} rows={2} value={cell.notes ?? ""} onChange={(e) => onUpdate({ notes: e.target.value || undefined })} />
      </div>

      <details className="group rounded-lg border border-gray-200 dark:border-white/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("planner.plantFacts")}
          <ChevronDown size={16} aria-hidden="true" className="text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-gray-200 p-3 dark:border-white/10">
          <PlantInfoPanel plant={plant} frostProtectionWeeks={frostProtectionWeeks} />
        </div>
      </details>

      <div className="border-t border-gray-100 pt-3 dark:border-white/5">
        <Button variant="danger-ghost" size="sm" onClick={() => onRemove(cell)}>
          <Trash2 size={16} aria-hidden="true" />
          {t("planner.removePlant")}
        </Button>
      </div>
      </>}
    </section>
  );
});
