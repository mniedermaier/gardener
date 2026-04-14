import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Star, TrendingUp } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { format } from "date-fns";

export function HarvestLog() {
  const { t } = useTranslation();
  const { confirm } = useToast();
  const { harvests, gardens, addHarvest, deleteHarvest } = useStore(useShallow((s) => ({ harvests: s.harvests, gardens: s.gardens, addHarvest: s.addHarvest, deleteHarvest: s.deleteHarvest })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const [showAdd, setShowAdd] = useState(false);
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [gardenId, setGardenId] = useState(gardens[0]?.id ?? "");
  const [bedId, setBedId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [count, setCount] = useState("");
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  const selectedGarden = gardens.find((g) => g.id === gardenId);

  const stats = useMemo(() => {
    const byPlant = new Map<string, { weight: number; count: number; entries: number; qualitySum: number }>();
    for (const h of harvests) {
      const existing = byPlant.get(h.plantId) ?? { weight: 0, count: 0, entries: 0, qualitySum: 0 };
      existing.weight += h.weightGrams ?? 0;
      existing.count += h.count ?? 0;
      existing.entries += 1;
      existing.qualitySum += h.quality;
      byPlant.set(h.plantId, existing);
    }
    return byPlant;
  }, [harvests]);

  const totalWeight = harvests.reduce((sum, h) => sum + (h.weightGrams ?? 0), 0);

  const handleAdd = () => {
    if (!plantId) return;
    addHarvest({
      gardenId: gardenId || gardens[0]?.id || "",
      bedId: bedId || "",
      plantId,
      date,
      weightGrams: weight ? Number(weight) : undefined,
      count: count ? Number(count) : undefined,
      quality,
      notes: notes || undefined,
    });
    setWeight("");
    setCount("");
    setNotes("");
    setShowAdd(false);
  };

  const sortedHarvests = [...harvests].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("harvest.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("harvest.add")}
        </Button>
      </div>

      {harvests.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          <Card className="text-center">
            <p className="text-xl font-bold text-garden-600 sm:text-3xl">{harvests.length}</p>
            <p className="text-xs text-gray-500">{t("harvest.entries")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-garden-600 sm:text-3xl">
              {totalWeight >= 1000 ? `${(totalWeight / 1000).toFixed(1)} kg` : `${totalWeight} g`}
            </p>
            <p className="text-xs text-gray-500">{t("harvest.totalWeight")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-amber-500 sm:text-3xl">
              {(harvests.reduce((s, h) => s + h.quality, 0) / harvests.length).toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">{t("harvest.avgQuality")}</p>
          </Card>
        </div>
      )}

      {stats.size > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
            <TrendingUp size={14} /> {t("harvest.total")}
          </h2>
          <div className="space-y-2">
            {Array.from(stats.entries())
              .sort((a, b) => b[1].weight - a[1].weight)
              .map(([pid, s]) => {
                const plant = plantMap.get(pid);
                if (!plant) return null;
                return (
                  <div key={pid} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <PlantIconDisplay plantId={pid} emoji={plant.icon} size={20} />
                      <span className="text-sm font-medium">{t(`plants.catalog.${pid}.name`)}</span>
                      <span className="text-xs text-gray-400">({s.entries}x)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {s.weight > 0 && (
                        <span className="font-medium">
                          {s.weight >= 1000 ? `${(s.weight / 1000).toFixed(1)} kg` : `${s.weight} g`}
                        </span>
                      )}
                      {s.count > 0 && <span className="text-gray-500">{s.count} St.</span>}
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star size={12} fill="currentColor" />
                        {(s.qualitySum / s.entries).toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {sortedHarvests.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">{t("harvest.noEntries")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedHarvests.map((h) => {
            const plant = plantMap.get(h.plantId);
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="text-xl">{plant ? <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={24} /> : "?"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {plant ? t(`plants.catalog.${h.plantId}.name`) : h.plantId}
                  </p>
                  <p className="text-xs text-gray-400">{h.date}</p>
                  {h.notes && <p className="mt-0.5 text-xs text-gray-500">{h.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                  {h.weightGrams && (
                    <span className="font-medium">
                      {h.weightGrams >= 1000 ? `${(h.weightGrams / 1000).toFixed(1)} kg` : `${h.weightGrams} g`}
                    </span>
                  )}
                  {h.count && <span className="text-gray-500">{h.count} St.</span>}
                  <div className="flex text-amber-400">
                    {Array.from({ length: h.quality }, (_, i) => (
                      <Star key={i} size={10} fill="currentColor" />
                    ))}
                  </div>
                  <button
                    onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteHarvest(h.id); }}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("harvest.add")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.plant")}</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {t(`plants.catalog.${p.id}.name`)}</option>
              ))}
            </select>
          </div>
          {gardens.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.bed")}</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={gardenId}
                  onChange={(e) => { setGardenId(e.target.value); setBedId(""); }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {gardens.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">--</option>
                  {selectedGarden?.beds.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <Input label={t("harvest.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t("harvest.weight")} type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} />
            <Input label={t("harvest.count")} type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.quality")}</label>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className="rounded p-1 transition-colors"
                >
                  <Star size={24} className={q <= quality ? "text-amber-400" : "text-gray-300"} fill={q <= quality ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>
          <Input label={t("harvest.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
