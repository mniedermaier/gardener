import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Garden } from "@/types/garden";
import { plantFamilyMap, familyColors, rotationGroups, type PlantFamily } from "@/data/plantFamilies";
import { Card, CardHeader } from "@/components/ui/Card";
import { usePlantMap } from "@/hooks/usePlants";
import { isPerennial } from "@/lib/season";
import { useToday } from "@/hooks/useToday";

const GROUP_KEYS = ["heavy", "medium", "light", "improver"] as const;

/**
 * Crop rotation for the active garden: what each bed holds by plant family
 * this season and which feeder group should follow next year.
 */
export const CropRotation = memo(function CropRotation({ garden }: { garden: Garden }) {
  const now = useToday();
  const { t } = useTranslation();
  const family = (f: PlantFamily) => t(`planner.families.${f}`);
  const group = (i: number) => t(`planner.rotation.groups.${GROUP_KEYS[i]}`);
  const plantMap = usePlantMap();

  const beds = useMemo(
    () =>
      garden.beds
        .filter((bed) => bed.cells.length > 0)
        .map((bed) => {
          const families = new Map<PlantFamily, number>();
          for (const cell of bed.cells) {
            const f = plantFamilyMap[cell.plantId] ?? "other";
            families.set(f, (families.get(f) ?? 0) + 1);
          }
          const sorted = [...families].sort((a, b) => b[1] - a[1]);
          const dominant = sorted[0]?.[0] ?? "other";
          const current = rotationGroups.findIndex((g) => g.families.includes(dominant));
          const next = current >= 0 ? (current + 1) % rotationGroups.length : 0;
          // Pots and perennial beds do not rotate: the soil is renewed or the crop stays.
          const env = bed.environmentType ?? "outdoor_bed";
          const perennialCells = bed.cells.filter((c) => { const p = plantMap.get(c.plantId); return p ? isPerennial(p) : false; }).length;
          const fixed: "container" | "perennial" | null =
            env === "container" || env === "windowsill" ? "container" : perennialCells * 2 >= bed.cells.length ? "perennial" : null;
          return { bed, families: sorted, current, next, fixed };
        }),
    [garden.beds, plantMap],
  );

  if (beds.length === 0) return null;
  const nextYear = Number(garden.season || now.getFullYear()) + 1;

  return (
    <Card>
      <CardHeader
        title={t("planner.rotation.title")}
        description={t("planner.rotation.description")}
      />

      {/* A read-only sequence: numbered steps on a flat tint (no borders, so nothing looks like a button), equal width. */}
      <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">{t("planner.rotation.order")}</p>
      <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t("planner.rotation.order")}>
        {rotationGroups.map((g, i) => (
          <li key={GROUP_KEYS[i]} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-700 tabular-nums ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-white/10" aria-hidden="true">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{group(i)}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{g.families.map(family).join(", ")}</span>
            </span>
          </li>
        ))}
      </ol>

      <ul className="divide-y divide-gray-100 dark:divide-white/5">
        {beds.map(({ bed, families, next, fixed }) => {
          const planted = bed.cells.length;
          return (
            <li key={bed.id} className="py-3 first:pt-0 last:pb-0">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{bed.name}</span>
                {fixed ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t(`planner.rotation.fixed.${fixed}`)}</span>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("planner.rotation.next", { year: nextYear })}{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{group(next)}</span>
                  </span>
                )}
              </div>
              <div className="mb-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {families.map(([f, count]) => (
                  <div key={f} className="h-full first:rounded-l-full last:rounded-r-full dark:opacity-85" style={{ width: `${(count / planted) * 100}%`, backgroundColor: familyColors[f] }} />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                {families.map(([f, count]) => (
                  <li key={f} className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: familyColors[f] }} aria-hidden="true" />
                    {family(f)} <span className="tabular-nums text-gray-500">{count}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Card>
  );
});
