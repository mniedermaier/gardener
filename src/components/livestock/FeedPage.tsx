import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Filter } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS } from "@/types/animal";
import { format, startOfMonth, endOfMonth, parseISO, isAfter, isBefore, subMonths } from "date-fns";

export function FeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { animals, feedEntries, addFeedEntry, deleteFeedEntry } = useStore(
    useShallow((s) => ({ animals: s.animals, feedEntries: s.feedEntries, addFeedEntry: s.addFeedEntry, deleteFeedEntry: s.deleteFeedEntry }))
  );

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [feedAnimalId, setFeedAnimalId] = useState("");
  const [feedType, setFeedType] = useState("");
  const [feedQty, setFeedQty] = useState("");
  const [feedUnit, setFeedUnit] = useState<"kg" | "g" | "liters">("kg");
  const [feedCost, setFeedCost] = useState("");
  const [feedDate, setFeedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [feedNotes, setFeedNotes] = useState("");

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const filtered = useMemo(() => {
    let items = feedEntries;
    if (filterAnimalId) items = items.filter((f) => f.animalId === filterAnimalId);
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }, [feedEntries, filterAnimalId]);

  const stats = useMemo(() => {
    const thisMonth = feedEntries.filter((f) => !isBefore(parseISO(f.date), monthStart) && !isAfter(parseISO(f.date), monthEnd));
    const prevMonth = feedEntries.filter((f) => !isBefore(parseISO(f.date), prevMonthStart) && !isAfter(parseISO(f.date), prevMonthEnd));
    const costThisMonth = Math.round(thisMonth.reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100;
    const costPrevMonth = Math.round(prevMonth.reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100;
    const totalCost = Math.round(feedEntries.reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100;
    const totalKg = Math.round(feedEntries.filter((f) => f.unit === "kg").reduce((s, f) => s + f.quantity, 0) * 10) / 10;

    // Per-animal cost breakdown
    const perAnimal = new Map<string, number>();
    for (const f of feedEntries) {
      perAnimal.set(f.animalId, (perAnimal.get(f.animalId) ?? 0) + (f.cost ?? 0));
    }

    return { costThisMonth, costPrevMonth, totalCost, totalKg, perAnimal };
  }, [feedEntries, monthStart, monthEnd, prevMonthStart, prevMonthEnd]);

  const handleAdd = () => {
    if (!feedAnimalId || !feedQty || !feedType) return;
    addFeedEntry({ animalId: feedAnimalId, date: feedDate, feedType, quantity: Number(feedQty), unit: feedUnit, cost: feedCost ? Number(feedCost) : undefined, notes: feedNotes || undefined });
    setFeedQty(""); setFeedType(""); setFeedCost(""); setFeedNotes(""); setShowAdd(false);
    toast(t("livestock.feedAdded"), "success");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("livestock.feed.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {t("livestock.addFeed")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-rose-600">{stats.costThisMonth.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.feed.thisMonth")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-gray-500">{stats.costPrevMonth.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.feed.lastMonth")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalCost.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.feed.totalCost")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalKg} kg</p>
          <p className="text-xs text-gray-500">{t("livestock.feed.totalKg")}</p>
        </Card>
      </div>

      {/* Per-animal cost breakdown */}
      {stats.perAnimal.size > 1 && (
        <Card className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">{t("livestock.feed.perAnimal")}</h2>
          <div className="space-y-1">
            {[...stats.perAnimal.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([animalId, cost]) => {
                const animal = animalMap.get(animalId);
                if (!animal) return null;
                const pct = stats.totalCost > 0 ? Math.round((cost / stats.totalCost) * 100) : 0;
                return (
                  <div key={animalId} className="flex items-center gap-2">
                    <button onClick={() => navigate(`/livestock/${animalId}`)} className="flex items-center gap-1.5 text-xs hover:underline">
                      {ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}
                    </button>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500">{Math.round(cost * 100) / 100} € ({pct}%)</span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Filter */}
      {animals.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <option value="">{t("livestock.allAnimals")}</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card><p className="text-center text-gray-500">{t("livestock.noFeed")}</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const animal = animalMap.get(entry.animalId);
            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-lg">🌾</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{entry.quantity} {entry.unit} {entry.feedType}</p>
                  <p className="text-xs text-gray-400">
                    {animal && (
                      <button onClick={() => navigate(`/livestock/${animal.id}`)} className="hover:underline">
                        {ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}
                      </button>
                    )}
                    {" · "}{entry.date}
                    {entry.cost ? ` · ${entry.cost.toFixed(2)} €` : ""}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteFeedEntry(entry.id); }}
                  className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("livestock.addFeed")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={feedAnimalId} onChange={(e) => setFeedAnimalId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
          <Input label={t("livestock.feedType")} value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder={t("livestock.feedTypePlaceholder")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("livestock.quantity")} type="number" min={0} step={0.1} value={feedQty} onChange={(e) => setFeedQty(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.unit")}</label>
              <select value={feedUnit} onChange={(e) => setFeedUnit(e.target.value as "kg" | "g" | "liters")}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                <option value="kg">kg</option><option value="g">g</option><option value="liters">{t("livestock.liters")}</option>
              </select>
            </div>
          </div>
          <Input label={t("livestock.feedCost")} type="number" min={0} step={0.01} value={feedCost} onChange={(e) => setFeedCost(e.target.value)} placeholder="0.00" />
          <Input label={t("harvest.date")} type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} />
          <Input label={t("harvest.notes")} value={feedNotes} onChange={(e) => setFeedNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
