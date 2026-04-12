import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, TrendingUp, AlertCircle, Apple, Beef, Citrus, Wheat } from "lucide-react";
import { useStore } from "@/store";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { calculateSufficiency, type SufficiencyResult } from "@/lib/sufficiency";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PreservationGuide } from "./PreservationGuide";

const NUTRIENT_ICONS = {
  calories: Apple,
  protein: Beef,
  vitaminC: Citrus,
  fiber: Wheat,
};

const NUTRIENT_COLORS = {
  calories: "bg-amber-500",
  protein: "bg-red-500",
  vitaminC: "bg-orange-500",
  fiber: "bg-green-500",
};

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

export function SufficiencyDashboard() {
  const { t } = useTranslation();
  const { gardens, gridCellSizeCm } = useStore();
  const plants = usePlants();
  const plantMap = usePlantMap();
  const [familySize, setFamilySize] = useState(2);

  const result: SufficiencyResult | null = useMemo(() => {
    const hasPlantings = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
    if (!hasPlantings) return null;
    return calculateSufficiency(gardens, plants, familySize, gridCellSizeCm);
  }, [gardens, plants, familySize, gridCellSizeCm]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("sufficiency.title")}</h1>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Users size={20} className="text-garden-600" />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t("sufficiency.familySize")}</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={familySize}
              onChange={(e) => setFamilySize(Math.max(1, Number(e.target.value)))}
              className="w-20"
            />
          </div>
        </div>
      </Card>

      {!result ? (
        <Card>
          <p className="text-center text-gray-500">{t("sufficiency.noPlantings")}</p>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:gap-4">
            <Card className="text-center">
              <p className="text-2xl font-bold text-garden-600 sm:text-4xl">{result.totalYieldKg.toFixed(0)} kg</p>
              <p className="text-sm text-gray-500">{t("sufficiency.estimatedYield")}</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-garden-600 sm:text-4xl">{result.plantYields.length}</p>
              <p className="text-sm text-gray-500">{t("sufficiency.plantTypes")}</p>
            </Card>
          </div>

          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">{t("sufficiency.nutritionCoverage")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("sufficiency.coverageDesc", { size: familySize })}</p>
            <div className="space-y-4">
              {(["calories", "protein", "vitaminC", "fiber"] as const).map((key) => {
                const data = result.nutrition[key];
                const Icon = NUTRIENT_ICONS[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Icon size={14} />
                        {t(`sufficiency.nutrients.${key}`)}
                      </span>
                      <span className={`font-bold ${data.percent >= 50 ? "text-garden-600" : "text-amber-600"}`}>
                        {data.percent}%
                      </span>
                    </div>
                    <ProgressBar percent={data.percent} color={NUTRIENT_COLORS[key]} />
                    <p className="mt-0.5 text-xs text-gray-400">
                      {key === "calories"
                        ? `${data.produced.toLocaleString()} / ${data.needed.toLocaleString()} kcal`
                        : key === "vitaminC"
                          ? `${data.produced.toLocaleString()} / ${data.needed.toLocaleString()} mg`
                          : `${data.produced.toLocaleString()} / ${data.needed.toLocaleString()} g`}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {result.gaps.length > 0 && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle size={18} />
                {t("sufficiency.gaps")}
              </h2>
              <div className="space-y-3">
                {result.gaps.map((gap) => (
                  <div key={gap.nutrient}>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {t(`sufficiency.nutrients.${gap.nutrient}`)}: {gap.percent}% {t("sufficiency.covered")}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t("sufficiency.suggestion")}: {gap.suggestion.split(",").map((id) => {
                        const p = plantMap.get(id);
                        return p ? `${p.icon} ${t(`plants.catalog.${id}.name`)}` : id;
                      }).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp size={18} />
              {t("sufficiency.yieldByPlant")}
            </h2>
            <div className="space-y-2">
              {result.plantYields
                .sort((a, b) => b.estimatedKg - a.estimatedKg)
                .map((y) => {
                  const plant = plantMap.get(y.plantId);
                  if (!plant) return null;
                  return (
                    <div key={y.plantId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{plant.icon}</span>
                        <span className="text-sm font-medium">{t(`plants.catalog.${y.plantId}.name`)}</span>
                        <span className="text-xs text-gray-400">{y.areaM2.toFixed(1)} m²</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-semibold">{y.estimatedKg} kg</span>
                        <span className="text-gray-500">{y.calories} kcal</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <div className="mt-6">
            <PreservationGuide />
          </div>
        </>
      )}
    </div>
  );
}
