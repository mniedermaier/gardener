import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, LayoutGrid, List } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import type { Plant } from "@/types/plant";

type ViewMode = "matrix" | "list";

function MatrixView({ plants, plantName }: {
  plants: Plant[];
  plantName: (id: string) => string;
}) {
  const companionSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of plants) {
      map.set(p.id, new Set(p.companions));
    }
    return map;
  }, [plants]);

  const antagonistSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of plants) {
      map.set(p.id, new Set(p.antagonists));
    }
    return map;
  }, [plants]);

  const getRelation = useCallback((rowId: string, colId: string): "companion" | "antagonist" | null => {
    if (rowId === colId) return null;
    if (companionSets.get(rowId)?.has(colId) || companionSets.get(colId)?.has(rowId)) return "companion";
    if (antagonistSets.get(rowId)?.has(colId) || antagonistSets.get(colId)?.has(rowId)) return "antagonist";
    return null;
  }, [companionSets, antagonistSets]);

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 min-w-[120px] border-b border-r border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800" />
            {plants.map((p) => (
              <th
                key={p.id}
                className="sticky top-0 z-10 min-w-[32px] border-b border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col items-center gap-0.5" title={plantName(p.id)}>
                  <PlantIconDisplay plantId={p.id} emoji={p.icon} size={18} />
                  <span className="max-w-[30px] truncate text-[9px] text-gray-600 dark:text-gray-400">
                    {plantName(p.id).slice(0, 3)}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plants.map((rowPlant) => (
            <tr key={rowPlant.id}>
              <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-1.5">
                  <PlantIconDisplay plantId={rowPlant.id} emoji={rowPlant.icon} size={18} />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {plantName(rowPlant.id)}
                  </span>
                </div>
              </td>
              {plants.map((colPlant) => {
                const relation = getRelation(rowPlant.id, colPlant.id);
                let cellClass = "border-b border-gray-100 dark:border-gray-800";
                if (rowPlant.id === colPlant.id) {
                  cellClass += " bg-gray-100 dark:bg-gray-800";
                } else if (relation === "companion") {
                  cellClass += " bg-green-100 dark:bg-green-900/40";
                } else if (relation === "antagonist") {
                  cellClass += " bg-red-100 dark:bg-red-900/40";
                }
                return (
                  <td
                    key={colPlant.id}
                    className={`h-8 w-8 text-center ${cellClass}`}
                    title={
                      relation
                        ? `${plantName(rowPlant.id)} + ${plantName(colPlant.id)}: ${relation === "companion" ? "+" : "-"}`
                        : undefined
                    }
                  >
                    {relation === "companion" && (
                      <span className="text-green-600 dark:text-green-400">+</span>
                    )}
                    {relation === "antagonist" && (
                      <span className="text-red-600 dark:text-red-400">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListView({ plants, plantName }: {
  plants: Plant[];
  plantName: (id: string) => string;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {plants.map((plant) => (
        <Card key={plant.id} className="!p-4">
          <div className="mb-2 flex items-center gap-2">
            <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              {plantName(plant.id)}
            </h3>
          </div>

          {plant.companions.length === 0 && plant.antagonists.length === 0 ? (
            <p className="text-sm text-gray-400">{t("companions.noRelations")}</p>
          ) : (
            <div className="space-y-2">
              {plant.companions.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    {t("companions.companionsLabel")}:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {plant.companions.map((cId) => (
                      <span
                        key={cId}
                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      >
                        {plantName(cId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {plant.antagonists.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">
                    {t("companions.antagonistsLabel")}:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {plant.antagonists.map((aId) => (
                      <span
                        key={aId}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      >
                        {plantName(aId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function CompanionMatrix() {
  const { t } = useTranslation();
  const allPlants = usePlants();
  const plantName = usePlantName();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("matrix");

  const sortedPlants = useMemo(
    () => [...allPlants].sort((a, b) => plantName(a.id).localeCompare(plantName(b.id))),
    [allPlants, plantName],
  );

  const filteredPlants = useMemo(() => {
    if (!search.trim()) return sortedPlants;
    const q = search.toLowerCase();
    return sortedPlants.filter((p) => plantName(p.id).toLowerCase().includes(q));
  }, [sortedPlants, search, plantName]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t("companions.title")}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("companions.search")}
              className="!pl-8"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setView("matrix")}
              className={`flex items-center gap-1 rounded-l-lg px-3 py-2 text-sm transition-colors ${
                view === "matrix"
                  ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title={t("companions.matrixView")}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">{t("companions.matrixView")}</span>
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 rounded-r-lg px-3 py-2 text-sm transition-colors ${
                view === "list"
                  ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                  : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title={t("companions.listView")}
            >
              <List size={16} />
              <span className="hidden sm:inline">{t("companions.listView")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* On mobile, default to list view hint */}
      {view === "matrix" ? (
        <div className="hidden sm:block">
          <MatrixView plants={filteredPlants} plantName={plantName} />
        </div>
      ) : null}

      {/* Show list on mobile always when matrix is selected, or when list view is active */}
      {view === "list" ? (
        <ListView plants={filteredPlants} plantName={plantName} />
      ) : (
        <div className="sm:hidden">
          <ListView plants={filteredPlants} plantName={plantName} />
        </div>
      )}
    </div>
  );
}
