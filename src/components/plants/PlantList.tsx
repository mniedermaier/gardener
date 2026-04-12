import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantCard } from "./PlantCard";
import { PlantDetail } from "./PlantDetail";
import { CustomPlantForm } from "./CustomPlantForm";
import { Button } from "@/components/ui/Button";
import type { Plant, PlantCategory } from "@/types/plant";

const categories: (PlantCategory | "all")[] = ["all", "vegetable", "fruit", "berry", "herb"];

export function PlantList() {
  const { t } = useTranslation();
  const plants = usePlants();
  const getPlantName = usePlantName();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PlantCategory | "all">("all");
  const [selected, setSelected] = useState<Plant | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const filtered = useMemo(() => {
    return plants.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (search) {
        const name = getPlantName(p.id).toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [plants, category, search, getPlantName]);

  if (selected) {
    return <PlantDetail plant={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("plants.title")}</h1>
        <Button size="sm" onClick={() => setShowCustomForm(true)}>
          <Plus size={16} />
          {t("plants.addCustom")}
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("plants.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {cat === "all" ? t("plants.allCategories") : t(`plants.category.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">{t("common.noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plant) => (
            <PlantCard key={plant.id} plant={plant} onClick={() => setSelected(plant)} />
          ))}
        </div>
      )}

      <CustomPlantForm open={showCustomForm} onClose={() => setShowCustomForm(false)} />
    </div>
  );
}
