import { memo, useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useDroppable } from "@dnd-kit/core";
import { Check, TriangleAlert, NotebookText, Footprints } from "lucide-react";
import type { Bed } from "@/types/garden";
import type { Plant } from "@/types/plant";
import type { CellConflict, CellSide } from "@/lib/placementValidation";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { cn } from "@/lib/cn";

export type GridMode = "inspect" | "place" | "path";

const EDGE: Record<CellSide, string> = {
  top: "inset 0 3px 0 0 var(--color-warning)",
  right: "inset -3px 0 0 0 var(--color-warning)",
  bottom: "inset 0 -3px 0 0 var(--color-warning)",
  left: "inset 3px 0 0 0 var(--color-warning)",
};

function conflictShadow(conflict?: CellConflict): string | undefined {
  if (!conflict || conflict.sides.length === 0) return undefined;
  return conflict.sides.map((s) => EDGE[s]).join(", ");
}

/** Stone-slab pattern for path cells. */
function PathMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="text-gray-500 dark:text-gray-400">
      <rect x="3" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.45" />
      <rect x="12" y="3" width="9" height="5" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="2" y="10" width="9" height="4" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="13" y="10" width="8" height="4" rx="1" fill="currentColor" opacity="0.45" />
      <rect x="4" y="16" width="7" height="5" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="13" y="16" width="8" height="5" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

// --- Editable cell ----------------------------------------------------------

interface CellProps {
  bedId: string;
  x: number;
  y: number;
  plant?: Plant;
  label: string;
  title: string;
  hasNotes: boolean;
  isPath: boolean;
  mode: GridMode;
  hint?: "good" | "bad";
  conflict?: CellConflict;
  selected: boolean;
  cellSize: number;
  iconSize: number;
  onActivate: (x: number, y: number) => void;
}

