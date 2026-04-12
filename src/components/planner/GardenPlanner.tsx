import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Download, Upload, Settings, Archive, Share2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useStore } from "@/store";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Bed, Garden, EnvironmentType, GreenhouseConfig, ContainerConfig, RaisedBedConfig, ColdFrameConfig } from "@/types/garden";
import { ENVIRONMENT_ICONS, getFrostProtectionWeeks } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { CropRotation } from "./CropRotation";
import { GuildPicker } from "./GuildPicker";
import { generateShareUrl } from "@/lib/sharing";

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

function DraggablePlant({ plant }: { plant: Plant }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.id}`,
    data: { plantId: plant.id },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={t(`plants.catalog.${plant.id}.name`)}
      className={`flex h-9 w-9 cursor-grab items-center justify-center rounded text-base transition-all hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {plant.icon}
    </button>
  );
}

function DroppableCell({
  bedId,
  x,
  y,
  plant,
  variety,
  isCompanion,
  isAntagonist,
  onRemove,
}: {
  bedId: string;
  x: number;
  y: number;
  plant?: Plant;
  variety?: string;
  isCompanion: boolean;
  isAntagonist: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${bedId}-${x}-${y}`,
    data: { bedId, x, y },
  });

  const plantName = plant
    ? (plant.id.startsWith("custom-")
        ? localStorage.getItem(`plant-name-${plant.id}`) ?? plant.id
        : t(`plants.catalog.${plant.id}.name`))
    : "";
  const tooltip = variety ? `${plantName} (${variety})` : plantName;

  return (
    <div
      ref={setNodeRef}
      onClick={plant ? onRemove : undefined}
      title={tooltip}
      className={`flex h-10 w-10 items-center justify-center rounded text-lg transition-all ${
        plant
          ? "cursor-pointer shadow-sm hover:opacity-75"
          : "bg-earth-200/60 dark:bg-earth-600/40"
      } ${isOver ? "ring-2 ring-garden-400 ring-offset-1 bg-garden-100 dark:bg-garden-900/40" : ""} ${
        isAntagonist ? "ring-2 ring-red-400" : ""
      } ${isCompanion && !isAntagonist ? "ring-2 ring-green-400" : ""}`}
      style={plant ? { backgroundColor: plant.color + "30" } : undefined}
    >
      {plant?.icon ?? ""}
    </div>
  );
}

function BedGrid({ bed, gardenId }: { bed: Bed; gardenId: string }) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();
  const { removeCell, updateBed, gridCellSizeCm } = useStore();
  const [showConfig, setShowConfig] = useState(false);
  const envType = bed.environmentType ?? "outdoor_bed";
  const frostWeeks = getFrostProtectionWeeks(bed);
  const bedWidthM = ((bed.width * gridCellSizeCm) / 100).toFixed(1);
  const bedHeightM = ((bed.height * gridCellSizeCm) / 100).toFixed(1);

  return (
    <Card className={`overflow-hidden ${ENVIRONMENT_BORDERS[envType]}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={t(`planner.environmentTypes.${envType}`)}>
            {ENVIRONMENT_ICONS[envType]}
          </span>
          <h3 className="font-semibold">{bed.name}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {bedWidthM} × {bedHeightM} m
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {t(`planner.environmentTypes.${envType}`)}
          </span>
          {frostWeeks > 0 && (
            <span className="rounded-full bg-garden-100 px-2 py-0.5 text-xs text-garden-700 dark:bg-garden-900/40 dark:text-garden-400">
              +{frostWeeks}w
            </span>
          )}
        </div>
        {(envType === "greenhouse" || envType === "cold_frame" || envType === "raised_bed" || envType === "container") && (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <Settings size={14} />
          </button>
        )}
      </div>

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

      <div
        className={`inline-grid gap-0.5 rounded-lg border p-1 ${ENVIRONMENT_COLORS[envType]} ${ENVIRONMENT_BORDERS[envType]}`}
        style={{ gridTemplateColumns: `repeat(${bed.width}, 2.5rem)` }}
      >
        {Array.from({ length: bed.height }, (_, y) =>
          Array.from({ length: bed.width }, (_, x) => {
            const cell = bed.cells.find((c) => c.cellX === x && c.cellY === y);
            const plant = cell ? plantMap.get(cell.plantId) : undefined;
            const neighbors = bed.cells.filter(
              (c) =>
                !(c.cellX === x && c.cellY === y) &&
                Math.abs(c.cellX - x) <= 1 &&
                Math.abs(c.cellY - y) <= 1
            );
            const isCompanion = plant
              ? neighbors.some((c) => plant.companions.includes(c.plantId))
              : false;
            const isAntagonist = plant
              ? neighbors.some((c) => plant.antagonists.includes(c.plantId))
              : false;

            return (
              <DroppableCell
                key={`${x}-${y}`}
                bedId={bed.id}
                x={x}
                y={y}
                plant={plant}
                variety={cell?.variety}
                isCompanion={isCompanion}
                isAntagonist={isAntagonist}
                onRemove={() => removeCell(gardenId, bed.id, x, y)}
              />
            );
          })
        )}
      </div>
      {bed.cells.length === 0 && (
        <GuildPicker gardenId={gardenId} bedId={bed.id} bedWidth={bed.width} bedHeight={bed.height} />
      )}
      <p className="mt-2 text-xs text-gray-400">{t("planner.dragPlant")}</p>
    </Card>
  );
}

