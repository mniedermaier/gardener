import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ArrowUpDown, ChartColumn, Flame, Grid2x2, Network, Scale, Sprout, Trash2, Wheat, Zap, type LucideIcon } from "lucide-react";
import type { Bed, ColdFrameConfig, ContainerConfig, EnvironmentType, GreenhouseConfig, RaisedBedConfig } from "@/types/garden";
import { STRATEGY_DETAILS, DIRECTION_DETAILS, type PlantingDirection, type PlantingStrategy } from "@/lib/bedRecommendation";
import { useFormat } from "@/hooks/useFormat";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { ENVIRONMENT_LUCIDE } from "./environment";
import { ColdFrameConfigPanel, ContainerConfigPanel, GreenhouseConfigPanel, RaisedBedConfigPanel } from "./EnvironmentConfigPanels";

const ALL_ENVIRONMENTS: EnvironmentType[] = [
  "outdoor_bed", "raised_bed", "greenhouse", "cold_frame",
  "polytunnel", "container", "windowsill", "vertical",
];

const DEFAULT_GH: GreenhouseConfig = { material: "glass", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 };

export interface BedDraft {
  name: string;
  widthM: number;
  heightM: number;
  environmentType: EnvironmentType;
  greenhouseConfig: GreenhouseConfig;
  coldFrameConfig: ColdFrameConfig;
  raisedBedConfig: RaisedBedConfig;
  containerConfig: ContainerConfig;
}

export function bedToDraft(bed: Bed | undefined, gridCellSizeCm: number): BedDraft {
  const m = gridCellSizeCm / 100;
  return {
    name: bed?.name ?? "",
    widthM: bed ? Math.round(bed.width * m * 100) / 100 : 1.8,
    heightM: bed ? Math.round(bed.height * m * 100) / 100 : 1.2,
    environmentType: bed?.environmentType ?? "outdoor_bed",
    greenhouseConfig: bed?.greenhouseConfig ?? DEFAULT_GH,
    coldFrameConfig: bed?.coldFrameConfig ?? { frostProtectionWeeks: 3 },
    raisedBedConfig: bed?.raisedBedConfig ?? { heightCm: 80 },
    containerConfig: bed?.containerConfig ?? { volumeLiters: 30, material: "terracotta" },
  };
}

/** Bed fields from a draft: grid size from metres, only the config of the chosen type. */
export function draftToBed(d: BedDraft, gridCellSizeCm: number) {
  const m = gridCellSizeCm / 100;
  return {
    name: d.name.trim(),
    width: Math.max(1, Math.round(d.widthM / m)),
    height: Math.max(1, Math.round(d.heightM / m)),
    environmentType: d.environmentType,
    greenhouseConfig: d.environmentType === "greenhouse" ? { ...d.greenhouseConfig } : undefined,
    coldFrameConfig: d.environmentType === "cold_frame" ? { ...d.coldFrameConfig } : undefined,
    raisedBedConfig: d.environmentType === "raised_bed" ? { ...d.raisedBedConfig } : undefined,
    containerConfig: d.environmentType === "container" ? { ...d.containerConfig } : undefined,
  };
}

interface BedDialogProps {
  open: boolean;
  /** The bed being edited; undefined = create. */
  bed?: Bed;
  gridCellSizeCm: number;
  onClose: () => void;
  onSave: (draft: BedDraft) => void;
  onDelete?: (bed: Bed) => void;
}

/**
 * One dialog to create and to edit a bed (name, type, size, type settings).
 * The parent remounts it per bed via `key`, so the draft starts fresh.
 */
