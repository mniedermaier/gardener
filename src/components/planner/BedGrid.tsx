import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="text-gray-500 dark:text-earth-300">
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
        // Dark: an earthy path, not a grey block that reads as "disabled".
        isPath && "bg-gray-200 dark:bg-earth-700/40",
        empty && mode === "place" && hint === "bad" && "cursor-copy bg-warning/10 hover:bg-warning/20",
        empty && mode === "place" && hint === "good" && "cursor-copy bg-positive/15 hover:bg-positive/25",
        // Dark: empty cells sit below the planted ones (dashed, darker), never look raised.
        empty && "dark:border dark:border-dashed dark:border-white/10",
        empty && mode === "place" && !hint && "cursor-copy bg-white/80 hover:bg-garden-100 dark:bg-white/[0.03] dark:hover:bg-garden-500/20",
        empty && mode === "path" && "cursor-pointer bg-white/60 hover:bg-gray-200 dark:bg-white/[0.03] dark:hover:bg-white/10",
        empty && mode === "inspect" && "bg-white/60 dark:bg-white/[0.03]",
        // Dark: one neutral cell surface, the family colour as a bottom bar (side-by-side tints turned muddy).
        plant && "bg-(--tint)/15 dark:bg-white/[0.07] dark:shadow-[inset_0_-3px_0_0_var(--tint)]",
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

const GAP = 4;
const PAD = 6;
const MIN_CELL = 32;
const MAX_CELL = 72;

/**
 * Cell size at zoom 1: the bed fills the width it gets, and stays short
 * enough to be seen whole below the header and mode bar. Zoom multiplies it.
 */
function fitCell(width: number, maxHeight: number, cols: number, rows: number): number {
  const byWidth = (width - 2 * PAD - (cols - 1) * GAP) / cols;
  const byHeight = (maxHeight - 2 * PAD - (rows - 1) * GAP) / rows;
  return Math.floor(Math.max(MIN_CELL, Math.min(MAX_CELL, byWidth, byHeight)));
}

/** Usable bed height in the editor (read once, see EditableBedGrid). */
function editorMaxHeight(): number {
  return typeof window === "undefined" ? 600 : Math.max(260, window.innerHeight - (window.innerWidth >= 768 ? 300 : 320));
}

/**
 * Width of the grid when its height is the limit (tall beds on wide screens),
 * so a side-by-side layout can give the grid exactly that column instead of
 * centring it in empty space.
 */
export function heightBoundBedWidth(cols: number, rows: number): number {
  const cell = fitCell(Number.POSITIVE_INFINITY, editorMaxHeight(), cols, rows);
  return cols * cell + (cols - 1) * GAP + 2 * PAD;
}

/** The bed grid in the editor: every cell is a button and a drop target. */
export const EditableBedGrid = memo(function EditableBedGrid({ bed, plantMap, getPlantName, mode, hints, conflicts, selectedKey, zoom, onActivate }: EditableGridProps) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Read once: a later viewport height change (address bar, keyboard) must not resize the bed under the finger.
  const [maxHeight] = useState(editorMaxHeight);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const base = width > 0 ? fitCell(width, maxHeight, bed.width, bed.height) : 48;
  const cellSize = Math.round(base * zoom);
  const iconSize = Math.round(cellSize / 2);

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
    // flex + mx-auto: centred while it fits, scrolls from the left edge once zoomed wider.
    <div ref={wrapRef} data-bed-grid className="flex scroll-mt-32 overflow-x-auto overscroll-x-contain pb-1" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
      <div
        role="group"
        aria-label={t("planner.gridLabel", { name: bed.name, cols: bed.width, rows: bed.height })}
        className="mx-auto inline-grid shrink-0 gap-1 rounded-xl bg-gray-100 p-1.5 dark:bg-white/[0.04]"
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
      const conflict = !!plant && !!conflicts.get(key)?.partners.length;
      cells.push(
        <span
          key={key}
          className={cn(
            "relative flex items-center justify-center rounded-[3px]",
            isPath ? "bg-gray-300/70 dark:bg-earth-700/40" : plant ? "bg-(--tint)/15 dark:bg-white/[0.08] dark:shadow-[inset_0_-2px_0_0_var(--tint)]" : "bg-white/70 dark:bg-white/[0.03]",
          )}
          style={{ width: cell, height: cell, ...(plant ? { "--tint": plant.color } : {}) } as CSSProperties}
        >
          {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={icon} />}
          {/* The same ⚠ as in the editor and on the card's "ungünstige Nachbarn" badge — no unexplained edge marks. */}
          {conflict && (
            <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-warning text-white ring-1 ring-white dark:text-gray-950 dark:ring-gray-900">
              <TriangleAlert size={8} strokeWidth={3} />
            </span>
          )}
          {isPath && cell >= 20 && <Footprints size={10} aria-hidden="true" className="text-gray-500 dark:text-earth-300" />}
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
