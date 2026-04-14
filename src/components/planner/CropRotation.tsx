import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { plantFamilyMap, familyColors, familyNameKeys, rotationGroups, type PlantFamily } from "@/data/plantFamilies";
import { Card } from "@/components/ui/Card";

export function CropRotation() {
  const { i18n } = useTranslation();
  const { gardens, activeGardenId } = useStore(useShallow((s) => ({ gardens: s.gardens, activeGardenId: s.activeGardenId })));
  const lang = i18n.language as "de" | "en";

  const activeGarden = gardens.find((g) => g.id === activeGardenId);

  const bedFamilies = useMemo(() => {
    if (!activeGarden) return [];
    return activeGarden.beds.map((bed) => {
      const families = new Map<PlantFamily, number>();
      for (const cell of bed.cells) {
        const family = plantFamilyMap[cell.plantId] ?? "other";
        families.set(family, (families.get(family) ?? 0) + 1);
      }
      return { bed, families };
    });
  }, [activeGarden]);

  if (!activeGarden || bedFamilies.length === 0) return null;

  const currentYear = new Date().getFullYear();

  return (
    <Card className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">
        {lang === "de" ? "Fruchtfolge-Planung" : "Crop Rotation Planning"}
      </h2>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {lang === "de"
          ? "Empfohlene Rotation: Starkzehrer → Mittelzehrer → Schwachzehrer → Bodenverbesserer (Leguminosen)"
          : "Recommended rotation: Heavy feeders → Medium feeders → Light feeders → Soil improvers (Legumes)"}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {rotationGroups.map((group, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-1 text-xs font-semibold text-gray-500">{i + 1}. {group.label[lang]}</p>
            <div className="flex flex-wrap gap-1">
              {group.families.map((f) => (
                <span
                  key={f}
                  className="rounded px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: familyColors[f] }}
                >
                  {familyNameKeys[f][lang]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
        {lang === "de" ? "Aktuelle Belegung nach Pflanzenfamilie" : "Current bed composition by plant family"}
      </h3>

      <div className="space-y-3">
        {bedFamilies.map(({ bed, families }) => {
          const totalCells = bed.width * bed.height;
          const plantedCells = bed.cells.length;
          const currentGroup = (() => {
            let maxCount = 0;
            let dominantFamily: PlantFamily = "other";
            for (const [family, count] of families) {
              if (count > maxCount) {
                maxCount = count;
                dominantFamily = family;
              }
            }
            return rotationGroups.findIndex((g) => g.families.includes(dominantFamily));
          })();
          const nextGroup = currentGroup >= 0 ? (currentGroup + 1) % rotationGroups.length : 0;

          return (
            <div key={bed.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{bed.name}</span>
                <span className="text-xs text-gray-400">{plantedCells}/{totalCells} cells</span>
              </div>
              {families.size > 0 ? (
                <>
                  <div className="mb-2 flex h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {Array.from(families.entries()).map(([family, count]) => (
                      <div
                        key={family}
                        className="h-full transition-all"
                        style={{
                          width: `${(count / plantedCells) * 100}%`,
                          backgroundColor: familyColors[family],
                        }}
                        title={`${familyNameKeys[family][lang]}: ${count}`}
                      />
                    ))}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Array.from(families.entries()).map(([family, count]) => (
                      <span key={family} className="text-xs text-gray-500">
                        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: familyColors[family] }} />
                        {familyNameKeys[family][lang]} ({count})
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">
                      {lang === "de" ? `${currentYear + 1} empfohlen: ` : `${currentYear + 1} recommended: `}
                    </span>
                    {rotationGroups[nextGroup]?.label[lang]}
                    <span className="ml-1 text-gray-400">
                      ({rotationGroups[nextGroup]?.families.map((f) => familyNameKeys[f][lang]).join(", ")})
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">{lang === "de" ? "Noch keine Pflanzen" : "No plants yet"}</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
