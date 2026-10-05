import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, SearchX } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantCard } from "./PlantCard";
import { PlantDetail } from "./PlantDetail";
import { CustomPlantForm } from "./CustomPlantForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Plant, PlantCategory } from "@/types/plant";

type CategoryFilter = PlantCategory | "all";
const categories: CategoryFilter[] = ["all", "vegetable", "fruit", "berry", "herb"];

export function PlantList() {
  const { t } = useTranslation();
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { gardens, customPlants } = useStore(useShallow((s) => ({ gardens: s.gardens, customPlants: s.customPlants })));
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plant | undefined>(undefined);

  // Debounce the search input (200 ms) so typing stays smooth.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [query]);

  // Selected plant lives in the URL (?plant=tomato) so other pages can deep-link.
  const selectedId = searchParams.get("plant");
  const selected = selectedId ? plantMap.get(selectedId) : undefined;
  const openPlant = useCallback((id: string | null) => {
    setSearchParams(id ? { plant: id } : {});
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, [setSearchParams]);

  const plantedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return ids;
  }, [gardens]);

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = { all: plants.length, vegetable: 0, fruit: 0, berry: 0, herb: 0 };
    for (const p of plants) c[p.category]++;
    return c;
  }, [plants]);

  const filtered = useMemo(() => {
    return plants
      .filter((p) => {
        if (category !== "all" && p.category !== category) return false;
        if (search && !getPlantName(p.id).toLowerCase().includes(search)) return false;
        return true;
      })
      .sort((a, b) => getPlantName(a.id).localeCompare(getPlantName(b.id)));
  }, [plants, category, search, getPlantName]);

  // Bumped on every open so the dialog starts from a fresh draft.
  const [formKey, setFormKey] = useState(0);
  const openCreate = () => { setEditing(undefined); setFormKey((k) => k + 1); setFormOpen(true); };
  const openEdit = (p: Plant) => { setEditing(p); setFormKey((k) => k + 1); setFormOpen(true); };

  const form = (
    <CustomPlantForm
      key={`${editing?.id ?? "new"}-${formKey}`}
      open={formOpen}
      plant={editing}
      onClose={() => setFormOpen(false)}
      onDeleted={() => openPlant(null)}
    />
  );

  if (selected) {
    return (
      <>
        <PlantDetail
          plant={selected}
          onBack={() => openPlant(null)}
          onSelectPlant={openPlant}
          onEdit={customPlants.some((p) => p.id === selected.id) ? () => openEdit(selected) : undefined}
        />
        {form}
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("plants.title")}
        description={t("plants.subtitle", { count: plants.length })}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            {t("plants.addCustom")}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            aria-label={t("plants.searchLabel")}
            placeholder={t("plants.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
          <SegmentedControl
            label={t("plants.categoryFilter")}
            value={category}
            onChange={setCategory}
            options={categories.filter((c) => c === "all" || counts[c] > 0 || c === category).map((c) => ({
              value: c,
              label: c === "all" ? t("common.all") : t(`plants.category.${c}`),
              count: counts[c],
            }))}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title={t("plants.emptyTitle")}
            description={t("plants.emptyText")}
            action={
              <Button onClick={() => { setQuery(""); setSearch(""); setCategory("all"); }}>
                {t("plants.resetSearch")}
              </Button>
            }
            secondaryAction={
              <Button variant="ghost" onClick={openCreate}>
                <Plus size={16} aria-hidden="true" />
                {t("plants.addCustom")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((plant) => (
            <PlantCard key={plant.id} plant={plant} planted={plantedIds.has(plant.id)} custom={customPlants.some((p) => p.id === plant.id)} onOpen={openPlant} />
          ))}
        </div>
      )}

      {form}
    </div>
  );
}