const PlannerCell = memo(function PlannerCell({
  bedId, x, y, plant, label, title, hasNotes, isPath, mode, hint, conflict, selected, cellSize, iconSize, onActivate,
}: CellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${bedId}-${x}-${y}`, data: { bedId, x, y } });
  const empty = !plant && !isPath;

  const style: CSSProperties & Record<"--tint", string> = { width: cellSize, height: cellSize, "--tint": plant?.color ?? "transparent" };
  const shadow = conflictShadow(conflict);
  if (shadow) style.boxShadow = shadow;

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-planted={plant ? "true" : undefined}
      data-x={x}
      data-y={y}
      aria-label={label}
      aria-pressed={plant ? selected : undefined}
      title={title}
      onClick={() => onActivate(x, y)}
      className={cn(
        "relative flex items-center justify-center rounded-md transition-colors focus-visible:z-10",
        isPath && "bg-gray-200 dark:bg-white/10",
        empty && mode === "place" && hint === "bad" && "cursor-copy bg-warning/10 hover:bg-warning/20",
        empty && mode === "place" && hint === "good" && "cursor-copy bg-positive/15 hover:bg-positive/25",
        empty && mode === "place" && !hint && "cursor-copy bg-white/80 hover:bg-garden-100 dark:bg-white/[0.07] dark:hover:bg-garden-500/20",
        empty && mode === "path" && "cursor-pointer bg-white/60 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/10",
        empty && mode === "inspect" && "bg-white/60 dark:bg-white/[0.05]",
        plant && "bg-(--tint)/15 dark:bg-(--tint)/[0.12]",
        plant && mode !== "path" && "cursor-pointer hover:brightness-95 dark:hover:brightness-125",
        plant && mode === "path" && "cursor-pointer",
        selected && "ring-2 ring-garden-600 ring-offset-1 ring-offset-gray-100 dark:ring-garden-300 dark:ring-offset-gray-900",
        isOver && !isPath && "ring-2 ring-garden-500",
      )}
      style={style}
    >
      {isPath && <PathMark size={Math.round(iconSize * 0.95)} />}
      {plant && !isPath && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={iconSize} />}
      {empty && mode === "place" && hint === "good" && <Check size={14} aria-hidden="true" className="text-positive" />}
      {empty && mode === "place" && hint === "bad" && <TriangleAlert size={13} aria-hidden="true" className="text-warning" />}
      {plant && conflict && (
        <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-warning text-white shadow-xs dark:text-gray-950">
          <TriangleAlert size={10} strokeWidth={2.5} />
        </span>
      )}
      {plant && hasNotes && (
        <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-white text-gray-600 shadow-xs ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-white/10">
          <NotebookText size={10} />
        </span>
      )}
    </button>
  );
});

interface EditableGridProps {
  bed: Bed;
  plantMap: Map<string, Plant>;
  getPlantName: (id: string) => string;
  mode: GridMode;
  hints?: Map<string, "good" | "bad">;
  conflicts: Map<string, CellConflict>;
  selectedKey: string | null;
  zoom: number;
  onActivate: (x: number, y: number) => void;
}

/** The bed grid in the editor: every cell is a button and a drop target. */
export const EditableBedGrid = memo(function EditableBedGrid({ bed, plantMap, getPlantName, mode, hints, conflicts, selectedKey, zoom, onActivate }: EditableGridProps) {
  const { t } = useTranslation();
  const cellSize = Math.round(48 * zoom);
  const iconSize = Math.round(24 * zoom);

  const byKey = useMemo(() => new Map(bed.cells.map((c) => [`${c.cellX}-${c.cellY}`, c])), [bed.cells]);
  const paths = useMemo(() => new Set(bed.paths ?? []), [bed.paths]);

  const cells = [];
  for (let y = 0; y < bed.height; y++) {
    for (let x = 0; x < bed.width; x++) {
      const key = `${x}-${y}`;
      const isPath = paths.has(key);
      const cell = isPath ? undefined : byKey.get(key);
      const plant = cell ? plantMap.get(cell.plantId) : undefined;
      const conflict = conflicts.get(key);
      const pos = t("planner.cellPosition", { row: y + 1, col: x + 1 });
      const name = plant ? getPlantName(plant.id) : "";
      const label = isPath
        ? `${t("planner.path")}, ${pos}`
        : plant
          ? [name, cell?.variety, pos, conflict ? t("planner.conflictWith", { plants: conflict.partners.map(getPlantName).join(", ") }) : ""].filter(Boolean).join(", ")
          : t("planner.emptyCell", { position: pos });
      const title = isPath
        ? t("planner.path")
        : plant
          ? [name + (cell?.variety ? ` (${cell.variety})` : ""), conflict ? t("planner.conflictWith", { plants: conflict.partners.map(getPlantName).join(", ") }) : "", cell?.notes ?? ""].filter(Boolean).join("\n")
          : pos;
      cells.push(
        <PlannerCell
          key={key}
          bedId={bed.id}
          x={x}
          y={y}
          plant={plant}
          label={label}
          title={title}
          hasNotes={!!cell?.notes}
          isPath={isPath}
          mode={mode}
          hint={hints?.get(key)}
          conflict={conflict}
          selected={selectedKey === key}
          cellSize={cellSize}
          iconSize={iconSize}
          onActivate={onActivate}
        />,
      );
    }
  }

  return (
    <div data-bed-grid className="scroll-mt-32 overflow-x-auto overscroll-x-contain pb-1" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
      <div
        role="group"
        aria-label={t("planner.gridLabel", { name: bed.name, cols: bed.width, rows: bed.height })}
        className="inline-grid gap-1 rounded-xl bg-gray-100 p-1.5 dark:bg-white/[0.04]"
        style={{ gridTemplateColumns: `repeat(${bed.width}, ${cellSize}px)` }}
      >
        {cells}
      </div>
    </div>
  );
});

// --- Mini grid (overview) ---------------------------------------------------

interface MiniGridProps {
  bed: Bed;
  plantMap: Map<string, Plant>;
  conflicts: Map<string, CellConflict>;
  /** Available width in px; the cell size adapts (14–26 px). */
  maxWidth?: number;
}

/** Read-only miniature of a bed for the overview: plant icons only. */
export const MiniBedGrid = memo(function MiniBedGrid({ bed, plantMap, conflicts, maxWidth = 300 }: MiniGridProps) {
  const cell = Math.max(14, Math.min(26, Math.floor((maxWidth - 8) / bed.width) - 2));
  const icon = Math.round(cell * 0.72);
  const byKey = useMemo(() => new Map(bed.cells.map((c) => [`${c.cellX}-${c.cellY}`, c.plantId])), [bed.cells]);
  const paths = useMemo(() => new Set(bed.paths ?? []), [bed.paths]);

  const cells = [];
  for (let y = 0; y < bed.height; y++) {
    for (let x = 0; x < bed.width; x++) {
      const key = `${x}-${y}`;
      const plantId = byKey.get(key);
      const plant = plantId ? plantMap.get(plantId) : undefined;
      const isPath = paths.has(key);
      const shadow = conflictShadow(conflicts.get(key))?.replaceAll("3px", "2px");
      cells.push(
        <span
          key={key}
          className={cn(
            "flex items-center justify-center rounded-[3px]",
            isPath ? "bg-gray-300/70 dark:bg-white/15" : plant ? "bg-(--tint)/15 dark:bg-(--tint)/[0.12]" : "bg-white/70 dark:bg-white/[0.06]",
          )}
          style={{ width: cell, height: cell, ...(plant ? { "--tint": plant.color } : {}), ...(shadow ? { boxShadow: shadow } : {}) } as CSSProperties}
        >
          {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={icon} />}
          {isPath && cell >= 20 && <Footprints size={10} aria-hidden="true" className="text-gray-500" />}
        </span>,
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      className="inline-grid gap-0.5 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]"
      style={{ gridTemplateColumns: `repeat(${bed.width}, ${cell}px)` }}
    >
      {cells}
    </div>
  );
});
