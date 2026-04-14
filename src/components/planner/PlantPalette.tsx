import { useState, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Star } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import type { Plant, PlantCategory } from "@/types/plant";

interface Props {
  selectedPlantId: string | null;
  onSelectPlant: (plant: Plant) => void;
  recommendedIds?: Set<string>;
}

const DraggableItem = memo(function DraggableItem({ plant, isSelected, isRecommended, onSelect }: {
  plant: Plant; isSelected: boolean; isRecommended: boolean; onSelect: () => void;
}) {
  const getPlantName = usePlantName();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${plant.id}`,
    data: { plantId: plant.id },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${isSelected
        ? "border-garden-500 bg-garden-50 text-garden-700 ring-1 ring-garden-500 dark:bg-garden-900/30 dark:text-garden-400"
        : isRecommended
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      }`}
    >
      <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={16} />
      <span className="max-w-[80px] truncate">{getPlantName(plant.id)}</span>
      {isRecommended && <Star size={10} className="shrink-0 text-green-500" fill="currentColor" />}
    </button>
  );
});

const CATEGORIES: (PlantCategory | "all" | "recommended")[] = ["recommended", "all", "vegetable", "fruit", "berry", "herb"];

export function PlantPalette({ selectedPlantId, onSelectPlant, recommendedIds }: Props) {
  const { t } = useTranslation();
  const plants = usePlants();
  const getPlantName = usePlantName();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PlantCategory | "all" | "recommended">(
    recommendedIds && recommendedIds.size > 0 ? "recommended" : "all"
  );

  const filtered = useMemo(() => {
    let list = plants;

    if (category === "recommended") {
      list = list.filter((p) => recommendedIds?.has(p.id));
    } else if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => getPlantName(p.id).toLowerCase().includes(q));
    }

    return list;
  }, [plants, category, search, getPlantName, recommendedIds]);

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("plants.search")}
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-7 pr-2 text-xs shadow-sm placeholder:text-gray-400 focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => {
          if (cat === "recommended" && (!recommendedIds || recommendedIds.size === 0)) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                category === cat
                  ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {cat === "recommended" ? `⭐ ${t("palette.recommended")}` :
               cat === "all" ? t("plants.allCategories") :
               t(`plants.category.${cat}`)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1">
        {filtered.map((p) => (
          <DraggableItem
            key={p.id}
            plant={p}
            isSelected={selectedPlantId === p.id}
            isRecommended={recommendedIds?.has(p.id) ?? false}
            onSelect={() => onSelectPlant(p)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-xs text-gray-400">{t("common.noResults")}</p>
        )}
      </div>
    </div>
  );
}
