import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Egg, Wheat, Heart, Trash2, Plus, Pencil, BookOpen } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS, PRODUCT_ICONS, type ProductType, type HealthEventType } from "@/types/animal";
import { ProductionChart } from "./ProductionChart";
import { format, parseISO, differenceInDays } from "date-fns";

const PRODUCT_TYPES_BY_ANIMAL: Record<string, ProductType[]> = {
  chicken: ["eggs"], duck: ["eggs"], rabbit: ["meat"],
  bee: ["honey", "wax"], goat: ["milk"], sheep: ["wool", "meat"], quail: ["eggs"],
};

const HEALTH_EVENT_TYPES: HealthEventType[] = ["vaccination", "deworming", "illness", "injury", "checkup", "treatment", "death", "other"];
const HEALTH_ICONS: Record<HealthEventType, string> = {
  vaccination: "💉", deworming: "💊", illness: "🤒", injury: "🩹",
  checkup: "🩺", treatment: "💊", death: "✝️", other: "📋",
};

export function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast, confirm } = useToast();

  const {
    animals, animalProducts, feedEntries, healthEvents, journalEntries,
    updateAnimal, deleteAnimal, addProduct, deleteProduct,
    addFeedEntry, deleteFeedEntry, addHealthEvent, deleteHealthEvent,
  } = useStore(useShallow((s) => ({
    animals: s.animals, animalProducts: s.animalProducts, feedEntries: s.feedEntries,
    healthEvents: s.healthEvents, journalEntries: s.journalEntries,
    updateAnimal: s.updateAnimal, deleteAnimal: s.deleteAnimal,
    addProduct: s.addProduct, deleteProduct: s.deleteProduct,
    addFeedEntry: s.addFeedEntry, deleteFeedEntry: s.deleteFeedEntry,
    addHealthEvent: s.addHealthEvent, deleteHealthEvent: s.deleteHealthEvent,
  })));

  const animal = animals.find((a) => a.id === id);
  const products = useMemo(() => animalProducts.filter((p) => p.animalId === id).sort((a, b) => b.date.localeCompare(a.date)), [animalProducts, id]);
  const feeds = useMemo(() => feedEntries.filter((f) => f.animalId === id).sort((a, b) => b.date.localeCompare(a.date)), [feedEntries, id]);
  const health = useMemo(() => healthEvents.filter((h) => h.animalId === id).sort((a, b) => b.date.localeCompare(a.date)), [healthEvents, id]);
  const journal = useMemo(() => journalEntries.filter((j) => j.animalId === id).sort((a, b) => b.date.localeCompare(a.date)), [journalEntries, id]);

  const [tab, setTab] = useState<"production" | "feed" | "health" | "journal">("production");
  const [showEdit, setShowEdit] = useState(false);
  const [showAddProd, setShowAddProd] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddHealth, setShowAddHealth] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Product form
  const [prodType, setProdType] = useState<ProductType>("eggs");
  const [prodQty, setProdQty] = useState("");
  const [prodDate, setProdDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [prodNotes, setProdNotes] = useState("");

  // Feed form
  const [feedType, setFeedType] = useState("");
  const [feedQty, setFeedQty] = useState("");
  const [feedUnit, setFeedUnit] = useState<"kg" | "g" | "liters">("kg");
  const [feedCost, setFeedCost] = useState("");
  const [feedDate, setFeedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Health form
  const [healthType, setHealthType] = useState<HealthEventType>("checkup");
  const [healthDesc, setHealthDesc] = useState("");
  const [healthCost, setHealthCost] = useState("");
  const [healthDate, setHealthDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Analytics
  const analytics = useMemo(() => {
    const totalFeedCost = Math.round(feeds.reduce((s, f) => s + (f.cost ?? 0), 0) * 100) / 100;
    const totalHealthCost = Math.round(health.reduce((s, h) => s + (h.cost ?? 0), 0) * 100) / 100;
    const totalCost = Math.round((totalFeedCost + totalHealthCost) * 100) / 100;

    // Production value estimation
    const eggCount = products.filter((p) => p.type === "eggs").reduce((s, p) => s + p.quantity, 0);
    const honeyKg = products.filter((p) => p.type === "honey").reduce((s, p) => s + p.quantity, 0);
    const milkL = products.filter((p) => p.type === "milk").reduce((s, p) => s + p.quantity, 0);
    const meatKg = products.filter((p) => p.type === "meat").reduce((s, p) => s + p.quantity, 0);
    // Market value estimates (€)
    const productionValue = Math.round((eggCount * 0.30 + honeyKg * 12 + milkL * 1.5 + meatKg * 15) * 100) / 100;
    const roi = totalCost > 0 ? Math.round(((productionValue - totalCost) / totalCost) * 100) : 0;

    // Cost per unit
    const costPerEgg = eggCount > 0 ? Math.round((totalCost / eggCount) * 100) / 100 : null;
    const costPerKgHoney = honeyKg > 0 ? Math.round((totalCost / honeyKg) * 100) / 100 : null;
    const costPerLMilk = milkL > 0 ? Math.round((totalCost / milkL) * 100) / 100 : null;

    // Days since acquisition
    const daysSince = animal ? differenceInDays(new Date(), parseISO(animal.acquiredDate)) : 0;

    return { totalFeedCost, totalHealthCost, totalCost, productionValue, roi, eggCount, honeyKg, milkL, meatKg, costPerEgg, costPerKgHoney, costPerLMilk, daysSince };
  }, [products, feeds, health, animal]);

  if (!animal) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t("livestock.animalNotFound")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate("/livestock")}>
          <ArrowLeft size={16} /> {t("common.back")}
        </Button>
      </div>
    );
  }

  const openEdit = () => {
    setEditName(animal.name ?? "");
    setEditCount(String(animal.count));
    setEditNotes(animal.notes ?? "");
    setShowEdit(true);
  };

  const handleEdit = () => {
    updateAnimal(animal.id, { name: editName || undefined, count: Number(editCount), notes: editNotes || undefined });
    setShowEdit(false);
    toast(t("livestock.updated"), "success");
  };

  const handleDelete = async () => {
    if (await confirm(t("common.confirmDelete"))) {
      deleteAnimal(animal.id);
      navigate("/livestock");
    }
  };

  const handleAddProd = () => {
    if (!prodQty) return;
    addProduct({ animalId: animal.id, type: prodType, date: prodDate, quantity: Number(prodQty), unit: prodType === "eggs" ? "pieces" : "kg", notes: prodNotes || undefined });
    setProdQty(""); setProdNotes(""); setShowAddProd(false);
    toast(t("livestock.productAdded"), "success");
  };

  const handleAddFeed = () => {
    if (!feedQty || !feedType) return;
    addFeedEntry({ animalId: animal.id, date: feedDate, feedType, quantity: Number(feedQty), unit: feedUnit, cost: feedCost ? Number(feedCost) : undefined });
    setFeedQty(""); setFeedType(""); setFeedCost(""); setShowAddFeed(false);
    toast(t("livestock.feedAdded"), "success");
  };

  const handleAddHealth = () => {
    if (!healthDesc) return;
    addHealthEvent({ animalId: animal.id, date: healthDate, type: healthType, description: healthDesc, cost: healthCost ? Number(healthCost) : undefined });
    setHealthDesc(""); setHealthCost(""); setShowAddHealth(false);
    toast(t("livestock.healthAdded"), "success");
  };

  const availableProducts = PRODUCT_TYPES_BY_ANIMAL[animal.type] ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate("/livestock")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <ArrowLeft size={20} />
        </button>
        <span className="text-4xl">{ANIMAL_ICONS[animal.type]}</span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{animal.name || t(`livestock.types.${animal.type}`)}</h1>
          <p className="text-sm text-gray-500">
            {animal.count}× {t(`livestock.types.${animal.type}`)} · {t("livestock.since")} {animal.acquiredDate} · {analytics.daysSince} {t("livestock.days")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={openEdit}><Pencil size={14} /> {t("livestock.editAnimal")}</Button>
        </div>
      </div>

      {/* Analytics cards */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold">{products.length}</p>
          <p className="text-xs text-gray-500">{t("livestock.productionEntries", { count: products.length })}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-rose-600">{analytics.totalCost.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.totalCosts")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-garden-600">{analytics.productionValue.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.productionValue")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${analytics.roi >= 0 ? "text-green-600" : "text-red-600"}`}>{analytics.roi}%</p>
          <p className="text-xs text-gray-500">ROI</p>
        </Card>
      </div>

      {/* Cost per unit */}
      {(analytics.costPerEgg || analytics.costPerKgHoney || analytics.costPerLMilk) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {analytics.costPerEgg !== null && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              🥚 {analytics.costPerEgg.toFixed(2)} €/{t("livestock.perEgg")}
            </span>
          )}
          {analytics.costPerKgHoney !== null && (
            <span className="rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              🍯 {analytics.costPerKgHoney.toFixed(2)} €/kg
            </span>
          )}
          {analytics.costPerLMilk !== null && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              🥛 {analytics.costPerLMilk.toFixed(2)} €/L
            </span>
          )}
        </div>
      )}

      {/* Production chart (filtered to this animal) */}
      {products.length > 0 && (
        <Card className="mb-4">
          <ProductionChart animalProducts={products} animals={[animal]} />
        </Card>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setTab("production")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "production" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Egg size={14} className="mr-1 inline" /> {t("livestock.productionTab")} ({products.length})
        </button>
        <button onClick={() => setTab("feed")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "feed" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Wheat size={14} className="mr-1 inline" /> {t("livestock.feedTab")} ({feeds.length})
        </button>
        <button onClick={() => setTab("health")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "health" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Heart size={14} className="mr-1 inline" /> {t("livestock.healthTab")} ({health.length})
        </button>
        <button onClick={() => setTab("journal")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "journal" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <BookOpen size={14} className="mr-1 inline" /> {t("nav.journal")} ({journal.length})
        </button>
      </div>

      {/* Add button */}
      {tab !== "journal" && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={() => {
            if (tab === "production") { setProdType(availableProducts[0] ?? "eggs"); setShowAddProd(true); }
            else if (tab === "feed") setShowAddFeed(true);
            else setShowAddHealth(true);
          }}>
            <Plus size={16} />
            {tab === "production" ? t("livestock.addProduct") : tab === "feed" ? t("livestock.addFeed") : t("livestock.addHealth")}
          </Button>
        </div>
      )}

      {/* Production list */}
      {tab === "production" && (
        products.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noProducts")}</p></Card>
        ) : (
          <div className="space-y-2">
            {products.map((prod) => (
              <div key={prod.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-lg">{PRODUCT_ICONS[prod.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{prod.quantity} {prod.unit === "pieces" ? t("livestock.pieces") : prod.unit} {t(`livestock.products.${prod.type}`)}</p>
                  <p className="text-xs text-gray-400">{prod.date}{prod.notes ? ` · ${prod.notes}` : ""}</p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteProduct(prod.id); }} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Feed list */}
      {tab === "feed" && (
        feeds.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noFeed")}</p></Card>
        ) : (
          <div className="space-y-2">
            {feeds.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <span className="text-lg">🌾</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{entry.quantity} {entry.unit} {entry.feedType}</p>
                  <p className="text-xs text-gray-400">{entry.date}{entry.cost ? ` · ${entry.cost.toFixed(2)} €` : ""}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteFeedEntry(entry.id); }} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Health list */}
      {tab === "health" && (
        health.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noHealth")}</p></Card>
        ) : (
          <div className="space-y-2">
            {health.map((event) => (
              <div key={event.id} className={`flex items-center gap-3 rounded-lg border p-3 ${event.type === "death" ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                <span className="text-lg">{HEALTH_ICONS[event.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(`livestock.healthTypes.${event.type}`)} — {event.description}</p>
                  <p className="text-xs text-gray-400">{event.date}{event.cost ? ` · ${event.cost.toFixed(2)} €` : ""}{event.notes ? ` · ${event.notes}` : ""}</p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteHealthEvent(event.id); }} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Journal entries */}
      {tab === "journal" && (
        journal.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("livestock.noJournal")}</p></Card>
        ) : (
          <div className="space-y-2">
            {journal.map((entry) => (
              <Card key={entry.id}>
                <h3 className="font-semibold">{entry.title}</h3>
                <p className="text-xs text-gray-400">{entry.date}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{entry.text}</p>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t("livestock.editAnimal")}>
        <div className="space-y-4">
          <Input label={t("livestock.animalName")} value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label={t("livestock.count")} type="number" min={0} value={editCount} onChange={(e) => setEditCount(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.notes")}</label>
            <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEdit}>{t("common.save")}</Button>
          </div>
          <button onClick={handleDelete} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 size={14} className="mr-1 inline" /> {t("livestock.deleteAnimal")}
          </button>
        </div>
      </Modal>

      {/* Add product modal */}
      <Modal open={showAddProd} onClose={() => setShowAddProd(false)} title={t("livestock.addProduct")}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {availableProducts.map((type) => (
              <button key={type} onClick={() => setProdType(type)}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm ${prodType === type ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                {PRODUCT_ICONS[type]} {t(`livestock.products.${type}`)}
              </button>
            ))}
          </div>
          <Input label={t("livestock.quantity")} type="number" min={1} step={prodType === "eggs" ? 1 : 0.1} value={prodQty} onChange={(e) => setProdQty(e.target.value)} />
          <Input label={t("harvest.date")} type="date" value={prodDate} onChange={(e) => setProdDate(e.target.value)} />
          <Input label={t("harvest.notes")} value={prodNotes} onChange={(e) => setProdNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddProd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddProd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add feed modal */}
      <Modal open={showAddFeed} onClose={() => setShowAddFeed(false)} title={t("livestock.addFeed")}>
        <div className="space-y-4">
          <Input label={t("livestock.feedType")} value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder={t("livestock.feedTypePlaceholder")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("livestock.quantity")} type="number" min={0} step={0.1} value={feedQty} onChange={(e) => setFeedQty(e.target.value)} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.unit")}</label>
              <select value={feedUnit} onChange={(e) => setFeedUnit(e.target.value as "kg" | "g" | "liters")} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                <option value="kg">kg</option><option value="g">g</option><option value="liters">{t("livestock.liters")}</option>
              </select>
            </div>
          </div>
          <Input label={t("livestock.feedCost")} type="number" min={0} step={0.01} value={feedCost} onChange={(e) => setFeedCost(e.target.value)} placeholder="0.00" />
          <Input label={t("harvest.date")} type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddFeed(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddFeed}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>

      {/* Add health modal */}
      <Modal open={showAddHealth} onClose={() => setShowAddHealth(false)} title={t("livestock.addHealth")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {HEALTH_EVENT_TYPES.map((type) => (
              <button key={type} onClick={() => setHealthType(type)}
                className={`rounded-lg border px-2 py-1.5 text-xs ${healthType === type ? "border-garden-500 bg-garden-50 font-medium dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                {HEALTH_ICONS[type]} {t(`livestock.healthTypes.${type}`)}
              </button>
            ))}
          </div>
          <Input label={t("livestock.healthDesc")} value={healthDesc} onChange={(e) => setHealthDesc(e.target.value)} placeholder={t("livestock.healthDescPlaceholder")} />
          <Input label={t("livestock.feedCost")} type="number" min={0} step={0.01} value={healthCost} onChange={(e) => setHealthCost(e.target.value)} placeholder="0.00" />
          <Input label={t("harvest.date")} type="date" value={healthDate} onChange={(e) => setHealthDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddHealth(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddHealth}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
