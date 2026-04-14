import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, Target, ShoppingCart } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Annual kg consumption targets per person (based on average European diet)
const ANNUAL_KG_TARGETS: Record<string, { kgPerPerson: number; category: string }> = {
  potato: { kgPerPerson: 30, category: "starch" },
  carrot: { kgPerPerson: 8, category: "root" },
  onion: { kgPerPerson: 10, category: "allium" },
  tomato: { kgPerPerson: 15, category: "fruit_veg" },
  cucumber: { kgPerPerson: 5, category: "fruit_veg" },
  zucchini: { kgPerPerson: 5, category: "fruit_veg" },
  pepper: { kgPerPerson: 4, category: "fruit_veg" },
  lettuce: { kgPerPerson: 5, category: "leafy" },
  cabbage: { kgPerPerson: 8, category: "brassica" },
  bean: { kgPerPerson: 5, category: "legume" },
  pea: { kgPerPerson: 3, category: "legume" },
  spinach: { kgPerPerson: 3, category: "leafy" },
  kale: { kgPerPerson: 3, category: "leafy" },
  beetroot: { kgPerPerson: 4, category: "root" },
  leek: { kgPerPerson: 3, category: "allium" },
  garlic: { kgPerPerson: 1, category: "allium" },
  pumpkin: { kgPerPerson: 5, category: "fruit_veg" },
  squash: { kgPerPerson: 5, category: "fruit_veg" },
  strawberry: { kgPerPerson: 3, category: "berry" },
  raspberry: { kgPerPerson: 1, category: "berry" },
};

interface CropPlan {
  plantId: string;
  targetKg: number;
  currentAreaM2: number;
  neededAreaM2: number;
  currentYieldKg: number;
  deficit: number;
  surplus: number;
}

export function FoodPlan() {
  const { t } = useTranslation();
  const { gardens, gridCellSizeCm } = useStore(useShallow((s) => ({ gardens: s.gardens, gridCellSizeCm: s.gridCellSizeCm })));
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const [familySize, setFamilySize] = useState(2);

  const cropPlans = useMemo(() => {
    const plans: CropPlan[] = [];
    const cellAreaM2 = (gridCellSizeCm / 100) ** 2;

    for (const [plantId, target] of Object.entries(ANNUAL_KG_TARGETS)) {
      const plant = plantMap.get(plantId);
      if (!plant) continue;

      const targetKg = Math.round(target.kgPerPerson * familySize);
      const yieldPerM2 = plant.expectedYieldKgPerM2 ?? 0;
      const neededAreaM2 = yieldPerM2 > 0 ? Math.round((targetKg / yieldPerM2) * 10) / 10 : 0;

      // Count current area
      let cellCount = 0;
      for (const g of gardens) for (const b of g.beds) cellCount += b.cells.filter((c) => c.plantId === plantId).length;
      const currentAreaM2 = Math.round(cellCount * cellAreaM2 * 10) / 10;
      const currentYieldKg = Math.round(currentAreaM2 * yieldPerM2 * 10) / 10;

      plans.push({
        plantId,
        targetKg,
        currentAreaM2,
        neededAreaM2,
        currentYieldKg,
        deficit: Math.max(0, targetKg - currentYieldKg),
        surplus: Math.max(0, currentYieldKg - targetKg),
      });
    }

    return plans.sort((a, b) => b.deficit - a.deficit);
  }, [familySize, gardens, plantMap, gridCellSizeCm]);

  const totalTargetKg = cropPlans.reduce((s, p) => s + p.targetKg, 0);
  const totalCurrentKg = cropPlans.reduce((s, p) => s + p.currentYieldKg, 0);
  const totalNeededM2 = cropPlans.reduce((s, p) => s + p.neededAreaM2, 0);
  const totalCurrentM2 = cropPlans.reduce((s, p) => s + p.currentAreaM2, 0);
  const coveragePercent = totalTargetKg > 0 ? Math.round((totalCurrentKg / totalTargetKg) * 100) : 0;
  const deficits = cropPlans.filter((p) => p.deficit > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("foodplan.title")}</h1>
        <p className="text-sm text-gray-500">{t("foodplan.subtitle")}</p>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Users size={20} className="text-garden-600" />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t("sufficiency.familySize")}</label>
            <Input type="number" min={1} max={20} value={familySize} onChange={(e) => setFamilySize(Math.max(1, Number(e.target.value)))} className="w-20" />
          </div>
        </div>
      </Card>

      {/* Overview stats */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-garden-600">{coveragePercent}%</p>
          <p className="text-xs text-gray-500">{t("foodplan.coverage")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{totalCurrentKg}<span className="text-sm text-gray-400">/{totalTargetKg} kg</span></p>
          <p className="text-xs text-gray-500">{t("foodplan.produced")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{totalCurrentM2}<span className="text-sm text-gray-400">/{totalNeededM2} m²</span></p>
          <p className="text-xs text-gray-500">{t("foodplan.area")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${deficits.length > 0 ? "text-amber-600" : "text-green-600"}`}>{deficits.length}</p>
          <p className="text-xs text-gray-500">{t("foodplan.deficits")}</p>
        </Card>
      </div>

      {/* Deficits warning */}
      {deficits.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <ShoppingCart size={14} />
            {t("foodplan.deficitsTitle")}
          </h2>
          <div className="space-y-1">
            {deficits.slice(0, 5).map((p) => {
              const plant = plantMap.get(p.plantId);
              if (!plant) return null;
              const additionalM2 = Math.round((p.deficit / (plant.expectedYieldKgPerM2 ?? 1)) * 10) / 10;
              return (
                <div key={p.plantId} className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <PlantIconDisplay plantId={p.plantId} emoji={plant.icon} size={14} />
                    {getPlantName(p.plantId)}
                  </span>
                  <span>{t("foodplan.needMore", { kg: p.deficit, m2: additionalM2 })}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Crop plan table */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Target size={18} />
          {t("foodplan.cropPlan")}
        </h2>
        <div className="space-y-1.5">
          {cropPlans.map((plan) => {
            const plant = plantMap.get(plan.plantId);
            if (!plant) return null;
            const percent = plan.targetKg > 0 ? Math.min(100, Math.round((plan.currentYieldKg / plan.targetKg) * 100)) : 0;
            return (
              <div key={plan.plantId} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <PlantIconDisplay plantId={plan.plantId} emoji={plant.icon} size={18} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{getPlantName(plan.plantId)}</span>
                    <span className={`text-xs font-bold ${percent >= 100 ? "text-green-600" : percent >= 50 ? "text-amber-600" : "text-red-600"}`}>{percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full ${percent >= 100 ? "bg-green-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
                    <span>{plan.currentYieldKg} / {plan.targetKg} kg</span>
                    <span>{plan.currentAreaM2} / {plan.neededAreaM2} m²</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
