import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CookingPot, FlaskConical, Snowflake, Sun, Warehouse, Archive, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Plant, PreservationMethod, SeedSavingInfo } from "@/types/plant";
import type { Tone } from "@/components/ui/tone";
import { propagation } from "@/lib/seedViability";

const METHOD_ICON: Record<PreservationMethod, LucideIcon> = {
  canning: CookingPot,
  freezing: Snowflake,
  fermenting: FlaskConical,
  drying: Sun,
  root_cellar: Warehouse,
};

const DIFFICULTY_TONE: Record<SeedSavingInfo["difficulty"], Tone> = { easy: "brand", moderate: "neutral", advanced: "warning" };

/** Wording for vegetatively propagated crops (see lib/seedViability). */
const VEGETATIVE_KIND: Record<string, "tubers" | "cloves"> = { potato: "tubers", garlic: "cloves" };
const vegetativeKind = (p: Plant) => (propagation(p) === "vegetative" ? VEGETATIVE_KIND[p.id] ?? "other" : null);

export function PreservationGuide() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { gardens } = useStore(useShallow((s) => ({ gardens: s.gardens })));
  const plantMap = usePlantMap();
  const plantName = usePlantName();

  const planted = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return [...ids].map((id) => plantMap.get(id)).filter((p): p is Plant => !!p);
  }, [gardens, plantMap]);

  const preservable = planted.filter((p) => (p.preservationMethods ?? []).length > 0);
  const seedPlants = planted.filter((p) => p.seedSaving || propagation(p) === "vegetative");

  if (preservable.length === 0 && seedPlants.length === 0) {
    return (
      <Card>
        <EmptyState compact icon={Archive} title={t("preservation.emptyTitle")} description={t("preservation.emptyText")} action={<Button onClick={() => navigate("/planner")}>{t("sufficiency.toPlanner")}</Button>} />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {preservable.length > 0 && (
        <Card padding="none">
          <div className="px-4 pt-4 sm:px-6 sm:pt-5"><CardHeader title={t("preservation.title")} description={t("preservation.desc")} /></div>
          <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
            {preservable.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
                <PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />
                <span className="min-w-24 flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{plantName(p.id)}</span>
                <span className="flex flex-wrap gap-1.5">
                  {p.preservationMethods!.map((m) => (
                    <Badge key={m} variant="outline" icon={METHOD_ICON[m]}>{t(`preservation.methods.${m}`)}</Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {seedPlants.length > 0 && (
        <Card padding="none">
          <div className="px-4 pt-4 sm:px-6 sm:pt-5"><CardHeader title={t("preservation.seedSaving")} description={t("preservation.seedSavingDesc")} /></div>
          <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
            {seedPlants.map((p) => {
              const veg = vegetativeKind(p);
              const ss = p.seedSaving;
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <PlantIconDisplay plantId={p.id} emoji={p.icon} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{plantName(p.id)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {veg
                        ? t(`preservation.vegetative.${veg}`)
                        : [
                            t("preservation.viability", { count: ss!.seedViabilityYears }),
                            ss!.isolationDistanceM ? t("preservation.isolation", { distance: `${f.formatNumber(ss!.isolationDistanceM, { maximumFractionDigits: 0 })} m` }) : null,
                          ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {veg ? (
                    <Badge variant="outline">{t("preservation.vegetativeBadge")}</Badge>
                  ) : (
                    <Badge tone={DIFFICULTY_TONE[ss!.difficulty]}>{t(`preservation.difficulty.${ss!.difficulty}`)}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
