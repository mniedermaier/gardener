import { useState, useRef, useMemo, useCallback, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Download, Upload, Settings, Archive, Share2, Wand2, AlertTriangle, Undo2, Footprints, Copy } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Bed, Garden, EnvironmentType, GreenhouseConfig, ContainerConfig, RaisedBedConfig, ColdFrameConfig } from "@/types/garden";
import { ENVIRONMENT_ICONS, getFrostProtectionWeeks } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { CropRotation } from "./CropRotation";
import { GuildPicker } from "./GuildPicker";
import { PlantPalette } from "./PlantPalette";
import { PlantInfoPanel } from "./PlantInfoPanel";
import { BedStats } from "./BedStats";
import { generateShareUrl } from "@/lib/sharing";
import { useToast } from "@/components/ui/Toast";
import { useUndo } from "@/hooks/useUndo";
import { validatePlacement, getCompanionHighlights, getAntagonistHighlights } from "@/lib/placementValidation";
import { recommendBedPlanting, getRecommendedPlants, STRATEGY_DETAILS, type PlantingStrategy } from "@/lib/bedRecommendation";

const ALL_ENVIRONMENTS: EnvironmentType[] = [
  "outdoor_bed", "raised_bed", "greenhouse", "cold_frame",
  "polytunnel", "container", "windowsill", "vertical",
];

const ENVIRONMENT_COLORS: Record<EnvironmentType, string> = {
  outdoor_bed: "bg-earth-100 dark:bg-earth-700",
  raised_bed: "bg-amber-50 dark:bg-amber-900/30",
  greenhouse: "bg-green-50 dark:bg-green-900/20",
  cold_frame: "bg-sky-50 dark:bg-sky-900/20",
  polytunnel: "bg-emerald-50 dark:bg-emerald-900/20",
  container: "bg-orange-50 dark:bg-orange-900/20",
  windowsill: "bg-yellow-50 dark:bg-yellow-900/20",
  vertical: "bg-violet-50 dark:bg-violet-900/20",
};

const ENVIRONMENT_BORDERS: Record<EnvironmentType, string> = {
  outdoor_bed: "border-gray-200 dark:border-gray-700",
  raised_bed: "border-amber-300 dark:border-amber-700",
  greenhouse: "border-green-300 dark:border-green-700 border-2",
  cold_frame: "border-sky-300 dark:border-sky-700 border-dashed",
  polytunnel: "border-emerald-300 dark:border-emerald-700 border-2 border-dashed",
  container: "border-orange-300 dark:border-orange-700",
  windowsill: "border-yellow-300 dark:border-yellow-700",
  vertical: "border-violet-300 dark:border-violet-700",
};

// --- DroppableCell with validation feedback ---

const DroppableCell = memo(function DroppableCell({
  bedId, x, y, plant, variety, isCompanionHighlight, isAntagonistHighlight,
  isPlaceMode, isPath, isPathMode, cellSize, iconSize, onRemove, onClick, onSelectPlant, onTogglePath, validationWarning, notes,
}: {
  bedId: string; x: number; y: number; plant?: Plant; variety?: string;
  isCompanionHighlight: boolean; isAntagonistHighlight: boolean;
  isPlaceMode: boolean; isPath: boolean; isPathMode: boolean;
  cellSize: number; iconSize: number;
  onRemove: () => void; onClick: () => void;
  onSelectPlant: () => void; onTogglePath: () => void; validationWarning?: string; notes?: string;
}) {
  const { t } = useTranslation();
  const getPlantName = usePlantName();
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${bedId}-${x}-${y}`,
    data: { bedId, x, y },
  });

  const plantName = plant ? getPlantName(plant.id) : "";
  const tooltip = [
    plantName,
    variety ? `(${variety})` : "",
    notes ? `- ${notes}` : "",
    validationWarning ? `⚠ ${validationWarning}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={plantName || `Empty cell ${x + 1}, ${y + 1}`}
      onClick={isPathMode ? onTogglePath : plant ? onSelectPlant : onClick}
      title={isPath ? t("planner.path") : tooltip}
      className={`group relative flex items-center justify-center rounded transition-all ${
        isPath
          ? "bg-stone-400/50 dark:bg-stone-600/50"
          : plant
            ? "cursor-pointer shadow-sm hover:opacity-80"
            : isPlaceMode
              ? "cursor-crosshair bg-garden-100/50 hover:bg-garden-200 dark:bg-garden-900/20 dark:hover:bg-garden-900/40"
              : isPathMode
                ? "cursor-pointer bg-earth-200/40 hover:bg-stone-300 dark:bg-earth-600/30 dark:hover:bg-stone-600"
                : "bg-earth-200/60 dark:bg-earth-600/40"
      } ${isOver && !isPath ? "ring-2 ring-garden-400 ring-offset-1 bg-garden-100 dark:bg-garden-900/40" : ""}
      ${isAntagonistHighlight && !plant && !isPath ? "bg-red-100 ring-1 ring-red-300 dark:bg-red-900/20" : ""}
      ${isCompanionHighlight && !plant && !isPath ? "bg-green-100 ring-1 ring-green-300 dark:bg-green-900/20" : ""}
      ${plant && validationWarning ? "ring-2 ring-red-400" : ""}`}
      style={{ width: cellSize, height: cellSize, ...(plant && !isPath ? { backgroundColor: plant.color + "18" } : {}) }}
    >
      {isPath && (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="3" y="3" width="7" height="5" rx="1" fill="#a8a29e" opacity="0.6"/>
          <rect x="12" y="3" width="9" height="5" rx="1" fill="#78716c" opacity="0.5"/>
          <rect x="2" y="10" width="9" height="4" rx="1" fill="#78716c" opacity="0.5"/>
          <rect x="13" y="10" width="8" height="4" rx="1" fill="#a8a29e" opacity="0.6"/>
          <rect x="4" y="16" width="7" height="5" rx="1" fill="#a8a29e" opacity="0.55"/>
          <rect x="13" y="16" width="8" height="5" rx="1" fill="#78716c" opacity="0.45"/>
        </svg>
      )}
      {plant && !isPath && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={iconSize} />}
      {plant && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white group-hover:flex"
        >
          ×
        </button>
      )}
      {notes && plant && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-400" />
      )}
    </div>
  );
});

