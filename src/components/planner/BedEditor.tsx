import { memo, useMemo, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Eraser, Footprints, Pencil, Trash2, Wand2, ZoomIn, ZoomOut, Check, MousePointerClick, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Bed } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import type { Plant } from "@/types/plant";
import type { CellConflict, ConflictPair } from "@/lib/placementValidation";
import { useFormat } from "@/hooks/useFormat";
import { usePlantName } from "@/hooks/usePlantName";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { EnvironmentChip } from "./environment";
import { EditableBedGrid, type GridMode } from "./BedGrid";
import { BedStats } from "./BedStats";
import { GuildPicker } from "./GuildPicker";
import { usePointerFine } from "./usePointerFine";

interface Props {
  gardenId: string;
  bed: Bed;
  plantMap: Map<string, Plant>;
  gridCellSizeCm: number;
  mode: GridMode;
  placingPlant: Plant | null;
  hints?: Map<string, "good" | "bad">;
  conflicts: ConflictPair[];
  conflictMap: Map<string, CellConflict>;
  companionPairs: number;
  selectedKey: string | null;
  zoom: number;
  feedback: string | null;
  onZoom: (zoom: number) => void;
  onActivate: (x: number, y: number) => void;
  onBack: () => void;
  onStopMode: () => void;
  onSelectCell: (x: number, y: number) => void;
  onEdit: () => void;
  onAutoFill: () => void;
  onPathMode: () => void;
  onClear: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/**
 * The single-bed editor: header with actions, an explicit mode bar
 * (placing / paths), the grid, conflict explanations and key figures.
 */
/** Icon + label inside the placing hint (Trans component): the same marks as the grid and the legend. */
function HintMark({ kind, children }: { kind: "good" | "bad"; children?: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      {kind === "good"
        ? <Check size={12} strokeWidth={3} aria-hidden="true" className="mr-0.5 inline-block align-[-1px] text-positive" />
        : <TriangleAlert size={12} aria-hidden="true" className="mr-0.5 inline-block align-[-1px] text-warning" />}
      {children}
    </span>
  );
}

export const BedEditor = memo(function BedEditor(props: Props) {
  const {
    gardenId, bed, plantMap, gridCellSizeCm, mode, placingPlant, hints, conflicts, conflictMap, companionPairs,
    selectedKey, zoom, feedback, onZoom, onActivate, onBack, onStopMode, onSelectCell, onEdit, onAutoFill, onPathMode, onClear, onDuplicate, onDelete,
  } = props;
  const { t } = useTranslation();
  const fine = usePointerFine();
  const { formatNumber, formatPercent } = useFormat();
  const getPlantName = usePlantName();
  const envType = bed.environmentType ?? "outdoor_bed";
  const frostWeeks = getFrostProtectionWeeks(bed);
  const size = `${formatNumber((bed.width * gridCellSizeCm) / 100)} × ${formatNumber((bed.height * gridCellSizeCm) / 100)} m`;

  // Group conflict pairs by plant combination: "Tomate ↔ Gurke · 2 Stellen".
  const conflictGroups = useMemo(() => {
    const groups = new Map<string, { a: string; b: string; pairs: ConflictPair[] }>();
    for (const pair of conflicts) {
      const [a, b] = [pair.a.plantId, pair.b.plantId].sort();
      const key = `${a}|${b}`;
      const g = groups.get(key) ?? { a, b, pairs: [] };
      g.pairs.push(pair);
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [conflicts]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900">
      {/* Header */}
      <div data-bed-header className="flex items-center gap-x-2 border-b border-gray-100 px-3 py-3 sm:gap-x-3 sm:px-4 dark:border-white/5">
        <IconButton icon={ArrowLeft} label={t("planner.allBeds")} onClick={onBack} className="-ml-1" />
        {/* Mobile: the bed type is in the meta line; the chip would push the zoom controls into a second row. */}
        <span className="hidden sm:contents"><EnvironmentChip type={envType} /></span>
        {/* w-0: the title must not widen the card to its full text width. */}
        <div className="w-0 min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">{bed.name}</h2>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {[size, t(`planner.environmentTypes.${envType}`), t("season.plants", { count: bed.cells.length })].join(" · ")}
          </p>
        </div>
        {frostWeeks > 0 && <span className="hidden sm:contents"><Badge tone="info" icon={ShieldCheck}>{t("planner.frostProtectionBadge", { count: frostWeeks })}</Badge></span>}
        <div className="-mr-1 flex shrink-0 items-center sm:mr-0 sm:gap-0.5">
          <IconButton icon={ZoomOut} label={t("planner.zoomOut")} onClick={() => onZoom(Math.max(0.6, Math.round((zoom - 0.2) * 10) / 10))} disabled={zoom <= 0.6} />
          <span className="hidden w-11 text-center text-xs text-gray-500 tabular-nums sm:inline dark:text-gray-400">{formatPercent(zoom, 0)}</span>
          <IconButton icon={ZoomIn} label={t("planner.zoomIn")} onClick={() => onZoom(Math.min(1.6, Math.round((zoom + 0.2) * 10) / 10))} disabled={zoom >= 1.6} />
          <Menu
            label={t("planner.bedActions", { name: bed.name })}
            items={[
              { label: t("planner.editBed"), icon: Pencil, onSelect: onEdit },
              { label: t("planner.autoFill"), icon: Wand2, onSelect: onAutoFill },
              { label: mode === "path" ? t("planner.pathModeDone") : t("planner.pathMode"), icon: Footprints, onSelect: onPathMode },
              { label: t("common.duplicate"), icon: Copy, onSelect: onDuplicate },
              "separator",
              { label: t("planner.clearBed"), icon: Eraser, danger: true, disabled: bed.cells.length === 0, onSelect: onClear },
              { label: t("planner.deleteBed"), icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        </div>
      </div>

      {/* Mode bar: always says what a tap on the grid will do */}
      <div
        aria-live="polite"
        className={`sticky top-0 z-20 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm sm:px-4 ${mode === "inspect" && selectedKey ? "max-md:hidden " : ""}${
          mode === "place"
            ? "border-garden-200 bg-garden-50/95 text-garden-900 backdrop-blur dark:border-garden-500/30 dark:bg-garden-950/90 dark:text-garden-100"
            : mode === "path"
              ? "border-gray-200 bg-gray-100/95 text-gray-900 backdrop-blur dark:border-white/10 dark:bg-gray-800/95 dark:text-gray-100"
              : "border-gray-100 text-gray-600 dark:border-white/5 dark:text-gray-400"
        }`}
      >
        {mode === "place" && placingPlant ? (
          <>
            <span className="flex size-7 items-center justify-center rounded-md bg-white dark:bg-white/10">
              <PlantIconDisplay plantId={placingPlant.id} emoji={placingPlant.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{t("planner.placing", { plant: getPlantName(placingPlant.id) })}</span>
              <span className="block text-xs text-garden-800 sm:inline sm:pl-2 dark:text-garden-200"><Trans
                  i18nKey={fine ? "planner.placingHintClick" : "planner.placingHint"}
                  components={{ good: <HintMark kind="good" />, bad: <HintMark kind="bad" /> }}
                /></span>
            </span>
            <Button size="sm" onClick={onStopMode}>
              <Check size={16} aria-hidden="true" />
              {t("planner.done")}
            </Button>
          </>
        ) : mode === "path" ? (
          <>
            <Footprints size={18} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">{t("planner.pathModeHint")}</span>
            <Button size="sm" onClick={onStopMode}>
              <Check size={16} aria-hidden="true" />
              {t("planner.pathModeDone")}
            </Button>
          </>
        ) : (
          <>
            <MousePointerClick size={16} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1 text-xs sm:text-sm">{fine ? t("planner.inspectHintClick") : t("planner.inspectHint")}</span>
          </>
        )}
      </div>

      {feedback && (
        <p role="status" className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning dark:bg-warning/15">
          <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
          {feedback}
        </p>
      )}

      <div className="px-3 py-4 sm:px-4">
        <EditableBedGrid
          bed={bed}
          plantMap={plantMap}
          getPlantName={getPlantName}
          mode={mode}
          hints={hints}
          conflicts={conflictMap}
          selectedKey={selectedKey}
          zoom={zoom}
          onActivate={onActivate}
        />

        {(mode === "place" || conflicts.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400" aria-label={t("planner.legend")}>
            {mode === "place" && (
              <>
                <li className="inline-flex items-center gap-1.5"><span className="flex size-4 items-center justify-center rounded bg-positive/15"><Check size={12} aria-hidden="true" className="text-positive" /></span>{t("planner.legendGood")}</li>
                <li className="inline-flex items-center gap-1.5"><span className="flex size-4 items-center justify-center rounded bg-warning/10"><TriangleAlert size={11} aria-hidden="true" className="text-warning" /></span>{t("planner.legendBad")}</li>
              </>
            )}
            {conflicts.length > 0 && (
              <li className="inline-flex items-center gap-1.5">
                <span className="relative size-4 rounded bg-white shadow-[inset_-3px_0_0_0_var(--color-warning)] dark:bg-white/10">
                  <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-warning text-white ring-1 ring-white dark:text-gray-950 dark:ring-gray-900">
                    <TriangleAlert size={8} strokeWidth={3} aria-hidden="true" />
                  </span>
                </span>
                {t("planner.legendConflict")}
              </li>
            )}
          </ul>
        )}
      </div>

      {conflictGroups.length > 0 && (
        <section className="border-t border-gray-100 px-3 py-4 sm:px-4 dark:border-white/5" aria-labelledby={`conflicts-${bed.id}`}>
          <h3 id={`conflicts-${bed.id}`} className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("planner.conflictsTitle", { count: conflicts.length })}
          </h3>
          <p className="mt-0.5 mb-2 text-xs text-gray-500 dark:text-gray-400">{t("planner.conflictWhy")}</p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-white/5 dark:border-white/10">
            {conflictGroups.map((g) => {
              const pa = plantMap.get(g.a);
              const pb = plantMap.get(g.b);
              const first = g.pairs[0].a;
              return (
                <li key={`${g.a}|${g.b}`}>
                  <button
                    type="button"
                    onClick={() => onSelectCell(first.x, first.y)}
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    {pa && <PlantIconDisplay plantId={pa.id} emoji={pa.icon} size={20} />}
                    <span aria-hidden="true" className="text-warning"><TriangleAlert size={14} /></span>
                    {pb && <PlantIconDisplay plantId={pb.id} emoji={pb.icon} size={20} />}
                    <span className="min-w-0 flex-1 font-medium text-gray-900 dark:text-gray-100">
                      {getPlantName(g.a)} ↔ {getPlantName(g.b)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t("planner.spots", { count: g.pairs.length })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bed.cells.length > 0 ? (
        <div className="border-t border-gray-100 px-3 py-4 sm:px-4 dark:border-white/5">
          <BedStats bed={bed} plantMap={plantMap} gridCellSizeCm={gridCellSizeCm} companionPairs={companionPairs} conflictPairs={conflicts.length} />
        </div>
      ) : (
        <div className="border-t border-gray-100 px-3 py-4 sm:px-4 dark:border-white/5">
          <GuildPicker gardenId={gardenId} bedId={bed.id} bedWidth={bed.width} bedHeight={bed.height} />
        </div>
      )}
    </div>
  );
});
