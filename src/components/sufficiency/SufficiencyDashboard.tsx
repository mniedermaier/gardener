import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, TrendingUp, AlertCircle, Apple, Beef, Citrus, Wheat, Snowflake, Archive, Bird } from "lucide-react";
import { ANIMAL_ICONS, PRODUCT_ICONS } from "@/types/animal";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
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
  const { t, i18n } = useTranslation();
  const { gardens, gridCellSizeCm, lastFrostDate, animals, animalProducts } = useStore(useShallow((s) => ({ gardens: s.gardens, gridCellSizeCm: s.gridCellSizeCm, lastFrostDate: s.lastFrostDate, animals: s.animals, animalProducts: s.animalProducts })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const [familySize, setFamilySize] = useState(2);

  const result: SufficiencyResult | null = useMemo(() => {
    const hasPlantings = gardens.some((g) => g.beds.some((b) => b.cells.length > 0));
    const hasAnimals = animals.length > 0;
    if (!hasPlantings && !hasAnimals) return null;
    return calculateSufficiency(gardens, plants, familySize, gridCellSizeCm, lastFrostDate, animals, animalProducts);
  }, [gardens, plants, familySize, gridCellSizeCm, lastFrostDate, animals, animalProducts]);

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
                      {t("sufficiency.suggestion")}:{" "}
                      {gap.suggestion.split(",").map((id, i, arr) => {
                        const p = plantMap.get(id);
                        return p ? (
                          <span key={id} className="inline-flex items-center gap-0.5">
                            <PlantIconDisplay plantId={id} emoji={p.icon} size={14} />
                            {t(`plants.catalog.${id}.name`)}{i < arr.length - 1 ? ", " : ""}
                          </span>
                        ) : id;
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Monthly Food Calendar */}
          <Card className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">{t("sufficiency.monthlyTitle")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("sufficiency.monthlyDesc", { size: familySize })}</p>
            <div className="mb-2 text-right text-xs text-gray-400">
              {t("sufficiency.annualCoverage")}: <span className="font-bold">{result.annualCoveragePercent}%</span>
            </div>
            <div className="flex items-end gap-1" style={{ height: "140px" }}>
              {result.monthlyFood.map((m) => {
                const monthNames = i18n.language === "de"
                  ? ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"]
                  : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const maxKg = Math.max(...result.monthlyFood.map((f) => Math.max(f.totalKg, 1)));
                const freshH = (m.freshKg / maxKg) * 100;
                const storedH = (m.storedKg / maxKg) * 100;
                const isLow = m.coveragePercent < 25;
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-0.5">
                    <span className={`text-[9px] font-medium ${isLow ? "text-red-500" : "text-gray-500"}`}>{m.coveragePercent}%</span>
                    <div className="flex w-full flex-col items-center" style={{ height: "100px" }}>
                      <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                        {m.storedKg > 0 && (
                          <div className="w-full rounded-t bg-amber-400 dark:bg-amber-600" style={{ height: `${storedH}%` }} title={`${t("sufficiency.stored")}: ${m.storedKg} kg`} />
                        )}
                        {m.freshKg > 0 && (
                          <div className={`w-full ${m.storedKg > 0 ? "" : "rounded-t"} bg-garden-500`} style={{ height: `${freshH}%` }} title={`${t("sufficiency.fresh")}: ${m.freshKg} kg`} />
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] ${isLow ? "font-bold text-red-500" : "text-gray-400"}`}>{monthNames[m.month]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-garden-500" /> {t("sufficiency.fresh")}</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> {t("sufficiency.stored")}</span>
            </div>
          </Card>

          {/* Winter Gap Warning */}
          {result.winterGap && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-blue-800 dark:text-blue-300">
                <Snowflake size={18} />
                {t("sufficiency.winterGap")}
              </h2>
              <p className="mb-3 text-sm text-blue-700 dark:text-blue-400">
                {t("sufficiency.winterGapDesc", {
                  months: result.winterGap.months.map((m) => {
                    const names = i18n.language === "de"
                      ? ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]
                      : ["January","February","March","April","May","June","July","August","September","October","November","December"];
                    return names[m];
                  }).join(", "),
                  kg: result.winterGap.storedKgNeeded,
                })}
              </p>
            </Card>
          )}

          {/* Storage Requirements */}
          {result.storageRequirements.length > 0 && (
            <Card className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Archive size={18} />
                {t("sufficiency.storageTitle")}
              </h2>
              <div className="space-y-2">
                {result.storageRequirements.map((s, i) => {
                  const plant = plantMap.get(s.plantId);
                  return (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                      <div className="flex items-center gap-2">
                        {plant && <PlantIconDisplay plantId={s.plantId} emoji={plant.icon} size={16} />}
                        <span className="text-sm font-medium">{plant ? t(`plants.catalog.${s.plantId}.name`) : s.plantId}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-medium">{s.quantityKg} kg</span>
                        <span>{t(`preservation.methods.${s.method}`)}</span>
                        <span>{s.shelfLifeMonths} {t("sufficiency.months")}</span>
                      </div>
                    </div>
                  );
                })}
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
                        <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={20} />
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

          {/* Animal Yields */}
          {result.animalYields.length > 0 && (
            <Card className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Bird size={18} />
                {t("sufficiency.animalYields")}
              </h2>
              <div className="space-y-2">
                {result.animalYields.map((y, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ANIMAL_ICONS[y.animalType as keyof typeof ANIMAL_ICONS]}</span>
                      <span className="text-sm font-medium">
                        {PRODUCT_ICONS[y.productType as keyof typeof PRODUCT_ICONS]} {t(`livestock.products.${y.productType}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold">{y.quantityKg} kg</span>
                      <span className="text-gray-500">{y.calories} kcal</span>
                      <span className="text-gray-500">{y.proteinG}g {t("sufficiency.nutrients.protein")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="mt-6">
            <PreservationGuide />
          </div>
        </>
      )}
    </div>
  );
}