// --- BedGrid with stats and validation ---

function BedGrid({
  bed, gardenId, selectedPlantId, isPathMode, isExpanded, onToggleExpand, onCellClick, onSelectPlantFromCell,
}: {
  bed: Bed; gardenId: string; selectedPlantId: string | null; isPathMode: boolean;
  isExpanded: boolean; onToggleExpand: () => void;
  onCellClick: (bedId: string, x: number, y: number) => void;
  onSelectPlantFromCell: (plantId: string, bedId: string, cellX: number, cellY: number) => void;
}) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();
  const { removeCell, updateBed, togglePath, gridCellSizeCm } = useStore(useShallow((s) => ({ removeCell: s.removeCell, updateBed: s.updateBed, togglePath: s.togglePath, gridCellSizeCm: s.gridCellSizeCm })));
  const [showConfig, setShowConfig] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(bed.name);
  const [zoom, setZoom] = useState(1); // 0.6 = small, 1 = normal, 1.3 = large
  const envType = bed.environmentType ?? "outdoor_bed";
  const frostWeeks = getFrostProtectionWeeks(bed);
  const bedWidthM = ((bed.width * gridCellSizeCm) / 100).toFixed(1);
  const bedHeightM = ((bed.height * gridCellSizeCm) / 100).toFixed(1);

  // Pre-compute highlights for selected plant
  const companionCells = useMemo(
    () => selectedPlantId ? getCompanionHighlights(selectedPlantId, bed, plantMap) : new Set<string>(),
    [selectedPlantId, bed, plantMap]
  );
  const antagonistCells = useMemo(
    () => selectedPlantId ? getAntagonistHighlights(selectedPlantId, bed, plantMap) : new Set<string>(),
    [selectedPlantId, bed, plantMap]
  );

  // Validate each planted cell
  const cellWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    for (const cell of bed.cells) {
      const result = validatePlacement(cell.plantId, cell.cellX, cell.cellY, bed, plantMap, gridCellSizeCm);
      const errors = result.issues.filter((i) => i.severity === "error" || i.severity === "warning");
      if (errors.length > 0) {
        warnings.set(`${cell.cellX}-${cell.cellY}`, errors[0].messageKey);
      }
    }
    return warnings;
  }, [bed, plantMap, gridCellSizeCm]);

  const cellSize = Math.round(48 * zoom);
  const iconSize = Math.round(22 * zoom);
  const gridCellRem = `${(cellSize / 16).toFixed(2)}rem`;

  return (
    <Card className={`overflow-hidden ${ENVIRONMENT_BORDERS[envType]}`}>
      {/* Clickable header - accordion toggle */}
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-gray-400"><path d="M4 2l4 4-4 4"/></svg>
          </span>
          <span className="text-lg" title={t(`planner.environmentTypes.${envType}`)}>
            {ENVIRONMENT_ICONS[envType]}
          </span>
          {editingName ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { updateBed(gardenId, bed.id, { name: newName.trim() || bed.name }); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { updateBed(gardenId, bed.id, { name: newName.trim() || bed.name }); setEditingName(false); } }}
              onClick={(e) => e.stopPropagation()}
              className="w-32 rounded border border-garden-400 bg-transparent px-1 text-sm font-semibold focus:outline-none"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold" onDoubleClick={(e) => { e.stopPropagation(); setNewName(bed.name); setEditingName(true); }}>
              {bed.name}
            </h3>
          )}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {bedWidthM} × {bedHeightM} m
          </span>
          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 sm:inline dark:bg-gray-800 dark:text-gray-400">
            {t(`planner.environmentTypes.${envType}`)}
          </span>
          {frostWeeks > 0 && (
            <span className="rounded-full bg-garden-100 px-2 py-0.5 text-xs text-garden-700 dark:bg-garden-900/40 dark:text-garden-400">
              +{frostWeeks}w
            </span>
          )}
          {!isExpanded && bed.cells.length > 0 && (
            <span className="text-xs text-gray-400">
              · {bed.cells.length} {t("bedStats.plants")} · {new Set(bed.cells.map(c => c.plantId)).size} {t("bedStats.types")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isExpanded && (
            <>
              {/* Zoom controls */}
              <div className="mr-2 flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.15))} className="rounded-l-lg px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700" title="Zoom out">−</button>
                <span className="px-1 text-[10px] text-gray-400">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(1.5, zoom + 0.15))} className="rounded-r-lg px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700" title="Zoom in">+</button>
              </div>
              {bed.cells.length > 0 && (
                <button
                  onClick={() => { for (const cell of [...bed.cells]) removeCell(gardenId, bed.id, cell.cellX, cell.cellY); }}
                  className="rounded-lg p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title={t("planner.clearBed")}
                >
                  {t("planner.clearBed")}
                </button>
              )}
              {(envType === "greenhouse" || envType === "cold_frame" || envType === "raised_bed" || envType === "container") && (
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <Settings size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!isExpanded && <BedStats bed={bed} plantMap={plantMap} gridCellSizeCm={gridCellSizeCm} />}

      {isExpanded && <>
      {showConfig && envType === "greenhouse" && (
        <GreenhouseConfigPanel
          config={bed.greenhouseConfig ?? { material: "glass", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 }}
          onChange={(config) => updateBed(gardenId, bed.id, { greenhouseConfig: config })}
        />
      )}
      {showConfig && envType === "cold_frame" && (
        <ColdFrameConfigPanel
          config={bed.coldFrameConfig ?? { frostProtectionWeeks: 3 }}
          onChange={(config) => updateBed(gardenId, bed.id, { coldFrameConfig: config })}
        />
      )}
      {showConfig && envType === "raised_bed" && (
        <RaisedBedConfigPanel
          config={bed.raisedBedConfig ?? { heightCm: 80 }}
          onChange={(config) => updateBed(gardenId, bed.id, { raisedBedConfig: config })}
        />
      )}
      {showConfig && envType === "container" && (
        <ContainerConfigPanel
          config={bed.containerConfig ?? { volumeLiters: 30, material: "terracotta" }}
          onChange={(config) => updateBed(gardenId, bed.id, { containerConfig: config })}
        />
      )}

      <div className="overflow-x-auto pb-2" style={{ touchAction: "pan-y pinch-zoom" }}>
      <div
        className={`inline-grid gap-0.5 rounded-lg border p-1 ${ENVIRONMENT_COLORS[envType]} ${ENVIRONMENT_BORDERS[envType]}`}
        style={{ gridTemplateColumns: `repeat(${bed.width}, ${gridCellRem})` }}
      >
        {Array.from({ length: bed.height }, (_, y) =>
          Array.from({ length: bed.width }, (_, x) => {
            const cellKey = `${x}-${y}`;
            const isPath = (bed.paths ?? []).includes(cellKey);
            const cell = bed.cells.find((c) => c.cellX === x && c.cellY === y);
            const plant = cell ? plantMap.get(cell.plantId) : undefined;

            return (
              <DroppableCell
                key={cellKey}
                bedId={bed.id}
                x={x}
                y={y}
                plant={isPath ? undefined : plant}
                variety={cell?.variety}
                notes={cell?.notes}
                isCompanionHighlight={!isPath && companionCells.has(cellKey)}
                isAntagonistHighlight={!isPath && antagonistCells.has(cellKey)}
                isPlaceMode={!!selectedPlantId && !isPathMode}
                isPath={isPath}
                isPathMode={isPathMode}
                cellSize={cellSize}
                iconSize={iconSize}
                validationWarning={isPath ? undefined : cellWarnings.get(cellKey)}
                onRemove={() => removeCell(gardenId, bed.id, x, y)}
                onSelectPlant={() => { if (plant) onSelectPlantFromCell(plant.id, bed.id, x, y); }}
                onTogglePath={() => togglePath(gardenId, bed.id, x, y)}
                onClick={() => onCellClick(bed.id, x, y)}
              />
            );
          })
        )}
      </div>
      </div>

      {bed.cells.length === 0 && (
        <GuildPicker gardenId={gardenId} bedId={bed.id} bedWidth={bed.width} bedHeight={bed.height} />
      )}

      <BedStats bed={bed} plantMap={plantMap} gridCellSizeCm={gridCellSizeCm} />
      </>}
    </Card>
  );
}

// --- Environment config panels (compact) ---

function GreenhouseConfigPanel({ config, onChange }: { config: GreenhouseConfig; onChange: (c: GreenhouseConfig) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
      <h4 className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">{t("planner.greenhouse.title")}</h4>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.material")}</label>
          <select value={config.material} onChange={(e) => onChange({ ...config, material: e.target.value as GreenhouseConfig["material"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            <option value="glass">{t("planner.greenhouse.materials.glass")}</option>
            <option value="polycarbonate">{t("planner.greenhouse.materials.polycarbonate")}</option>
            <option value="plastic">{t("planner.greenhouse.materials.plastic")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.ventilation")}</label>
          <select value={config.ventilation} onChange={(e) => onChange({ ...config, ventilation: e.target.value as "manual" | "automatic" })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            <option value="manual">{t("planner.greenhouse.ventilationTypes.manual")}</option>
            <option value="automatic">{t("planner.greenhouse.ventilationTypes.automatic")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.frostProtection")}</label>
          <input type="number" min={0} max={20} value={config.frostProtectionWeeks} onChange={(e) => onChange({ ...config, frostProtectionWeeks: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={config.heated} onChange={(e) => onChange({ ...config, heated: e.target.checked })} className="rounded border-gray-300" />
          <label className="text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heated")}</label>
        </div>
        {config.heated && (
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heatingType")}</label>
            <select value={config.heatingType ?? "electric"} onChange={(e) => onChange({ ...config, heatingType: e.target.value as GreenhouseConfig["heatingType"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
              <option value="electric">{t("planner.greenhouse.heatingTypes.electric")}</option>
              <option value="gas">{t("planner.greenhouse.heatingTypes.gas")}</option>
              <option value="passive_solar">{t("planner.greenhouse.heatingTypes.passive_solar")}</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.minTemp")}</label>
          <input type="number" value={config.minTempC} onChange={(e) => onChange({ ...config, minTempC: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.maxTemp")}</label>
          <input type="number" value={config.maxTempC} onChange={(e) => onChange({ ...config, maxTempC: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

function ColdFrameConfigPanel({ config, onChange }: { config: ColdFrameConfig; onChange: (c: ColdFrameConfig) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-sky-50 p-3 dark:bg-sky-900/20">
      <div className="flex items-center gap-4">
        <label className="text-xs text-gray-600 dark:text-gray-400">{t("planner.coldFrame.frostProtection")}</label>
        <input type="number" min={0} max={10} value={config.frostProtectionWeeks} onChange={(e) => onChange({ frostProtectionWeeks: Number(e.target.value) })} className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function RaisedBedConfigPanel({ config, onChange }: { config: RaisedBedConfig; onChange: (c: RaisedBedConfig) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
      <div className="flex items-center gap-4">
        <label className="text-xs text-gray-600 dark:text-gray-400">{t("planner.raisedBed.height")}</label>
        <input type="number" min={20} max={150} value={config.heightCm} onChange={(e) => onChange({ ...config, heightCm: Number(e.target.value) })} className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function ContainerConfigPanel({ config, onChange }: { config: ContainerConfig; onChange: (c: ContainerConfig) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.container.volume")}</label>
          <input type="number" min={1} max={500} value={config.volumeLiters} onChange={(e) => onChange({ ...config, volumeLiters: Number(e.target.value) })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.container.material")}</label>
          <select value={config.material} onChange={(e) => onChange({ ...config, material: e.target.value as ContainerConfig["material"] })} className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800">
            {(["terracotta", "plastic", "fabric", "wood", "metal"] as const).map((m) => (
              <option key={m} value={m}>{t(`planner.container.materials.${m}`)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// --- Main GardenPlanner ---

export function GardenPlanner() {
  const { t } = useTranslation();
  const {
    gardens, activeGardenId, addGarden, setActiveGarden, addBed, deleteBed,
    deleteGarden, setCell, updateCell, archiveSeason, seasonArchives, gridCellSizeCm, lastFrostDate,
    duplicateGarden, duplicateBed,
  } = useStore(useShallow((s) => ({ gardens: s.gardens, activeGardenId: s.activeGardenId, addGarden: s.addGarden, setActiveGarden: s.setActiveGarden, addBed: s.addBed, deleteBed: s.deleteBed, deleteGarden: s.deleteGarden, setCell: s.setCell, updateCell: s.updateCell, archiveSeason: s.archiveSeason, seasonArchives: s.seasonArchives, gridCellSizeCm: s.gridCellSizeCm, lastFrostDate: s.lastFrostDate, duplicateGarden: s.duplicateGarden, duplicateBed: s.duplicateBed })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const { toast, confirm } = useToast();
  const { pushUndo, undo, canUndo } = useUndo();

  const [showNewGarden, setShowNewGarden] = useState(false);
  const [showNewBed, setShowNewBed] = useState(false);
  const [gardenName, setGardenName] = useState("");
  const [bedName, setBedName] = useState("");
  const [bedWidthM, setBedWidthM] = useState(1.8);
  const [bedHeightM, setBedHeightM] = useState(1.2);
  const [bedEnvType, setBedEnvType] = useState<EnvironmentType>("outdoor_bed");
  const [ghConfig, setGhConfig] = useState<GreenhouseConfig>({ material: "glass", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 });
  const [cfConfig, setCfConfig] = useState<ColdFrameConfig>({ frostProtectionWeeks: 3 });
  const [rbConfig, setRbConfig] = useState<RaisedBedConfig>({ heightCm: 80 });
  const [ctConfig, setCtConfig] = useState<ContainerConfig>({ volumeLiters: 30, material: "terracotta" });

  // Plant selection & placement state
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);
  const [placementFeedback, setPlacementFeedback] = useState<string | null>(null);
  const [autoFillBedId, setAutoFillBedId] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState(false);
  const [expandedBedId, setExpandedBedId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ gardenId: string; bedId: string; cellX: number; cellY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGarden = gardens.find((g) => g.id === activeGardenId);

  // Get recommended plants for the active garden
  const recommendedIds = useMemo(() => {
    if (!activeGarden || activeGarden.beds.length === 0) return new Set<string>();
    const recommended = new Set<string>();
    for (const bed of activeGarden.beds) {
      const recs = getRecommendedPlants(bed, plants, { gridCellSizeCm, lastFrostDate });
      for (const r of recs) recommended.add(r.plant.id);
    }
    return recommended;
  }, [activeGarden, plants, gridCellSizeCm, lastFrostDate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPlant(null);
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Clear feedback after 3s
  useEffect(() => {
    if (placementFeedback) {
      const timer = setTimeout(() => setPlacementFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [placementFeedback]);

  const getPlantName = usePlantName();

  // Resolve plant IDs to names in validation params
  const resolveParams = useCallback((params?: Record<string, string | number>) => {
    if (!params) return params;
    const resolved = { ...params };
    if (typeof resolved.plant === "string") resolved.plant = getPlantName(resolved.plant);
    if (typeof resolved.neighbor === "string") resolved.neighbor = getPlantName(resolved.neighbor);
    return resolved;
  }, [getPlantName]);

  const handleSelectPlant = useCallback((plant: Plant) => {
    setSelectedPlant((prev) => prev?.id === plant.id ? null : plant);
  }, []);

  // Click-to-place on cell
  const handleCellClick = useCallback((bedId: string, cellX: number, cellY: number) => {
    if (!selectedPlant || !activeGardenId) return;
    const bed = activeGarden?.beds.find((b) => b.id === bedId);
    if (!bed) return;

    const result = validatePlacement(selectedPlant.id, cellX, cellY, bed, plantMap, gridCellSizeCm);
    const errors = result.issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      setPlacementFeedback(t(errors[0].messageKey, resolveParams(errors[0].messageParams)));
      return;
    }

    const gid = activeGardenId;
    const pid = selectedPlant.id;
    setCell(gid, bedId, { cellX, cellY, plantId: pid });
    pushUndo({ label: `Place ${pid}`, undo: () => useStore.getState().removeCell(gid, bedId, cellX, cellY) });
    if (result.issues.length > 0) {
      setPlacementFeedback(t(result.issues[0].messageKey, resolveParams(result.issues[0].messageParams)));
    }
  }, [selectedPlant, activeGardenId, activeGarden, plantMap, gridCellSizeCm, setCell, t, pushUndo, resolveParams]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const plantId = event.active.data.current?.plantId as string | undefined;
    if (plantId) {
      const plant = plantMap.get(plantId) ?? null;
      setActiveDragPlant(plant);
      setSelectedPlant(plant);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPlant(null);
    const { active, over } = event;
    if (!over || !activeGardenId) return;

    const plantId = active.data.current?.plantId as string | undefined;
    const bedId = over.data.current?.bedId as string | undefined;
    const x = over.data.current?.x as number | undefined;
    const y = over.data.current?.y as number | undefined;

    if (plantId && bedId && x !== undefined && y !== undefined) {
      const bed = activeGarden?.beds.find((b) => b.id === bedId);
      if (bed) {
        const result = validatePlacement(plantId, x, y, bed, plantMap, gridCellSizeCm);
        if (result.issues.some((i) => i.severity === "error")) {
          setPlacementFeedback(t(result.issues[0].messageKey, resolveParams(result.issues[0].messageParams)));
          return;
        }
        if (result.issues.length > 0) {
          setPlacementFeedback(t(result.issues[0].messageKey, resolveParams(result.issues[0].messageParams)));
        }
      }
      setCell(activeGardenId, bedId, { cellX: x, cellY: y, plantId });
    }
  };

  // Auto-fill a bed with strategy
  const handleAutoFill = (bedId: string, strategy: PlantingStrategy) => {
    if (!activeGardenId) return;
    const bed = activeGarden?.beds.find((b) => b.id === bedId);
    if (!bed) return;

    const cells = recommendBedPlanting(bed, plants, { gridCellSizeCm, lastFrostDate, strategy });
    for (const cell of cells) {
      setCell(activeGardenId, bedId, cell);
    }
    setAutoFillBedId(null);
    toast(t("planner.autoFillDone", { count: cells.length }), "success");
  };

  const handleExport = () => {
    const data = JSON.stringify(gardens, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gardener-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as Garden[];
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        const store = useStore.getState();
        for (const g of imported) {
          if (g.id && g.name && Array.isArray(g.beds)) {
            const id = store.addGarden(g.name);
            for (const bed of g.beds) {
              store.addBed(id, {
                name: bed.name, x: bed.x, y: bed.y, width: bed.width, height: bed.height,
                environmentType: bed.environmentType ?? "outdoor_bed",
                greenhouseConfig: bed.greenhouseConfig, containerConfig: bed.containerConfig,
                raisedBedConfig: bed.raisedBedConfig, coldFrameConfig: bed.coldFrameConfig,
              });
              const updatedGarden = useStore.getState().gardens.find((sg) => sg.id === id);
              const newBed = updatedGarden?.beds[updatedGarden.beds.length - 1];
              if (newBed) {
                for (const cell of bed.cells) {
                  store.setCell(id, newBed.id, { cellX: cell.cellX, cellY: cell.cellY, plantId: cell.plantId });
                }
              }
            }
          }
        }
      } catch { toast(t("planner.importError"), "error"); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateGarden = () => {
    if (!gardenName.trim()) return;
    addGarden(gardenName.trim());
    setGardenName("");
    setShowNewGarden(false);
  };

  const handleCreateBed = () => {
    if (!bedName.trim() || !activeGardenId) return;
    const cellSizeM = gridCellSizeCm / 100;
    const width = Math.max(1, Math.round(bedWidthM / cellSizeM));
    const height = Math.max(1, Math.round(bedHeightM / cellSizeM));
    const bedCount = activeGarden?.beds.length ?? 0;
    addBed(activeGardenId, {
      name: bedName.trim(), x: 0, y: bedCount, width, height,
      environmentType: bedEnvType,
      ...(bedEnvType === "greenhouse" ? { greenhouseConfig: { ...ghConfig } } : {}),
      ...(bedEnvType === "cold_frame" ? { coldFrameConfig: { ...cfConfig } } : {}),
      ...(bedEnvType === "raised_bed" ? { raisedBedConfig: { ...rbConfig } } : {}),
      ...(bedEnvType === "container" ? { containerConfig: { ...ctConfig } } : {}),
    });
    setBedName("");
    setBedEnvType("outdoor_bed");
    setShowNewBed(false);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("planner.title")}</h1>
          <div className="flex gap-2">
            {canUndo && (
              <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)">
                <Undo2 size={16} />
              </Button>
            )}
            {activeGarden && (
              <Button variant="ghost" size="sm" onClick={() => { const url = generateShareUrl(activeGarden); navigator.clipboard.writeText(url); toast(t("planner.shareCopied")); }} title={t("planner.share")}>
                <Share2 size={16} />
              </Button>
            )}
            {gardens.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExport} title="Export"><Download size={16} /></Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="Import"><Upload size={16} /></Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button onClick={() => setShowNewGarden(true)} size="sm"><Plus size={16} />{t("planner.newGarden")}</Button>
          </div>
        </div>

        {/* Garden tabs */}
        {gardens.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {gardens.map((g) => (
              <button key={g.id} onClick={() => setActiveGarden(g.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeGardenId === g.id ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                {g.name}
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-normal text-gray-500 dark:bg-gray-700 dark:text-gray-400">{g.season}</span>
                <span role="button" onClick={(e) => { e.stopPropagation(); duplicateGarden(g.id); }} className="rounded p-0.5 text-gray-400 hover:text-gray-600" title={t("common.duplicate")}><Copy size={11} /></span>
                <span role="button" onClick={async (e) => { e.stopPropagation(); if (await confirm(t("planner.confirmDeleteGarden"))) deleteGarden(g.id); }} className="rounded p-0.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></span>
              </button>
            ))}
            {activeGarden && activeGarden.beds.some((b) => b.cells.length > 0) && (
              <Button variant="ghost" size="sm" onClick={async () => { if (await confirm(t("season.archiveConfirm"))) archiveSeason(activeGardenId!); }} title={t("season.archive")}>
                <Archive size={14} /><span className="text-xs">{t("season.archive")}</span>
              </Button>
            )}
          </div>
        )}

        {activeGarden ? (
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            {/* Main area: beds */}
            <div className="min-w-0">
              {/* Placement feedback */}
              {placementFeedback && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  {placementFeedback}
                </div>
              )}

              {selectedPlant && !pathMode && (
                <div className="mb-3 rounded-lg bg-garden-50 px-3 py-1.5 text-xs text-garden-700 dark:bg-garden-900/20 dark:text-garden-400">
                  {t("planner.placeMode", { plant: selectedPlant.icon + " " + (selectedPlant.displayName ?? t(`plants.catalog.${selectedPlant.id}.name`)) })}
                  <button onClick={() => setSelectedPlant(null)} className="ml-2 font-medium underline">ESC</button>
                </div>
              )}

              {pathMode && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <Footprints size={14} />
                  <span>{t("planner.pathModeHint")}</span>
                  <button onClick={() => setPathMode(false)} className="ml-auto rounded bg-stone-200 px-2 py-0.5 font-medium hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600">
                    {t("planner.pathModeDone")}
                  </button>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowNewBed(true)}>
                  <Plus size={16} />{t("planner.newBed")}
                </Button>
                <Button
                  variant={pathMode ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => { setPathMode(!pathMode); if (!pathMode) setSelectedPlant(null); }}
                >
                  <Footprints size={16} />{pathMode ? t("planner.pathModeDone") : t("planner.pathMode")}
                </Button>
              </div>

              <div className="space-y-6">
                {activeGarden.beds.map((bed) => (
                  <div key={bed.id} className="relative">
                    <div className="absolute -right-2 -top-2 z-10 flex gap-1">
                      <div className="relative">
                        <button
                          onClick={() => setAutoFillBedId(autoFillBedId === bed.id ? null : bed.id)}
                          className="rounded-full bg-garden-100 p-1 text-garden-600 hover:bg-garden-200 dark:bg-garden-900/40 dark:text-garden-400"
                          title={t("planner.autoFill")}
                        >
                          <Wand2 size={14} />
                        </button>
                        {autoFillBedId === bed.id && (
                          <div className="absolute right-0 top-8 z-20 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("planner.autoFill")}</p>
                            {(Object.keys(STRATEGY_DETAILS) as PlantingStrategy[]).map((key) => {
                              const s = STRATEGY_DETAILS[key];
                              return (
                                <button
                                  key={key}
                                  onClick={() => handleAutoFill(bed.id, key)}
                                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <span className="mt-0.5 text-sm">{s.icon}</span>
                                  <div>
                                    <p className="font-medium">{t(s.nameKey)}</p>
                                    <p className="text-[10px] text-gray-400">{t(s.descKey)}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => duplicateBed(activeGardenId!, bed.id)}
                        className="rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                        title={t("common.duplicate")}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteBed(activeGardenId!, bed.id); }}
                        className="rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400"
                        title={t("planner.deleteBed")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <BedGrid
                      bed={bed}
                      gardenId={activeGardenId!}
                      selectedPlantId={selectedPlant?.id ?? null}
                      isPathMode={pathMode}
                      isExpanded={expandedBedId === null ? (activeGarden?.beds.length ?? 0) <= 2 : expandedBedId === bed.id}
                      onToggleExpand={() => setExpandedBedId(expandedBedId === bed.id ? null : bed.id)}
                      onCellClick={handleCellClick}
                      onSelectPlantFromCell={(id, bedId, cellX, cellY) => {
                        const p = plantMap.get(id);
                        if (p) setSelectedPlant(p);
                        setEditingCell({ gardenId: activeGardenId!, bedId, cellX, cellY });
                      }}
                    />
                  </div>
                ))}
              </div>
              {activeGarden.beds.length === 0 && (
                <p className="mt-4 text-center text-gray-500">{t("planner.noGarden")}</p>
              )}
              <CropRotation />
              {seasonArchives.filter((a) => a.gardenId === activeGardenId).length > 0 && (
                <Card className="mt-6">
                  <h2 className="mb-3 text-lg font-semibold">{t("season.archives")}</h2>
                  <div className="space-y-2">
                    {seasonArchives.filter((a) => a.gardenId === activeGardenId).sort((a, b) => b.season.localeCompare(a.season)).map((a) => {
                      const totalPlants = a.beds.reduce((s, b) => s + b.cells.length, 0);
                      return (
                        <div key={`${a.gardenId}-${a.season}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                          <div>
                            <span className="font-medium">{t("season.current", { year: a.season })}</span>
                            <span className="ml-2 text-xs text-gray-400">{t("season.beds", { count: a.beds.length })} / {t("season.plants", { count: totalPlants })}</span>
                          </div>
                          <span className="text-xs text-gray-400">{a.archivedAt.slice(0, 10)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* Plant palette + info (top on mobile, right sidebar on desktop) */}
            <div className="order-first space-y-4 md:order-last">
              <Card>
                <PlantPalette
                  selectedPlantId={selectedPlant?.id ?? null}
                  onSelectPlant={handleSelectPlant}
                  recommendedIds={recommendedIds}
                />
              </Card>

              {selectedPlant && (
                <PlantInfoPanel plant={selectedPlant} onClose={() => { setSelectedPlant(null); setEditingCell(null); }} />
              )}

              {/* Cell editing panel */}
              {editingCell && (() => {
                const bed = activeGarden?.beds.find((b) => b.id === editingCell.bedId);
                const cell = bed?.cells.find((c) => c.cellX === editingCell.cellX && c.cellY === editingCell.cellY);
                if (!cell) return null;
                return (
                  <Card>
                    <h3 className="mb-3 text-sm font-semibold">{t("planner.editCell")}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">{t("planner.variety")}</label>
                        <input
                          type="text"
                          value={cell.variety ?? ""}
                          onChange={(e) => updateCell(editingCell.gardenId, editingCell.bedId, editingCell.cellX, editingCell.cellY, { variety: e.target.value || undefined })}
                          placeholder={t("planner.varietyPlaceholder")}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">{t("planner.plantedDate")}</label>
                        <input
                          type="date"
                          value={cell.plantedDate ?? ""}
                          onChange={(e) => updateCell(editingCell.gardenId, editingCell.bedId, editingCell.cellX, editingCell.cellY, { plantedDate: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">{t("harvest.notes")}</label>
                        <textarea
                          value={cell.notes ?? ""}
                          onChange={(e) => updateCell(editingCell.gardenId, editingCell.bedId, editingCell.cellX, editingCell.cellY, { notes: e.target.value || undefined })}
                          rows={2}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                      </div>
                      <button onClick={() => setEditingCell(null)} className="text-xs text-gray-400 hover:text-gray-600">{t("common.close")}</button>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        ) : (
          <Card>
            <p className="text-center text-gray-500">{t("planner.noGarden")}</p>
          </Card>
        )}

        <DragOverlay>
          {activeDragPlant ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-2xl shadow-xl ring-2 ring-garden-500 dark:bg-gray-800">
              <PlantIconDisplay plantId={activeDragPlant.id} emoji={activeDragPlant.icon} size={28} />
            </div>
          ) : null}
        </DragOverlay>

        {/* New Garden Modal */}
        <Modal open={showNewGarden} onClose={() => setShowNewGarden(false)} title={t("planner.newGarden")}>
          <div className="space-y-4">
            <Input label={t("planner.gardenName")} value={gardenName} onChange={(e) => setGardenName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateGarden()} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewGarden(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateGarden}>{t("common.add")}</Button>
            </div>
          </div>
        </Modal>

        {/* New Bed Modal */}
        <Modal open={showNewBed} onClose={() => setShowNewBed(false)} title={t("planner.newBed")}>
          <div className="space-y-4">
            <Input label={t("planner.bedName")} value={bedName} onChange={(e) => setBedName(e.target.value)} autoFocus />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("planner.environment")}</label>
              <div className="grid grid-cols-4 gap-2">
                {ALL_ENVIRONMENTS.map((env) => (
                  <button key={env} onClick={() => setBedEnvType(env)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all ${
                      bedEnvType === env ? "border-garden-500 bg-garden-50 text-garden-700 ring-1 ring-garden-500 dark:bg-garden-900/30 dark:text-garden-400" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                    }`}>
                    <span className="text-lg">{ENVIRONMENT_ICONS[env]}</span>
                    <span className="text-center leading-tight">{t(`planner.environmentTypes.${env}`)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label={`${t("planner.width")} (m)`} type="number" min={0.3} max={20} step={0.1} value={bedWidthM} onChange={(e) => setBedWidthM(Number(e.target.value))} />
              <Input label={`${t("planner.height")} (m)`} type="number" min={0.3} max={20} step={0.1} value={bedHeightM} onChange={(e) => setBedHeightM(Number(e.target.value))} />
            </div>
            <p className="text-xs text-gray-400">
              {t("planner.gridInfo", { cells: `${Math.max(1, Math.round(bedWidthM / (gridCellSizeCm / 100)))} × ${Math.max(1, Math.round(bedHeightM / (gridCellSizeCm / 100)))}`, size: gridCellSizeCm })}
            </p>
            {bedEnvType === "greenhouse" && <GreenhouseConfigPanel config={ghConfig} onChange={setGhConfig} />}
            {bedEnvType === "cold_frame" && <ColdFrameConfigPanel config={cfConfig} onChange={setCfConfig} />}
            {bedEnvType === "raised_bed" && <RaisedBedConfigPanel config={rbConfig} onChange={setRbConfig} />}
            {bedEnvType === "container" && <ContainerConfigPanel config={ctConfig} onChange={setCtConfig} />}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewBed(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateBed}>{t("common.add")}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </DndContext>
  );
}