export function BedDialog({ open, bed, gridCellSizeCm, onClose, onSave, onDelete }: BedDialogProps) {
  const { t } = useTranslation();
  const { formatNumber } = useFormat();
  const [draft, setDraft] = useState<BedDraft>(() => bedToDraft(bed, gridCellSizeCm));
  const patch = (p: Partial<BedDraft>) => setDraft((d) => ({ ...d, ...p }));

  const cols = Math.max(1, Math.round(draft.widthM / (gridCellSizeCm / 100)));
  const rows = Math.max(1, Math.round(draft.heightM / (gridCellSizeCm / 100)));
  const shrinks = bed && (cols < bed.width || rows < bed.height) && bed.cells.some((c) => c.cellX >= cols || c.cellY >= rows);
  const valid = draft.name.trim().length > 0 && draft.widthM > 0 && draft.heightM > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bed ? t("planner.editBed") : t("planner.newBed")}
      footer={
        <>
          {bed && onDelete && (
            <Button variant="danger-ghost" className="mr-auto" onClick={() => onDelete(bed)}>
              <Trash2 size={16} aria-hidden="true" />
              {t("common.delete")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => valid && onSave(draft)} disabled={!valid}>{bed ? t("common.save") : t("common.add")}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(draft); }}>
        <Input label={t("planner.bedName")} value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t("planner.bedNamePlaceholder")} autoFocus />
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("planner.environment")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t("planner.environment")}>
            {ALL_ENVIRONMENTS.map((env) => {
              const Icon = ENVIRONMENT_LUCIDE[env];
              const selected = draft.environmentType === env;
              return (
                <button
                  key={env}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => patch({ environmentType: env })}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors sm:flex-col sm:items-center sm:gap-1 sm:text-center sm:text-xs",
                    selected
                      ? "border-garden-600 bg-garden-50 font-medium text-garden-800 ring-1 ring-garden-600 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200 dark:ring-garden-400"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5",
                  )}
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="leading-tight">{t(`planner.environmentTypes.${env}`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("planner.widthM")} type="number" min={0.3} max={50} step={0.1} value={draft.widthM} onChange={(e) => patch({ widthM: Number(e.target.value) })} />
          <Input label={t("planner.heightM")} type="number" min={0.3} max={50} step={0.1} value={draft.heightM} onChange={(e) => patch({ heightM: Number(e.target.value) })} />
        </div>
        <p className={cn("-mt-2 text-xs", shrinks ? "font-medium text-warning" : "text-gray-500 dark:text-gray-400")}>
          {shrinks
            ? t("planner.shrinkWarning")
            : t("planner.gridInfo", { cells: `${cols} × ${rows}`, size: formatNumber(gridCellSizeCm) })}
        </p>
        {draft.environmentType === "greenhouse" && <GreenhouseConfigPanel config={draft.greenhouseConfig} onChange={(c) => patch({ greenhouseConfig: c })} />}
        {draft.environmentType === "cold_frame" && <ColdFrameConfigPanel config={draft.coldFrameConfig} onChange={(c) => patch({ coldFrameConfig: c })} />}
        {draft.environmentType === "raised_bed" && <RaisedBedConfigPanel config={draft.raisedBedConfig} onChange={(c) => patch({ raisedBedConfig: c })} />}
        {draft.environmentType === "container" && <ContainerConfigPanel config={draft.containerConfig} onChange={(c) => patch({ containerConfig: c })} />}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

// --- Auto-fill ---------------------------------------------------------------

const STRATEGY_ICONS: Record<PlantingStrategy, LucideIcon> = {
  balanced: Scale,
  calories: Flame,
  selfsufficient: Wheat,
  yield: ChartColumn,
  beginner: Sprout,
  quickharvest: Zap,
};

const DIRECTION_ICONS: Record<PlantingDirection, LucideIcon> = {
  rows_ew: ArrowLeftRight,
  rows_ns: ArrowUpDown,
  blocks: Grid2x2,
  companion_clusters: Network,
};

interface AutoFillProps {
  open: boolean;
  bedName: string;
  hasPlants: boolean;
  onClose: () => void;
  onApply: (strategy: PlantingStrategy, direction: PlantingDirection) => void;
}

/** Choose a strategy and a layout, then fill the bed — undoable via toast. */
export function AutoFillDialog({ open, bedName, hasPlants, onClose, onApply }: AutoFillProps) {
  const { t } = useTranslation();
  const [strategy, setStrategy] = useState<PlantingStrategy>("balanced");
  const [direction, setDirection] = useState<PlantingDirection>("rows_ew");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("planner.autoFill")}
      description={t("planner.autoFillDescription", { name: bedName })}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => onApply(strategy, direction)}>{t("planner.autoFillApply")}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("planner.strategy")}</p>
          <div role="radiogroup" aria-label={t("planner.strategy")} className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(STRATEGY_DETAILS) as PlantingStrategy[]).map((key) => {
              const s = STRATEGY_DETAILS[key];
              const Icon = STRATEGY_ICONS[key];
              const selected = strategy === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setStrategy(key)}
                  className={cn(
                    "flex min-h-14 items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected
                      ? "border-garden-600 bg-garden-50 ring-1 ring-garden-600 dark:border-garden-400 dark:bg-garden-500/15 dark:ring-garden-400"
                      : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5",
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", selected ? "bg-garden-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300")}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t(s.nameKey)}</span>
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{t(s.descKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("planner.direction")}</p>
          <div className="overflow-x-auto">
            <SegmentedControl
              label={t("planner.direction")}
              value={direction}
              onChange={setDirection}
              options={(Object.keys(DIRECTION_DETAILS) as PlantingDirection[]).map((key) => ({
                value: key,
                label: t(DIRECTION_DETAILS[key].nameKey),
                icon: DIRECTION_ICONS[key],
              }))}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t(`planner.directionHint.${direction}`)}</p>
        </div>
        {hasPlants && <p className="rounded-lg bg-info/10 p-3 text-sm text-info dark:bg-info/15">{t("planner.autoFillKeeps")}</p>}
      </div>
    </Modal>
  );
}
