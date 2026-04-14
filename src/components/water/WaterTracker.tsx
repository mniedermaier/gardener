import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Droplets, Trash2, Plus } from "lucide-react";
import { useStore } from "@/store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { startOfWeek, startOfMonth, isWithinInterval, parseISO } from "date-fns";

const METHODS = ["manual", "hose", "drip", "sprinkler", "rain"] as const;

export function WaterTracker() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { waterEntries, addWaterEntry, deleteWaterEntry, gardens } = useStore(
    useShallow((s) => ({
      waterEntries: s.waterEntries,
      addWaterEntry: s.addWaterEntry,
      deleteWaterEntry: s.deleteWaterEntry,
      gardens: s.gardens,
    })),
  );

  const allBeds = useMemo(
    () => gardens.flatMap((g) => g.beds.map((b) => ({ id: b.id, name: b.name, gardenId: g.id, gardenName: g.name }))),
    [gardens],
  );

  const [selectedBedId, setSelectedBedId] = useState(allBeds[0]?.id ?? "");
  const [liters, setLiters] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("manual");
  const [duration, setDuration] = useState("");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const weekTotal = useMemo(
    () =>
      waterEntries
        .filter((e) => {
          const d = parseISO(e.date);
          return isWithinInterval(d, { start: weekStart, end: now });
        })
        .reduce((sum, e) => sum + e.liters, 0),
    [waterEntries, weekStart, now],
  );

  const monthTotal = useMemo(
    () =>
      waterEntries
        .filter((e) => {
          const d = parseISO(e.date);
          return isWithinInterval(d, { start: monthStart, end: now });
        })
        .reduce((sum, e) => sum + e.liters, 0),
    [waterEntries, monthStart, now],
  );

  const recentEntries = useMemo(
    () => [...waterEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [waterEntries],
  );

  const handleAdd = () => {
    const litersNum = parseFloat(liters);
    if (!selectedBedId || isNaN(litersNum) || litersNum <= 0) return;

    const bed = allBeds.find((b) => b.id === selectedBedId);
    if (!bed) return;

    addWaterEntry({
      bedId: selectedBedId,
      gardenId: bed.gardenId,
      date: new Date().toISOString(),
      liters: litersNum,
      method,
      duration: duration ? parseInt(duration, 10) : undefined,
    });

    setLiters("");
    setDuration("");
    toast(t("water.added"));
  };

  const getBedLabel = (gardenId: string, bedId: string) => {
    const bed = allBeds.find((b) => b.id === bedId && b.gardenId === gardenId);
    if (!bed) return bedId;
    return `${bed.gardenName} — ${bed.name}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Droplets className="h-7 w-7 text-sky-500" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t("water.title")}</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("water.thisWeek")}</p>
          <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{weekTotal.toFixed(1)} {t("water.liters")}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("water.thisMonth")}</p>
          <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{monthTotal.toFixed(1)} {t("water.liters")}</p>
        </Card>
      </div>

      {/* Quick-add form */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">{t("water.add")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("planner.bed")}
            </label>
            <select
              value={selectedBedId}
              onChange={(e) => setSelectedBedId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {allBeds.map((b) => (
                <option key={`${b.gardenId}-${b.id}`} value={b.id}>
                  {b.gardenName} — {b.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label={t("water.liters")}
            type="number"
            min="0"
            step="0.1"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            placeholder="10"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("water.method")}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{t(`water.methods.${m}`)}</option>
              ))}
            </select>
          </div>
          <Input
            label={`${t("water.duration")} (${t("water.minutes")})`}
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="15"
          />
        </div>
        <div className="mt-4">
          <Button onClick={handleAdd} disabled={!selectedBedId || !liters}>
            <Plus size={16} />
            {t("water.add")}
          </Button>
        </div>
      </Card>

      {/* Recent entries */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">{t("water.title")}</h2>
        {recentEntries.length === 0 ? (
          <p className="text-sm text-gray-400">{t("water.noEntries")}</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {getBedLabel(entry.gardenId, entry.bedId)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.date).toLocaleDateString()} — {entry.liters} {t("water.liters")} — {t(`water.methods.${entry.method}`)}
                    {entry.duration ? ` — ${entry.duration} ${t("water.minutes")}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => deleteWaterEntry(entry.id)}
                  className="ml-2 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title={t("common.delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
