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
import { ANIMAL_ICONS, PRODUCT_ICONS, type ProductType } from "@/types/animal";
import { ProductionChart } from "./ProductionChart";
import { format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore } from "date-fns";

const PRODUCT_TYPES_BY_ANIMAL: Record<string, ProductType[]> = {
  chicken: ["eggs"], duck: ["eggs"], rabbit: ["meat"],
  bee: ["honey", "wax"], goat: ["milk"], sheep: ["wool", "meat"], quail: ["eggs"],
};

export function ProductionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { animals, animalProducts, addProduct, deleteProduct } = useStore(
    useShallow((s) => ({ animals: s.animals, animalProducts: s.animalProducts, addProduct: s.addProduct, deleteProduct: s.deleteProduct }))
  );

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [prodAnimalId, setProdAnimalId] = useState("");
  const [prodType, setProdType] = useState<ProductType>("eggs");
  const [prodQty, setProdQty] = useState("");
  const [prodDate, setProdDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [prodNotes, setProdNotes] = useState("");

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const filtered = useMemo(() => {
    let items = animalProducts;
    if (filterAnimalId) items = items.filter((p) => p.animalId === filterAnimalId);
    if (filterType) items = items.filter((p) => p.type === filterType);
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }, [animalProducts, filterAnimalId, filterType]);

  const stats = useMemo(() => {
    const thisWeek = animalProducts.filter((p) => !isBefore(parseISO(p.date), weekStart) && !isAfter(parseISO(p.date), weekEnd));
    const eggs = thisWeek.filter((p) => p.type === "eggs").reduce((s, p) => s + p.quantity, 0);
    const totalEggs = animalProducts.filter((p) => p.type === "eggs").reduce((s, p) => s + p.quantity, 0);
    const honeyKg = Math.round(animalProducts.filter((p) => p.type === "honey").reduce((s, p) => s + p.quantity, 0) * 10) / 10;
    const milkL = Math.round(animalProducts.filter((p) => p.type === "milk").reduce((s, p) => s + p.quantity, 0) * 10) / 10;
    return { eggsThisWeek: eggs, totalEggs, honeyKg, milkL };
  }, [animalProducts, weekStart, weekEnd]);

  // Quick egg log
  const handleQuickEggs = (count: number) => {
    const eggAnimal = animals.find((a) => ["chicken", "duck", "quail"].includes(a.type));
    if (!eggAnimal) return;
    addProduct({ animalId: eggAnimal.id, type: "eggs", date: format(new Date(), "yyyy-MM-dd"), quantity: count, unit: "pieces" });
    toast(`${count} ${t("livestock.products.eggs")}`, "success");
  };

  const handleAdd = () => {
    if (!prodAnimalId || !prodQty) return;
    addProduct({ animalId: prodAnimalId, type: prodType, date: prodDate, quantity: Number(prodQty), unit: prodType === "eggs" ? "pieces" : "kg", notes: prodNotes || undefined });
    setProdQty(""); setProdNotes(""); setShowAdd(false);
    toast(t("livestock.productAdded"), "success");
  };

  const hasEggAnimals = animals.some((a) => ["chicken", "duck", "quail"].includes(a.type));
  const productTypes = [...new Set(animalProducts.map((p) => p.type))];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("livestock.production.title")}</h1>
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
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> {t("livestock.addProduct")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.eggsThisWeek}</p>
          <p className="text-xs text-gray-500">{t("livestock.eggsThisWeek")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalEggs} 🥚</p>
          <p className="text-xs text-gray-500">{t("livestock.production.totalEggs")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.honeyKg} kg 🍯</p>
          <p className="text-xs text-gray-500">{t("livestock.production.totalHoney")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.milkL} L 🥛</p>
          <p className="text-xs text-gray-500">{t("livestock.production.totalMilk")}</p>
        </Card>
      </div>

      {/* Chart */}
      {animalProducts.length > 0 && (
        <Card className="mb-4">
          <ProductionChart animalProducts={animalProducts} animals={animals} months={12} />
        </Card>
      )}

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        {animals.length > 1 && (
          <select value={filterAnimalId} onChange={(e) => setFilterAnimalId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <option value="">{t("livestock.allAnimals")}</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)}</option>
            ))}
          </select>
        )}
        {productTypes.length > 1 && (
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <option value="">{t("livestock.production.allProducts")}</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>{PRODUCT_ICONS[type]} {t(`livestock.products.${type}`)}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-400">{filtered.length} {t("livestock.productionEntries", { count: filtered.length })}</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><p className="text-center text-gray-500">{t("livestock.noProducts")}</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((prod) => {
            const animal = animalMap.get(prod.animalId);
            return (
              <div key={prod.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-lg">{PRODUCT_ICONS[prod.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {prod.quantity} {prod.unit === "pieces" ? t("livestock.pieces") : prod.unit} {t(`livestock.products.${prod.type}`)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {animal && (
                      <button onClick={() => navigate(`/livestock/${animal.id}`)} className="hover:underline">
                        {ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}
                      </button>
                    )}
                    {" · "}{prod.date}
                    {prod.notes ? ` · ${prod.notes}` : ""}
                  </p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteProduct(prod.id); }}
                  className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("livestock.addProduct")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={prodAnimalId} onChange={(e) => {
              setProdAnimalId(e.target.value);
              const a = animals.find((x) => x.id === e.target.value);
              if (a) setProdType((PRODUCT_TYPES_BY_ANIMAL[a.type] ?? ["eggs"])[0]);
            }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
          {prodAnimalId && (() => {
            const animal = animals.find((a) => a.id === prodAnimalId);
            if (!animal) return null;
            const types = PRODUCT_TYPES_BY_ANIMAL[animal.type] ?? [];
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
          <Input label={t("livestock.quantity")} type="number" min={1} step={prodType === "eggs" ? 1 : 0.1} value={prodQty} onChange={(e) => setProdQty(e.target.value)} />
          <Input label={t("harvest.date")} type="date" value={prodDate} onChange={(e) => setProdDate(e.target.value)} />
          <Input label={t("harvest.notes")} value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