function GreenhouseConfigPanel({ config, onChange }: { config: GreenhouseConfig; onChange: (c: GreenhouseConfig) => void }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
      <h4 className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">{t("planner.greenhouse.title")}</h4>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.material")}</label>
          <select
            value={config.material}
            onChange={(e) => onChange({ ...config, material: e.target.value as GreenhouseConfig["material"] })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="glass">{t("planner.greenhouse.materials.glass")}</option>
            <option value="polycarbonate">{t("planner.greenhouse.materials.polycarbonate")}</option>
            <option value="plastic">{t("planner.greenhouse.materials.plastic")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.ventilation")}</label>
          <select
            value={config.ventilation}
            onChange={(e) => onChange({ ...config, ventilation: e.target.value as "manual" | "automatic" })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="manual">{t("planner.greenhouse.ventilationTypes.manual")}</option>
            <option value="automatic">{t("planner.greenhouse.ventilationTypes.automatic")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.frostProtection")}</label>
          <input
            type="number"
            min={0}
            max={20}
            value={config.frostProtectionWeeks}
            onChange={(e) => onChange({ ...config, frostProtectionWeeks: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.heated}
            onChange={(e) => onChange({ ...config, heated: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label className="text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heated")}</label>
        </div>
        {config.heated && (
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.heatingType")}</label>
            <select
              value={config.heatingType ?? "electric"}
              onChange={(e) => onChange({ ...config, heatingType: e.target.value as GreenhouseConfig["heatingType"] })}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="electric">{t("planner.greenhouse.heatingTypes.electric")}</option>
              <option value="gas">{t("planner.greenhouse.heatingTypes.gas")}</option>
              <option value="passive_solar">{t("planner.greenhouse.heatingTypes.passive_solar")}</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.minTemp")}</label>
          <input
            type="number"
            value={config.minTempC}
            onChange={(e) => onChange({ ...config, minTempC: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.greenhouse.maxTemp")}</label>
          <input
            type="number"
            value={config.maxTempC}
            onChange={(e) => onChange({ ...config, maxTempC: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
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
        <input
          type="number"
          min={0}
          max={10}
          value={config.frostProtectionWeeks}
          onChange={(e) => onChange({ frostProtectionWeeks: Number(e.target.value) })}
          className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
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
        <input
          type="number"
          min={20}
          max={150}
          value={config.heightCm}
          onChange={(e) => onChange({ ...config, heightCm: Number(e.target.value) })}
          className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
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
          <input
            type="number"
            min={1}
            max={500}
            value={config.volumeLiters}
            onChange={(e) => onChange({ ...config, volumeLiters: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("planner.container.material")}</label>
          <select
            value={config.material}
            onChange={(e) => onChange({ ...config, material: e.target.value as ContainerConfig["material"] })}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            {(["terracotta", "plastic", "fabric", "wood", "metal"] as const).map((m) => (
              <option key={m} value={m}>{t(`planner.container.materials.${m}`)}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function GardenPlanner() {
  const { t } = useTranslation();
  const { gardens, activeGardenId, addGarden, setActiveGarden, addBed, deleteBed, deleteGarden, setCell, archiveSeason, seasonArchives, gridCellSizeCm } =
    useStore();
  const plants = usePlants();
  const plantMap = usePlantMap();
  const [showNewGarden, setShowNewGarden] = useState(false);
  const [showNewBed, setShowNewBed] = useState(false);
  const [gardenName, setGardenName] = useState("");
  const [bedName, setBedName] = useState("");
  const [bedWidthM, setBedWidthM] = useState(1.8);
  const [bedHeightM, setBedHeightM] = useState(1.2);
  const [bedEnvType, setBedEnvType] = useState<EnvironmentType>("outdoor_bed");
  const [ghConfig, setGhConfig] = useState<GreenhouseConfig>({
    material: "glass", heated: false, ventilation: "manual",
    minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4,
  });
  const [cfConfig, setCfConfig] = useState<ColdFrameConfig>({ frostProtectionWeeks: 3 });
  const [rbConfig, setRbConfig] = useState<RaisedBedConfig>({ heightCm: 80 });
  const [ctConfig, setCtConfig] = useState<ContainerConfig>({ volumeLiters: 30, material: "terracotta" });
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGarden = gardens.find((g) => g.id === activeGardenId);

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
                greenhouseConfig: bed.greenhouseConfig,
                containerConfig: bed.containerConfig,
                raisedBedConfig: bed.raisedBedConfig,
                coldFrameConfig: bed.coldFrameConfig,
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
      } catch {
        alert("Invalid file format");
      }
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
    const bedCount = activeGarden?.beds.length ?? 0;
    const cellSizeM = gridCellSizeCm / 100;
    const width = Math.max(1, Math.round(bedWidthM / cellSizeM));
    const height = Math.max(1, Math.round(bedHeightM / cellSizeM));
    addBed(activeGardenId, {
      name: bedName.trim(),
      x: 0,
      y: bedCount,
      width,
      height,
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

  const handleDragStart = (event: DragStartEvent) => {
    const plantId = event.active.data.current?.plantId as string | undefined;
    if (plantId) {
      setActiveDragPlant(plantMap.get(plantId) ?? null);
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
      setCell(activeGardenId, bedId, { cellX: x, cellY: y, plantId });
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("planner.title")}</h1>
          <div className="flex gap-2">
            {activeGarden && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = generateShareUrl(activeGarden);
                  navigator.clipboard.writeText(url);
                  alert(t("planner.shareCopied"));
                }}
                title={t("planner.share")}
              >
                <Share2 size={16} />
              </Button>
            )}
            {gardens.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExport} title="Export">
                <Download size={16} />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} title="Import">
              <Upload size={16} />
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button onClick={() => setShowNewGarden(true)} size="sm">
              <Plus size={16} />
              {t("planner.newGarden")}
            </Button>
          </div>
        </div>

        {gardens.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {gardens.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGarden(g.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeGardenId === g.id
                    ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {g.name}
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-normal text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {g.season}
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGarden(g.id);
                  }}
                  className="ml-1 rounded p-0.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </span>
              </button>
            ))}
            {activeGarden && activeGarden.beds.some((b) => b.cells.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(t("season.archiveConfirm"))) {
                    archiveSeason(activeGardenId!);
                  }
                }}
                title={t("season.archive")}
              >
                <Archive size={14} />
                <span className="text-xs">{t("season.archive")}</span>
              </Button>
            )}
          </div>
        )}

        {activeGarden ? (
          <div>
            <Card className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("planner.dragPlant")}
              </h3>
              <div className="flex flex-wrap gap-1">
                {plants.map((p) => (
                  <DraggablePlant key={p.id} plant={p} />
                ))}
              </div>
            </Card>

            <div className="mb-4 flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNewBed(true)}>
                <Plus size={16} />
                {t("planner.newBed")}
              </Button>
            </div>
            <div className="space-y-6">
              {activeGarden.beds.map((bed) => (
                <div key={bed.id} className="relative">
                  <button
                    onClick={() => deleteBed(activeGardenId!, bed.id)}
                    className="absolute -right-2 -top-2 z-10 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400"
                    title={t("planner.deleteBed")}
                  >
                    <Trash2 size={14} />
                  </button>
                  <BedGrid bed={bed} gardenId={activeGardenId!} />
                </div>
              ))}
            </div>
            {activeGarden.beds.length === 0 && (
              <p className="mt-4 text-center text-gray-500">{t("planner.dragPlant")}</p>
            )}
            <CropRotation />
            {seasonArchives.filter((a) => a.gardenId === activeGardenId).length > 0 && (
              <Card className="mt-6">
                <h2 className="mb-3 text-lg font-semibold">{t("season.archives")}</h2>
                <div className="space-y-2">
                  {seasonArchives
                    .filter((a) => a.gardenId === activeGardenId)
                    .sort((a, b) => b.season.localeCompare(a.season))
                    .map((a) => {
                      const totalPlants = a.beds.reduce((s, b) => s + b.cells.length, 0);
                      return (
                        <div key={`${a.gardenId}-${a.season}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800">
                          <div>
                            <span className="font-medium">{t("season.current", { year: a.season })}</span>
                            <span className="ml-2 text-xs text-gray-400">
                              {t("season.beds", { count: a.beds.length })} / {t("season.plants", { count: totalPlants })}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{a.archivedAt.slice(0, 10)}</span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <p className="text-center text-gray-500">{t("planner.noGarden")}</p>
          </Card>
        )}

        <DragOverlay>
          {activeDragPlant ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-2xl shadow-xl ring-2 ring-garden-500 dark:bg-gray-800">
              {activeDragPlant.icon}
            </div>
          ) : null}
        </DragOverlay>

        <Modal open={showNewGarden} onClose={() => setShowNewGarden(false)} title={t("planner.newGarden")}>
          <div className="space-y-4">
            <Input
              label={t("planner.gardenName")}
              value={gardenName}
              onChange={(e) => setGardenName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGarden()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewGarden(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateGarden}>{t("common.add")}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={showNewBed} onClose={() => setShowNewBed(false)} title={t("planner.newBed")}>
          <div className="space-y-4">
            <Input
              label={t("planner.bedName")}
              value={bedName}
              onChange={(e) => setBedName(e.target.value)}
              autoFocus
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("planner.environment")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ALL_ENVIRONMENTS.map((env) => (
                  <button
                    key={env}
                    onClick={() => setBedEnvType(env)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all ${
                      bedEnvType === env
                        ? "border-garden-500 bg-garden-50 text-garden-700 ring-1 ring-garden-500 dark:bg-garden-900/30 dark:text-garden-400"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    <span className="text-lg">{ENVIRONMENT_ICONS[env]}</span>
                    <span className="text-center leading-tight">{t(`planner.environmentTypes.${env}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t("planner.width")} (m)`}
                type="number"
                min={0.3}
                max={20}
                step={0.1}
                value={bedWidthM}
                onChange={(e) => setBedWidthM(Number(e.target.value))}
              />
              <Input
                label={`${t("planner.height")} (m)`}
                type="number"
                min={0.3}
                max={20}
                step={0.1}
                value={bedHeightM}
                onChange={(e) => setBedHeightM(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-gray-400">
              {t("planner.gridInfo", {
                cells: `${Math.max(1, Math.round(bedWidthM / (gridCellSizeCm / 100)))} × ${Math.max(1, Math.round(bedHeightM / (gridCellSizeCm / 100)))}`,
                size: gridCellSizeCm,
              })}
            </p>

            {bedEnvType === "greenhouse" && (
              <GreenhouseConfigPanel config={ghConfig} onChange={setGhConfig} />
            )}
            {bedEnvType === "cold_frame" && (
              <ColdFrameConfigPanel config={cfConfig} onChange={setCfConfig} />
            )}
            {bedEnvType === "raised_bed" && (
              <RaisedBedConfigPanel config={rbConfig} onChange={setRbConfig} />
            )}
            {bedEnvType === "container" && (
              <ContainerConfigPanel config={ctConfig} onChange={setCtConfig} />
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewBed(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateBed}>{t("common.add")}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </DndContext>
  );
}
