import { useState, useMemo, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { Search, CalendarClock, Sprout } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import type { PlantableNow } from "@/lib/advisor";
import type { Plant } from "@/types/plant";

type Category = "recommended" | "all" | "vegetable" | "herb" | "fruit";

interface Props {
  selectedPlantId: string | null;
  onSelectPlant: (plant: Plant) => void;
  /** Plantable right now (season + bed protection), sorted by urgency. */
  plantableNow: PlantableNow[];
  /** Fallback when nothing is in season: plants that suit the bed. */
  bedFitIds: string[];
  className?: string;
}

const PaletteItem = memo(function PaletteItem({ plant, name, reason, isSelected, onSelect }: {
  plant: Plant; name: string; reason?: string; isSelected: boolean; onSelect: (plant: Plant) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.id}`,
    data: { plantId: plant.id },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      aria-pressed={isSelected}
      title={reason ? `${name} · ${reason}` : name}
      onClick={(e) => { e.stopPropagation(); onSelect(plant); }}
      className={cn(
        "flex min-h-11 w-full cursor-grab touch-manipulation items-center gap-2 rounded-lg border px-2 text-left text-sm select-none active:cursor-grabbing sm:min-h-10",
        isDragging && "opacity-40",
        isSelected
          ? "border-garden-600 bg-garden-50 text-garden-800 ring-1 ring-garden-600 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200 dark:ring-garden-400"
          : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-200 dark:hover:bg-white/5",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: plant.color + "1f" }}>
        <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {reason && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{reason}</span>}
      </span>
    </button>
  );
});

/**
 * Plant picker of the bed editor. Choosing a plant (tap) or dragging it starts
 * placement mode; the default tab lists what can go into the ground now, with
 * the reason ("Direktsaat bis 19. Okt.").
 */
export function PlantPalette({ selectedPlantId, onSelectPlant, plantableNow, bedFitIds, className = "" }: Props) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const plants = usePlants();
  const getPlantName = usePlantName();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("recommended");

  // Debounce the filter (200 ms) so typing stays smooth with many items.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const names = useMemo(() => new Map(plants.map((p) => [p.id, getPlantName(p.id)])), [plants, getPlantName]);
  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);

  const recommended = useMemo(() => {
    if (plantableNow.length > 0) {
      return plantableNow
        .map((r) => ({ plant: plantById.get(r.plantId), reason: t(`palette.reason.${r.action}`, { date: formatDate(r.until, "short") }) }))
        .filter((r): r is { plant: Plant; reason: string } => !!r.plant);
    }
    return bedFitIds
      .map((id) => plantById.get(id))
      .filter((p): p is Plant => !!p)
      .map((plant) => ({ plant, reason: t("palette.reason.fitsBed") }));
  }, [plantableNow, bedFitIds, plantById, t, formatDate]);

  const items = useMemo(() => {
    let list: Array<{ plant: Plant; reason?: string }>;
    if (category === "recommended" && !search) list = recommended;
    else {
      list = plants
        .filter((p) => category === "recommended" || category === "all" || p.category === category || (category === "fruit" && p.category === "berry"))
        .map((plant) => ({ plant }));
      list.sort((a, b) => (names.get(a.plant.id) ?? "").localeCompare(names.get(b.plant.id) ?? ""));
    }
    if (search) list = list.filter(({ plant }) => (names.get(plant.id) ?? plant.id).toLowerCase().includes(search));
    return list;
  }, [category, search, recommended, plants, names]);

  return (
    <div className={className}>
      <div className="relative mb-3">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("plants.search")}
          aria-label={t("plants.search")}
          className="pl-9!"
        />
      </div>

      <div className="-mx-1 mb-3 overflow-x-auto px-1">
        <SegmentedControl
          size="sm"
          label={t("palette.filter")}
          value={category}
          onChange={setCategory}
          options={[
            { value: "recommended", label: t("palette.now") },
            { value: "all", label: t("common.all") },
            { value: "vegetable", label: t("plants.category.vegetable") },
            { value: "herb", label: t("plants.category.herb") },
            { value: "fruit", label: t("palette.fruitBerries") },
          ]}
        />
      </div>

      {category === "recommended" && !search && (
        <p className="mb-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {plantableNow.length > 0 ? <CalendarClock size={14} aria-hidden="true" className="mt-px shrink-0" /> : <Sprout size={14} aria-hidden="true" className="mt-px shrink-0" />}
          {plantableNow.length > 0 ? t("palette.nowHint") : t("palette.offSeasonHint")}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 md:grid-cols-1" aria-label={t("palette.listLabel")}>
        {items.map(({ plant, reason }) => (
          <li key={plant.id}>
            <PaletteItem
              plant={plant}
              name={names.get(plant.id) ?? plant.id}
              reason={reason}
              isSelected={selectedPlantId === plant.id}
              onSelect={onSelectPlant}
            />
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="py-3 text-center text-sm text-gray-500 dark:text-gray-400">{t("common.noResults")}</p>}
    </div>
  );
}
