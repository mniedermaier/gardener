import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, AlertTriangle, ShoppingCart, Package } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { SeedSource, SeedUnit } from "@/types/seed";

const CURRENT_YEAR = new Date().getFullYear();

export function SeedInventory() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { seeds, gardens, addSeed, deleteSeed } = useStore(
    useShallow((s) => ({ seeds: s.seeds, gardens: s.gardens, addSeed: s.addSeed, deleteSeed: s.deleteSeed }))
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [showAdd, setShowAdd] = useState(false);
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [variety, setVariety] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<SeedUnit>("packets");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [source, setSource] = useState<SeedSource>("shop");
  const [cost, setCost] = useState("");

  // Plants in garden that have no seeds
  const missingSeeds = useMemo(() => {
    const plantedIds = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) plantedIds.add(c.plantId);
    const seedPlantIds = new Set(seeds.map((s) => s.plantId));
    return Array.from(plantedIds).filter((id) => !seedPlantIds.has(id));
  }, [gardens, seeds]);

  // Seeds expiring soon or expired
  const expiringSeeds = useMemo(() => {
    return seeds.filter((s) => {
      const plant = plantMap.get(s.plantId);
      if (!plant?.seedSaving) return false;
      const expiryYear = s.yearAcquired + plant.seedSaving.seedViabilityYears;
      return expiryYear <= CURRENT_YEAR;
    });
  }, [seeds, plantMap]);

  const handleAdd = () => {
    if (!plantId) return;
    addSeed({
      plantId,
      variety: variety || undefined,
      quantity: Number(quantity),
      unit,
      yearAcquired: Number(year),
      source,
      cost: cost ? Number(cost) : undefined,
    });
    setVariety("");
    setQuantity("1");
    setCost("");
    setShowAdd(false);
    toast(t("seeds.added"), "success");
  };

  const totalCost = seeds.reduce((s, seed) => s + (seed.cost ?? 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("seeds.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("seeds.add")}
        </Button>
      </div>

      {/* Stats */}
      {seeds.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Card className="text-center">
            <Package size={18} className="mx-auto mb-1 text-garden-500" />
            <p className="text-xl font-bold">{seeds.length}</p>
            <p className="text-xs text-gray-500">{t("seeds.items")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-amber-600">{expiringSeeds.length}</p>
            <p className="text-xs text-gray-500">{t("seeds.expiring")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold">{totalCost.toFixed(2)} €</p>
            <p className="text-xs text-gray-500">{t("seeds.totalCost")}</p>
          </Card>
        </div>
      )}

      {/* Expiring warning */}
      {expiringSeeds.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} />
            {t("seeds.expiringTitle")}
          </h3>
          <div className="space-y-1">
            {expiringSeeds.map((s) => {
              const plant = plantMap.get(s.plantId);
              return (
                <div key={s.id} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  {plant && <PlantIconDisplay plantId={s.plantId} emoji={plant.icon} size={14} />}
                  <span>{getPlantName(s.plantId)}{s.variety ? ` (${s.variety})` : ""}</span>
                  <span className="text-amber-500">— {t("seeds.acquiredIn")} {s.yearAcquired}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Shopping list - plants without seeds */}
      {missingSeeds.length > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <ShoppingCart size={14} />
            {t("seeds.shoppingList")}
          </h3>
          <div className="flex flex-wrap gap-1">
            {missingSeeds.map((id) => {
              const plant = plantMap.get(id);
              return plant ? (
                <button
                  key={id}
                  onClick={() => { setPlantId(id); setShowAdd(true); }}
                  className="flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <PlantIconDisplay plantId={id} emoji={plant.icon} size={12} />
                  {getPlantName(id)}
                </button>
              ) : null;
            })}
          </div>
        </Card>
      )}

      {/* Seed list */}
      {seeds.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">{t("seeds.empty")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...seeds].sort((a, b) => {
            const na = getPlantName(a.plantId);
            const nb = getPlantName(b.plantId);
            return na.localeCompare(nb);
          }).map((seed) => {
            const plant = plantMap.get(seed.plantId);
            const viabilityYears = plant?.seedSaving?.seedViabilityYears ?? 4;
            const expiryYear = seed.yearAcquired + viabilityYears;
            const yearsLeft = expiryYear - CURRENT_YEAR;
            const isExpired = yearsLeft <= 0;

            return (
              <div
                key={seed.id}
                className={`flex items-center gap-3 rounded-lg border bg-white p-3 dark:bg-gray-900 ${
                  isExpired ? "border-red-200 dark:border-red-900" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {plant && <PlantIconDisplay plantId={seed.plantId} emoji={plant.icon} size={20} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {getPlantName(seed.plantId)}
                    {seed.variety && <span className="ml-1 text-gray-400">({seed.variety})</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{seed.quantity} {t(`seeds.units.${seed.unit}`)}</span>
                    <span>·</span>
                    <span>{t(`seeds.sources.${seed.source}`)}</span>
                    <span>·</span>
                    <span>{seed.yearAcquired}</span>
                    {seed.cost && <span>· {seed.cost.toFixed(2)} €</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isExpired
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : yearsLeft <= 1
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {isExpired ? t("seeds.expired") : `${yearsLeft} ${t("seeds.yearsLeft")}`}
                  </span>
                </div>
                <button
                  onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteSeed(seed.id); }}
                  className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add seed modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("seeds.add")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.plant")}</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {getPlantName(p.id)}</option>
              ))}
            </select>
          </div>
          <Input label={t("planner.variety")} value={variety} onChange={(e) => setVariety(e.target.value)} placeholder={t("planner.varietyPlaceholder")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("seeds.quantity")} type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("seeds.unit")}</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value as SeedUnit)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                {(["packets", "grams", "seeds"] as const).map((u) => (
                  <option key={u} value={u}>{t(`seeds.units.${u}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("seeds.year")} type="number" min={2020} max={2030} value={year} onChange={(e) => setYear(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("seeds.source")}</label>
              <select value={source} onChange={(e) => setSource(e.target.value as SeedSource)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                {(["shop", "saved", "traded", "gifted"] as const).map((s) => (
                  <option key={s} value={s}>{t(`seeds.sources.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label={`${t("expenses.amount")} (${t("common.optional", { defaultValue: "optional" })})`} type="number" step="0.01" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
