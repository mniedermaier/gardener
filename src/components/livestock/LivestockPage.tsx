import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Egg, Wheat } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS, PRODUCT_ICONS, ANNUAL_YIELD, type AnimalType, type ProductType } from "@/types/animal";
import { format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";

const ANIMAL_TYPES: AnimalType[] = ["chicken", "duck", "rabbit", "bee"];
const PRODUCT_TYPES_BY_ANIMAL: Record<AnimalType, ProductType[]> = {
  chicken: ["eggs"],
  duck: ["eggs"],
  rabbit: ["meat"],
  bee: ["honey", "wax"],
};

export function LivestockPage() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const {
    animals, animalProducts, feedEntries,
    addAnimal, deleteAnimal, addProduct, deleteProduct,
    addFeedEntry, deleteFeedEntry,
  } = useStore(
    useShallow((s) => ({
      animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries,
      addAnimal: s.addAnimal, deleteAnimal: s.deleteAnimal,
      addProduct: s.addProduct, deleteProduct: s.deleteProduct,
      addFeedEntry: s.addFeedEntry, deleteFeedEntry: s.deleteFeedEntry,
    }))
  );

  const [tab, setTab] = useState<"animals" | "production" | "feed">("animals");
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);

  // Add animal form
  const [animalType, setAnimalType] = useState<AnimalType>("chicken");
  const [animalName, setAnimalName] = useState("");
  const [animalCount, setAnimalCount] = useState("1");

  // Add product form
  const [prodAnimalId, setProdAnimalId] = useState("");
  const [prodType, setProdType] = useState<ProductType>("eggs");
  const [prodQuantity, setProdQuantity] = useState("");
  const [prodDate, setProdDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Add feed form
  const [feedAnimalId, setFeedAnimalId] = useState("");
  const [feedType, setFeedType] = useState("");
  const [feedQuantity, setFeedQuantity] = useState("");
  const [feedUnit, setFeedUnit] = useState<"kg" | "g" | "liters">("kg");
  const [feedCost, setFeedCost] = useState("");
  const [feedDate, setFeedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [feedNotes, setFeedNotes] = useState("");

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
    const honeyThisYear = animalProducts.filter((p) => p.type === "honey" && p.date.startsWith(String(now.getFullYear()))).reduce((s, p) => s + p.quantity, 0);
    const feedCostMonth = feedEntries
      .filter((f) => !isBefore(parseISO(f.date), monthStart) && !isAfter(parseISO(f.date), monthEnd))
      .reduce((s, f) => s + (f.cost ?? 0), 0);
    return { totalAnimals, eggsThisWeek, honeyThisYear, feedCostMonth };
  }, [animals, animalProducts, feedEntries, weekStart, weekEnd, monthStart, monthEnd, now]);

  const handleAddAnimal = () => {
    addAnimal({
      type: animalType,
      name: animalName || undefined,
      count: Number(animalCount),
      acquiredDate: format(new Date(), "yyyy-MM-dd"),
    });
    setAnimalName("");
    setAnimalCount("1");
    setShowAddAnimal(false);
    toast(t("livestock.added"), "success");
  };

  const handleAddProduct = () => {
    if (!prodAnimalId || !prodQuantity) return;
    addProduct({
      animalId: prodAnimalId,
      type: prodType,
      date: prodDate,
      quantity: Number(prodQuantity),
      unit: prodType === "eggs" ? "pieces" : "kg",
    });
    setProdQuantity("");
    setShowAddProduct(false);
    toast(t("livestock.productAdded"), "success");
  };

  const handleAddFeed = () => {
    if (!feedAnimalId || !feedQuantity || !feedType) return;
    addFeedEntry({
      animalId: feedAnimalId,
      date: feedDate,
      feedType: feedType,
      quantity: Number(feedQuantity),
      unit: feedUnit,
      cost: feedCost ? Number(feedCost) : undefined,
      notes: feedNotes || undefined,
    });
    setFeedQuantity("");
    setFeedType("");
    setFeedCost("");
    setFeedNotes("");
    setShowAddFeed(false);
    toast(t("livestock.feedAdded"), "success");
  };

  // Quick egg log
  const handleQuickEggs = (count: number) => {
    const chickenOrDuck = animals.find((a) => a.type === "chicken" || a.type === "duck");
    if (!chickenOrDuck) return;
    addProduct({
      animalId: chickenOrDuck.id,
      type: "eggs",
      date: format(new Date(), "yyyy-MM-dd"),
      quantity: count,
      unit: "pieces",
    });
    toast(`${count} ${t("livestock.products.eggs")}`, "success");
  };

  const addButton = () => {
    if (tab === "animals") setShowAddAnimal(true);
    else if (tab === "production") setShowAddProduct(true);
    else setShowAddFeed(true);
  };

  const addLabel = tab === "animals" ? t("livestock.addAnimal") : tab === "production" ? t("livestock.addProduct") : t("livestock.addFeed");

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
      <div className="mb-4 flex gap-2">
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
      </div>

      {/* Animals tab */}
      {tab === "animals" && (
        animals.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noAnimals")}</p></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {animals.map((animal) => {
              const yields = ANNUAL_YIELD[animal.type];
              const animalFeedCost = feedEntries
                .filter((f) => f.animalId === animal.id)
                .reduce((s, f) => s + (f.cost ?? 0), 0);
              const animalProductCount = animalProducts.filter((p) => p.animalId === animal.id).length;
              return (
                <Card key={animal.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ANIMAL_ICONS[animal.type]}</span>
                      <div>
                        <h3 className="font-semibold">
                          {animal.name || t(`livestock.types.${animal.type}`)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {animal.count}× {t(`livestock.types.${animal.type}`)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                          {yields.map((y) => (
                            <span key={y.product}>
                              {PRODUCT_ICONS[y.product]} ~{y.quantity * animal.count} {y.unit}/{t("livestock.year")}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-gray-400">
                          <span>{t("livestock.productionEntries", { count: animalProductCount })}</span>
                          {animalFeedCost > 0 && <span>{t("livestock.feedTotal")}: {animalFeedCost.toFixed(2)} €</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteAnimal(animal.id); }}
                      className="rounded p-1 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Production tab */}
      {tab === "production" && (
        animalProducts.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noProducts")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...animalProducts].sort((a, b) => b.date.localeCompare(a.date)).map((prod) => {
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
        feedEntries.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noFeed")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...feedEntries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
              const animal = animals.find((a) => a.id === entry.animalId);
              return (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <span className="text-lg">🌾</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {entry.quantity} {entry.unit} {entry.feedType}
                    </p>
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
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddAnimal(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddAnimal}>{t("common.add")}</Button>
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
    </div>
  );
}
