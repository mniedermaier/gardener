import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Egg, Wheat, Heart, Pencil, Filter } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS, PRODUCT_ICONS, ANNUAL_YIELD, type AnimalType, type ProductType, type HealthEventType } from "@/types/animal";
import { format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";

const ANIMAL_TYPES: AnimalType[] = ["chicken", "duck", "rabbit", "bee"];
const PRODUCT_TYPES_BY_ANIMAL: Record<AnimalType, ProductType[]> = {
  chicken: ["eggs"],
  duck: ["eggs"],
  rabbit: ["meat"],
  bee: ["honey", "wax"],
};

const HEALTH_EVENT_TYPES: HealthEventType[] = ["vaccination", "deworming", "illness", "injury", "checkup", "treatment", "death", "other"];
const HEALTH_ICONS: Record<HealthEventType, string> = {
  vaccination: "💉", deworming: "💊", illness: "🤒", injury: "🩹",
  checkup: "🩺", treatment: "💊", death: "✝️", other: "📋",
};

export function LivestockPage() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const {
    animals, animalProducts, feedEntries, healthEvents,
    addAnimal, updateAnimal, deleteAnimal, addProduct, deleteProduct,
    addFeedEntry, deleteFeedEntry, addHealthEvent, deleteHealthEvent,
  } = useStore(
    useShallow((s) => ({
      animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries, healthEvents: s.healthEvents,
      addAnimal: s.addAnimal, updateAnimal: s.updateAnimal, deleteAnimal: s.deleteAnimal,
      addProduct: s.addProduct, deleteProduct: s.deleteProduct,
      addFeedEntry: s.addFeedEntry, deleteFeedEntry: s.deleteFeedEntry,
      addHealthEvent: s.addHealthEvent, deleteHealthEvent: s.deleteHealthEvent,
    }))
  );

  const [tab, setTab] = useState<"animals" | "production" | "feed" | "health">("animals");
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddHealth, setShowAddHealth] = useState(false);
  const [editAnimalId, setEditAnimalId] = useState<string | null>(null);
  const [filterAnimalId, setFilterAnimalId] = useState<string>("");

  // Add animal form
  const [animalType, setAnimalType] = useState<AnimalType>("chicken");
  const [animalName, setAnimalName] = useState("");
  const [animalCount, setAnimalCount] = useState("1");
  const [animalNotes, setAnimalNotes] = useState("");

  // Edit animal form
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Add product form
  const [prodAnimalId, setProdAnimalId] = useState("");
  const [prodType, setProdType] = useState<ProductType>("eggs");
  const [prodQuantity, setProdQuantity] = useState("");
  const [prodDate, setProdDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [prodNotes, setProdNotes] = useState("");

  // Add feed form
  const [feedAnimalId, setFeedAnimalId] = useState("");
  const [feedType, setFeedType] = useState("");
  const [feedQuantity, setFeedQuantity] = useState("");
  const [feedUnit, setFeedUnit] = useState<"kg" | "g" | "liters">("kg");
  const [feedCost, setFeedCost] = useState("");
  const [feedDate, setFeedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [feedNotes, setFeedNotes] = useState("");

  // Add health form
  const [healthAnimalId, setHealthAnimalId] = useState("");
  const [healthType, setHealthType] = useState<HealthEventType>("checkup");
  const [healthDesc, setHealthDesc] = useState("");
  const [healthCost, setHealthCost] = useState("");
  const [healthDate, setHealthDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [healthNotes, setHealthNotes] = useState("");

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

  // Filtered lists
  const filteredProducts = filterAnimalId
    ? animalProducts.filter((p) => p.animalId === filterAnimalId)
    : animalProducts;
  const filteredFeed = filterAnimalId
    ? feedEntries.filter((f) => f.animalId === filterAnimalId)
    : feedEntries;
  const filteredHealth = filterAnimalId
    ? healthEvents.filter((h) => h.animalId === filterAnimalId)
    : healthEvents;

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

  const openEditAnimal = (id: string) => {
    const animal = animals.find((a) => a.id === id);
    if (!animal) return;
    setEditAnimalId(id);
    setEditName(animal.name ?? "");
    setEditCount(String(animal.count));
    setEditNotes(animal.notes ?? "");
  };

  const handleEditAnimal = () => {
    if (!editAnimalId) return;
    updateAnimal(editAnimalId, {
      name: editName || undefined,
      count: Number(editCount),
      notes: editNotes || undefined,
    });
    setEditAnimalId(null);
    toast(t("livestock.updated"), "success");
  };

  const handleAddProduct = () => {
    if (!prodAnimalId || !prodQuantity) return;
    addProduct({
      animalId: prodAnimalId, type: prodType, date: prodDate,
      quantity: Number(prodQuantity), unit: prodType === "eggs" ? "pieces" : "kg",
      notes: prodNotes || undefined,
    });
    setProdQuantity(""); setProdNotes("");
    setShowAddProduct(false);
    toast(t("livestock.productAdded"), "success");
  };

  const handleAddFeed = () => {
    if (!feedAnimalId || !feedQuantity || !feedType) return;
    addFeedEntry({
      animalId: feedAnimalId, date: feedDate, feedType: feedType,
      quantity: Number(feedQuantity), unit: feedUnit,
      cost: feedCost ? Number(feedCost) : undefined,
      notes: feedNotes || undefined,
    });
    setFeedQuantity(""); setFeedType(""); setFeedCost(""); setFeedNotes("");
    setShowAddFeed(false);
    toast(t("livestock.feedAdded"), "success");
  };

  const handleAddHealth = () => {
    if (!healthAnimalId || !healthDesc) return;
    addHealthEvent({
      animalId: healthAnimalId, date: healthDate, type: healthType,
      description: healthDesc,
      cost: healthCost ? Number(healthCost) : undefined,
      notes: healthNotes || undefined,
    });
    setHealthDesc(""); setHealthCost(""); setHealthNotes("");
    setShowAddHealth(false);
    toast(t("livestock.healthAdded"), "success");
  };

  const handleQuickEggs = (count: number) => {
    const chickenOrDuck = animals.find((a) => a.type === "chicken" || a.type === "duck");
    if (!chickenOrDuck) return;
    addProduct({
      animalId: chickenOrDuck.id, type: "eggs",
      date: format(new Date(), "yyyy-MM-dd"), quantity: count, unit: "pieces",
    });
    toast(`${count} ${t("livestock.products.eggs")}`, "success");
  };

  const addButton = () => {
    if (tab === "animals") setShowAddAnimal(true);
    else if (tab === "production") setShowAddProduct(true);
    else if (tab === "feed") setShowAddFeed(true);
    else setShowAddHealth(true);
  };

  const addLabel = tab === "animals" ? t("livestock.addAnimal") : tab === "production" ? t("livestock.addProduct") : tab === "feed" ? t("livestock.addFeed") : t("livestock.addHealth");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("livestock.title")}</h1>
        <div className="flex gap-2">
          {tab === "production" && animals.some((a) => a.type === "chicken" || a.type === "duck") && (
            <div className="flex gap-1">
              {[1, 2, 3, 5, 10].map((n) => (
                <button key={n} onClick={() => handleQuickEggs(n)}
                  className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                  +{n} {PRODUCT_ICONS.eggs}
                </button>
              ))}
            </div>
          )}
          <Button size="sm" onClick={addButton}>
            <Plus size={16} />
            {addLabel}
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

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setTab("animals")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "animals" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          {t("livestock.animalsTab")} ({animals.length})
        </button>
        <button onClick={() => setTab("production")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "production" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Egg size={14} className="mr-1 inline" />
          {t("livestock.productionTab")} ({animalProducts.length})
        </button>
        <button onClick={() => setTab("feed")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "feed" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Wheat size={14} className="mr-1 inline" />
          {t("livestock.feedTab")} ({feedEntries.length})
        </button>
        <button onClick={() => setTab("health")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "health" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Heart size={14} className="mr-1 inline" />
          {t("livestock.healthTab")} ({healthEvents.length})
        </button>
      </div>

      {/* Animal filter (for production/feed/health tabs) */}
      {tab !== "animals" && animals.length > 1 && (
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

      {/* Animals tab */}
      {tab === "animals" && (
        animals.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noAnimals")}</p></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {animals.map((animal) => {
              const yields = ANNUAL_YIELD[animal.type];
              const animalFeedCost = Math.round(feedEntries.filter((f) => f.animalId === animal.id).reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100;
              const animalProductCount = animalProducts.filter((p) => p.animalId === animal.id).length;
              const animalHealthCount = healthEvents.filter((h) => h.animalId === animal.id).length;
              const lastHealth = healthEvents.filter((h) => h.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <Card key={animal.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ANIMAL_ICONS[animal.type]}</span>
                      <div>
                        <h3 className="font-semibold">{animal.name || t(`livestock.types.${animal.type}`)}</h3>
                        <p className="text-sm text-gray-500">
                          {animal.count}× {t(`livestock.types.${animal.type}`)}
                          <span className="ml-2 text-xs text-gray-400">{t("livestock.since")} {animal.acquiredDate}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                          {yields.map((y) => (
                            <span key={y.product}>
                              {PRODUCT_ICONS[y.product]} ~{y.quantity * animal.count} {y.unit}/{t("livestock.year")}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                          <span>{t("livestock.productionEntries", { count: animalProductCount })}</span>
                          {animalFeedCost > 0 && <span>{t("livestock.feedTotal")}: {animalFeedCost.toFixed(2)} €</span>}
                          {animalHealthCount > 0 && <span>🩺 {animalHealthCount}</span>}
                        </div>
                        {animal.notes && <p className="mt-1 text-xs italic text-gray-400">{animal.notes}</p>}
                        {lastHealth && (
                          <p className="mt-1 text-xs text-gray-400">
                            {HEALTH_ICONS[lastHealth.type]} {t(`livestock.healthTypes.${lastHealth.type}`)} · {lastHealth.date}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditAnimal(animal.id)}
                        className="rounded p-1 text-gray-300 hover:text-garden-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteAnimal(animal.id); }}
                        className="rounded p-1 text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Production tab */}
      {tab === "production" && (
        filteredProducts.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noProducts")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...filteredProducts].sort((a, b) => b.date.localeCompare(a.date)).map((prod) => {
              const animal = animals.find((a) => a.id === prod.animalId);
              return (
                <div key={prod.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <span className="text-lg">{PRODUCT_ICONS[prod.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {prod.quantity} {prod.unit === "pieces" ? t("livestock.pieces") : prod.unit} {t(`livestock.products.${prod.type}`)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {animal ? `${ANIMAL_ICONS[animal.type]} ${animal.name || t(`livestock.types.${animal.type}`)}` : ""} · {prod.date}
                    </p>
                    {prod.notes && <p className="mt-0.5 text-xs text-gray-400">{prod.notes}</p>}
                  </div>
                  <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteProduct(prod.id); }}
                    className="rounded p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Feed tab */}
      {tab === "feed" && (
        filteredFeed.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noFeed")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...filteredFeed].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
              const animal = animals.find((a) => a.id === entry.animalId);
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <span className="text-lg">🌾</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{entry.quantity} {entry.unit} {entry.feedType}</p>
                    <p className="text-xs text-gray-400">
                      {animal ? `${ANIMAL_ICONS[animal.type]} ${animal.name || t(`livestock.types.${animal.type}`)}` : ""} · {entry.date}
                      {entry.cost ? ` · ${entry.cost.toFixed(2)} €` : ""}
                    </p>
                    {entry.notes && <p className="mt-0.5 text-xs text-gray-400">{entry.notes}</p>}
                  </div>
                  <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteFeedEntry(entry.id); }}
                    className="rounded p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Health tab */}
      {tab === "health" && (
        filteredHealth.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noHealth")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...filteredHealth].sort((a, b) => b.date.localeCompare(a.date)).map((event) => {
              const animal = animals.find((a) => a.id === event.animalId);
              return (
                <div key={event.id} className={`flex items-center gap-3 rounded-lg border p-3 ${event.type === "death" ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                  <span className="text-lg">{HEALTH_ICONS[event.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t(`livestock.healthTypes.${event.type}`)} — {event.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {animal ? `${ANIMAL_ICONS[animal.type]} ${animal.name || t(`livestock.types.${animal.type}`)}` : ""} · {event.date}
                      {event.cost ? ` · ${event.cost.toFixed(2)} €` : ""}
                    </p>
                    {event.notes && <p className="mt-0.5 text-xs text-gray-400">{event.notes}</p>}
                  </div>
                  <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteHealthEvent(event.id); }}
                    className="rounded p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )
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

      {/* Edit animal modal */}
      <Modal open={editAnimalId !== null} onClose={() => setEditAnimalId(null)} title={t("livestock.editAnimal")}>
        <div className="space-y-4">
          <Input label={t("livestock.animalName")} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("livestock.namePlaceholder")} />
          <Input label={t("livestock.count")} type="number" min={0} value={editCount} onChange={(e) => setEditCount(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.notes")}</label>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditAnimalId(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleEditAnimal}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add product modal */}
      <Modal open={showAddProduct} onClose={() => setShowAddProduct(false)} title={t("livestock.addProduct")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={prodAnimalId} onChange={(e) => {
              setProdAnimalId(e.target.value);
              const a = animals.find((x) => x.id === e.target.value);
              if (a) setProdType(PRODUCT_TYPES_BY_ANIMAL[a.type][0]);
            }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
          {prodAnimalId && (() => {
            const animal = animals.find((a) => a.id === prodAnimalId);
            if (!animal) return null;
            const types = PRODUCT_TYPES_BY_ANIMAL[animal.type];
            return (
              <div className="flex gap-2">
                {types.map((type) => (
                  <button key={type} onClick={() => setProdType(type)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm ${prodType === type ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                    {PRODUCT_ICONS[type]} {t(`livestock.products.${type}`)}
                  </button>
                ))}
              </div>
            );
          })()}
          <Input label={t("livestock.quantity")} type="number" min={1} step={prodType === "eggs" ? 1 : 0.1} value={prodQuantity} onChange={(e) => setProdQuantity(e.target.value)} />
          <Input label={t("harvest.date")} type="date" value={prodDate} onChange={(e) => setProdDate(e.target.value)} />
          <Input label={t("harvest.notes")} value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddProduct(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddProduct}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add feed modal */}
      <Modal open={showAddFeed} onClose={() => setShowAddFeed(false)} title={t("livestock.addFeed")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={feedAnimalId} onChange={(e) => setFeedAnimalId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
          <Input label={t("livestock.feedType")} value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder={t("livestock.feedTypePlaceholder")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("livestock.quantity")} type="number" min={0} step={0.1} value={feedQuantity} onChange={(e) => setFeedQuantity(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.unit")}</label>
              <select value={feedUnit} onChange={(e) => setFeedUnit(e.target.value as "kg" | "g" | "liters")}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="liters">{t("livestock.liters")}</option>
              </select>
            </div>
          </div>
          <Input label={t("livestock.feedCost")} type="number" min={0} step={0.01} value={feedCost} onChange={(e) => setFeedCost(e.target.value)} placeholder="0.00" />
          <Input label={t("harvest.notes")} value={feedNotes} onChange={(e) => setFeedNotes(e.target.value)} />
          <Input label={t("harvest.date")} type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddFeed(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddFeed}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add health event modal */}
      <Modal open={showAddHealth} onClose={() => setShowAddHealth(false)} title={t("livestock.addHealth")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={healthAnimalId} onChange={(e) => setHealthAnimalId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.healthType")}</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {HEALTH_EVENT_TYPES.map((type) => (
                <button key={type} onClick={() => setHealthType(type)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${healthType === type ? "border-garden-500 bg-garden-50 font-medium dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                  {HEALTH_ICONS[type]} {t(`livestock.healthTypes.${type}`)}
                </button>
              ))}
            </div>
          </div>
          <Input label={t("livestock.healthDesc")} value={healthDesc} onChange={(e) => setHealthDesc(e.target.value)} placeholder={t("livestock.healthDescPlaceholder")} />
          <Input label={t("livestock.feedCost")} type="number" min={0} step={0.01} value={healthCost} onChange={(e) => setHealthCost(e.target.value)} placeholder="0.00" />
          <Input label={t("harvest.date")} type="date" value={healthDate} onChange={(e) => setHealthDate(e.target.value)} />
          <Input label={t("harvest.notes")} value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddHealth(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddHealth}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
