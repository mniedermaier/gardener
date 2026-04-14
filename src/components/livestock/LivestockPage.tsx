import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS, PRODUCT_ICONS, type AnimalType } from "@/types/animal";
import { AnimalCard } from "./AnimalCard";
import { ProductionChart } from "./ProductionChart";
import { format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";

const ANIMAL_TYPES: AnimalType[] = ["chicken", "duck", "rabbit", "bee", "goat", "sheep", "quail"];

export function LivestockPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const {
    animals, animalProducts, feedEntries, healthEvents,
    addAnimal, deleteAnimal,
  } = useStore(
    useShallow((s) => ({
      animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries, healthEvents: s.healthEvents,
      addAnimal: s.addAnimal, deleteAnimal: s.deleteAnimal,
    }))
  );

  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [animalType, setAnimalType] = useState<AnimalType>("chicken");
  const [animalName, setAnimalName] = useState("");
  const [animalCount, setAnimalCount] = useState("1");
  const [animalNotes, setAnimalNotes] = useState("");

  // Quick egg log
  const { addProduct } = useStore(useShallow((s) => ({ addProduct: s.addProduct })));
  const handleQuickEggs = (count: number) => {
    const chickenOrDuck = animals.find((a) => a.type === "chicken" || a.type === "duck" || a.type === "quail");
    if (!chickenOrDuck) return;
    addProduct({ animalId: chickenOrDuck.id, type: "eggs", date: format(new Date(), "yyyy-MM-dd"), quantity: count, unit: "pieces" });
    toast(`${count} ${t("livestock.products.eggs")}`, "success");
  };

  // Stats
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const stats = useMemo(() => {
    const thisWeekProducts = animalProducts.filter(
      (p) => !isBefore(parseISO(p.date), weekStart) && !isAfter(parseISO(p.date), weekEnd)
    );
    const eggsThisWeek = thisWeekProducts.filter((p) => p.type === "eggs").reduce((s, p) => s + p.quantity, 0);
    const totalAnimals = animals.reduce((s, a) => s + a.count, 0);
    const honeyThisYear = Math.round(animalProducts.filter((p) => p.type === "honey" && p.date.startsWith(String(now.getFullYear()))).reduce((s, p) => s + p.quantity, 0) * 10) / 10;
    const feedCostMonth = feedEntries
      .filter((f) => !isBefore(parseISO(f.date), monthStart) && !isAfter(parseISO(f.date), monthEnd))
      .reduce((s, f) => s + (f.cost ?? 0), 0);
    return { totalAnimals, eggsThisWeek, honeyThisYear, feedCostMonth };
  }, [animals, animalProducts, feedEntries, weekStart, weekEnd, monthStart, monthEnd, now]);

  // Precompute per-animal data for cards
  const animalMap = useMemo(() => {
    const map = new Map<string, { productCount: number; feedCost: number; healthCount: number; lastHealth?: typeof healthEvents[0] }>();
    for (const a of animals) {
      const prods = animalProducts.filter((p) => p.animalId === a.id);
      const feeds = feedEntries.filter((f) => f.animalId === a.id);
      const healths = healthEvents.filter((h) => h.animalId === a.id).sort((x, y) => y.date.localeCompare(x.date));
      map.set(a.id, {
        productCount: prods.length,
        feedCost: Math.round(feeds.reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100,
        healthCount: healths.length,
        lastHealth: healths[0],
      });
    }
    return map;
  }, [animals, animalProducts, feedEntries, healthEvents]);

  const handleAddAnimal = () => {
    addAnimal({
      type: animalType,
      name: animalName || undefined,
      count: Number(animalCount),
      acquiredDate: format(new Date(), "yyyy-MM-dd"),
      notes: animalNotes || undefined,
    });
    setAnimalName(""); setAnimalCount("1"); setAnimalNotes("");
    setShowAddAnimal(false);
    toast(t("livestock.added"), "success");
  };

  const hasEggAnimals = animals.some((a) => a.type === "chicken" || a.type === "duck" || a.type === "quail");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("livestock.title")}</h1>
        <div className="flex gap-2">
          {hasEggAnimals && (
            <div className="flex gap-1">
              {[1, 2, 3, 5, 10].map((n) => (
                <button key={n} onClick={() => handleQuickEggs(n)}
                  className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                  +{n} {PRODUCT_ICONS.eggs}
                </button>
              ))}
            </div>
          )}
          <Button size="sm" onClick={() => setShowAddAnimal(true)}>
            <Plus size={16} />
            {t("livestock.addAnimal")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalAnimals}</p>
          <p className="text-xs text-gray-500">{t("livestock.totalAnimals")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.eggsThisWeek}</p>
          <p className="text-xs text-gray-500">{t("livestock.eggsThisWeek")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-garden-600">{stats.honeyThisYear} kg</p>
          <p className="text-xs text-gray-500">{t("livestock.honeyThisYear")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-rose-600">{stats.feedCostMonth.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.feedCostMonth")}</p>
        </Card>
      </div>

      {/* Production chart */}
      {animalProducts.length > 0 && (
        <Card className="mb-4">
          <ProductionChart animalProducts={animalProducts} animals={animals} />
        </Card>
      )}

      {/* Animal cards */}
      {animals.length === 0 ? (
        <Card><p className="text-center text-gray-500">{t("livestock.noAnimals")}</p></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {animals.map((animal) => {
            const data = animalMap.get(animal.id);
            return (
              <AnimalCard
                key={animal.id}
                animal={animal}
                productCount={data?.productCount ?? 0}
                feedCost={data?.feedCost ?? 0}
                healthCount={data?.healthCount ?? 0}
                lastHealth={data?.lastHealth}
                onEdit={() => navigate(`/livestock/${animal.id}`)}
                onDelete={async () => { if (await confirm(t("common.confirmDelete"))) deleteAnimal(animal.id); }}
                onClick={() => navigate(`/livestock/${animal.id}`)}
              />
            );
          })}
        </div>
      )}

      {/* Add animal modal */}
      <Modal open={showAddAnimal} onClose={() => setShowAddAnimal(false)} title={t("livestock.addAnimal")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ANIMAL_TYPES.map((type) => (
              <button key={type} onClick={() => setAnimalType(type)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 ${animalType === type ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                <span className="text-2xl">{ANIMAL_ICONS[type]}</span>
                <span className="text-xs">{t(`livestock.types.${type}`)}</span>
              </button>
            ))}
          </div>
          <Input label={t("livestock.animalName")} value={animalName} onChange={(e) => setAnimalName(e.target.value)} placeholder={t("livestock.namePlaceholder")} />
          <Input label={t("livestock.count")} type="number" min={1} value={animalCount} onChange={(e) => setAnimalCount(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.notes")}</label>
            <textarea value={animalNotes} onChange={(e) => setAnimalNotes(e.target.value)} rows={2} placeholder={t("livestock.notesPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddAnimal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddAnimal}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
