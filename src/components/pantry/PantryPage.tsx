import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Check, AlertTriangle, Archive, BookOpen, Filter } from "lucide-react";
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
import type { PreservationMethod } from "@/types/plant";
import { SHELF_LIFE_MONTHS, PRESERVATION_YIELD, METHOD_ICONS, PLANT_PRESERVATION_GUIDES } from "@/types/pantry";
import { format, addMonths, differenceInDays, parseISO } from "date-fns";

const METHODS: PreservationMethod[] = ["canning", "freezing", "fermenting", "drying", "root_cellar"];

export function PantryPage() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { pantryItems, addPantryItem, deletePantryItem, consumePantryItem } = useStore(
    useShallow((s) => ({
      pantryItems: s.pantryItems, addPantryItem: s.addPantryItem,
      deletePantryItem: s.deletePantryItem, consumePantryItem: s.consumePantryItem,
    }))
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [tab, setTab] = useState<"stock" | "guides">("stock");
  const [showAdd, setShowAdd] = useState(false);
  const [showConsumed, setShowConsumed] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>("");

  // Add form
  const [plantId, setPlantId] = useState("");
  const [method, setMethod] = useState<PreservationMethod>("freezing");
  const [quantity, setQuantity] = useState("");
  const [units, setUnits] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [dateVal, setDateVal] = useState(format(new Date(), "yyyy-MM-dd"));
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [supplyCost, setSupplyCost] = useState("");

  const today = new Date();

  // Stats
  const activeItems = pantryItems.filter((p) => !p.consumed);
  const consumedItems = pantryItems.filter((p) => p.consumed);

  const stats = useMemo(() => {
    const totalKg = Math.round(activeItems.reduce((s, p) => s + p.quantityKg, 0) * 10) / 10;
    const totalUnits = activeItems.reduce((s, p) => s + (p.units ?? 0), 0);
    const expiringSoon = activeItems.filter((p) => {
      const daysLeft = differenceInDays(parseISO(p.expiresDate), today);
      return daysLeft >= 0 && daysLeft <= 30;
    }).length;
    const expired = activeItems.filter((p) => differenceInDays(parseISO(p.expiresDate), today) < 0).length;
    const totalCost = Math.round(activeItems.reduce((s, p) => s + (p.supplyCost ?? 0), 0) * 100) / 100;
    const byMethod: Record<string, number> = {};
    for (const item of activeItems) {
      byMethod[item.method] = (byMethod[item.method] ?? 0) + item.quantityKg;
    }
    return { totalKg, totalUnits, expiringSoon, expired, totalCost, byMethod };
  }, [activeItems, today]);

  const filteredItems = filterMethod
    ? activeItems.filter((p) => p.method === filterMethod)
    : activeItems;

  const handleAdd = () => {
    if (!plantId || !quantity) return;
    const expiresDate = format(addMonths(parseISO(dateVal), SHELF_LIFE_MONTHS[method]), "yyyy-MM-dd");
    addPantryItem({
      plantId, method,
      quantityKg: Number(quantity),
      units: units ? Number(units) : undefined,
      unitLabel: unitLabel || undefined,
      date: dateVal, expiresDate,
      label: label || undefined,
      notes: notes || undefined,
      consumed: false,
      supplyCost: supplyCost ? Number(supplyCost) : undefined,
    });
    setQuantity(""); setUnits(""); setUnitLabel(""); setLabel(""); setNotes(""); setSupplyCost("");
    setShowAdd(false);
    toast(t("pantry.added"), "success");
  };

  // Available methods for selected plant
  const plantMethods = plantId
    ? (plantMap.get(plantId)?.preservationMethods ?? METHODS)
    : METHODS;

  // Plants that have preservation guides
  const guidePlants = useMemo(() => {
    const planted = new Set<string>();
    // Get all planted plant IDs
    for (const plant of plants) {
      if (plant.preservationMethods && plant.preservationMethods.length > 0) {
        planted.add(plant.id);
      }
    }
    return plants.filter((p) => PLANT_PRESERVATION_GUIDES[p.id] || (p.preservationMethods && p.preservationMethods.length > 0));
  }, [plants]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("pantry.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("pantry.add")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalKg} kg</p>
          <p className="text-xs text-gray-500">{t("pantry.totalStored")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{stats.totalUnits}</p>
          <p className="text-xs text-gray-500">{t("pantry.totalUnits")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${stats.expiringSoon > 0 ? "text-amber-600" : "text-green-600"}`}>{stats.expiringSoon}</p>
          <p className="text-xs text-gray-500">{t("pantry.expiringSoon")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${stats.expired > 0 ? "text-red-600" : "text-green-600"}`}>{stats.expired}</p>
          <p className="text-xs text-gray-500">{t("pantry.expired")}</p>
        </Card>
      </div>

      {/* Method breakdown */}
      {Object.keys(stats.byMethod).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {METHODS.map((m) => {
            const kg = Math.round((stats.byMethod[m] ?? 0) * 10) / 10;
            if (kg === 0) return null;
            return (
              <span key={m} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {METHOD_ICONS[m]} {t(`preservation.methods.${m}`)} {kg} kg
              </span>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("stock")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "stock" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <Archive size={14} className="mr-1 inline" />
          {t("pantry.stockTab")} ({activeItems.length})
        </button>
        <button onClick={() => setTab("guides")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === "guides" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
          <BookOpen size={14} className="mr-1 inline" />
          {t("pantry.guidesTab")}
        </button>
        {consumedItems.length > 0 && (
          <button onClick={() => setShowConsumed(!showConsumed)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${showConsumed ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
            <Check size={14} className="mr-1 inline" />
            {t("pantry.consumed")} ({consumedItems.length})
          </button>
        )}
      </div>

      {/* Method filter */}
      {tab === "stock" && activeItems.length > 3 && (
        <div className="mb-3 flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <option value="">{t("pantry.allMethods")}</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>{METHOD_ICONS[m]} {t(`preservation.methods.${m}`)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stock tab */}
      {tab === "stock" && !showConsumed && (
        filteredItems.length === 0 ? (
          <Card><p className="text-center text-gray-500">{t("pantry.empty")}</p></Card>
        ) : (
          <div className="space-y-2">
            {[...filteredItems]
              .sort((a, b) => a.expiresDate.localeCompare(b.expiresDate))
              .map((item) => {
                const plant = plantMap.get(item.plantId);
                const daysLeft = differenceInDays(parseISO(item.expiresDate), today);
                const isExpired = daysLeft < 0;
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;
                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isExpired ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10" : isExpiringSoon ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                    <span className="text-lg">{METHOD_ICONS[item.method]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={14} />}{" "}
                          {item.label || getPlantName(item.plantId)}
                        </p>
                        {isExpired && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("pantry.expiredBadge")}</span>}
                        {isExpiringSoon && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t("pantry.expiringSoonBadge", { days: daysLeft })}</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {item.quantityKg} kg
                        {item.units ? ` · ${item.units} ${item.unitLabel || t("pantry.defaultUnit")}` : ""}
                        {" · "}{t(`preservation.methods.${item.method}`)}
                        {" · "}{t("pantry.storedOn")} {item.date}
                        {" · "}{t("pantry.expiresOn")} {item.expiresDate}
                        {item.supplyCost ? ` · ${item.supplyCost.toFixed(2)} €` : ""}
                      </p>
                      {item.notes && <p className="mt-0.5 text-xs italic text-gray-400">{item.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => consumePantryItem(item.id)}
                        className="rounded p-1 text-gray-300 hover:text-green-500" title={t("pantry.markConsumed")}>
                        <Check size={14} />
                      </button>
                      <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deletePantryItem(item.id); }}
                        className="rounded p-1 text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )
      )}

      {/* Consumed items */}
      {showConsumed && (
        <div className="space-y-2">
          {consumedItems.length === 0 ? (
            <Card><p className="text-center text-gray-500">{t("pantry.noConsumed")}</p></Card>
          ) : (
            [...consumedItems].sort((a, b) => (b.consumedDate ?? "").localeCompare(a.consumedDate ?? "")).map((item) => {
              const plant = plantMap.get(item.plantId);
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 opacity-60 dark:border-gray-700 dark:bg-gray-900">
                  <span className="text-lg">{METHOD_ICONS[item.method]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-through">
                      {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={14} />}{" "}
                      {item.label || getPlantName(item.plantId)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.quantityKg} kg · {t(`preservation.methods.${item.method}`)}
                      {item.consumedDate ? ` · ${t("pantry.consumedOn")} ${item.consumedDate}` : ""}
                    </p>
                  </div>
                  <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deletePantryItem(item.id); }}
                    className="rounded p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Guides tab */}
      {tab === "guides" && (
        <div className="space-y-4">
          {/* Method overview cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {METHODS.map((m) => (
              <Card key={m}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{METHOD_ICONS[m]}</span>
                  <div>
                    <h3 className="font-semibold">{t(`preservation.methods.${m}`)}</h3>
                    <p className="text-xs text-gray-500">{t(`pantry.methodInfo.${m}.shelf`)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{t(`pantry.methodInfo.${m}.desc`)}</p>
                <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
                  <span>{t("pantry.yield")}: ~{Math.round(PRESERVATION_YIELD[m] * 100)}%</span>
                  <span>{t("pantry.shelfLife")}: {SHELF_LIFE_MONTHS[m]} {t("pantry.months")}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Per-plant guides */}
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{t("pantry.plantGuides")}</h2>
            <div className="space-y-2">
              {guidePlants.map((plant) => {
                const methods = PLANT_PRESERVATION_GUIDES[plant.id] ?? plant.preservationMethods ?? [];
                if (methods.length === 0) return null;
                return (
                  <div key={plant.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={18} />
                      <span className="text-sm font-medium">{getPlantName(plant.id)}</span>
                    </div>
                    <div className="flex gap-1">
                      {methods.map((m) => (
                        <span key={m} className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] dark:bg-gray-700" title={t(`preservation.methods.${m}`)}>
                          {METHOD_ICONS[m]}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tips */}
          <Card>
            <h2 className="mb-3 text-lg font-semibold">{t("pantry.tipsTitle")}</h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-garden-500">•</span>
                  <span>{t(`pantry.tip${n}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Expiring soon warning */}
      {tab === "stock" && stats.expired > 0 && !showConsumed && (
        <Card className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t("pantry.expiredWarning", { count: stats.expired })}
            </p>
          </div>
        </Card>
      )}

      {/* Add item modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("pantry.add")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.plant")}</label>
            <select value={plantId} onChange={(e) => { setPlantId(e.target.value); }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {plants.filter((p) => p.preservationMethods && p.preservationMethods.length > 0).map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {getPlantName(p.id)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("pantry.method")}</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {plantMethods.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${method === m ? "border-garden-500 bg-garden-50 font-medium dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                  {METHOD_ICONS[m]} {t(`preservation.methods.${m}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              {t("pantry.shelfLife")}: {SHELF_LIFE_MONTHS[method]} {t("pantry.months")} · {t("pantry.yield")}: ~{Math.round(PRESERVATION_YIELD[method] * 100)}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={`${t("pantry.quantity")} (kg)`} type="number" min={0} step={0.1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Input label={t("pantry.unitCount")} type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} placeholder={t("pantry.unitCountPlaceholder")} />
          </div>

          <Input label={t("pantry.label")} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("pantry.labelPlaceholder")} />
          <Input label={t("harvest.date")} type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
          <Input label={`${t("pantry.supplyCost")} (€)`} type="number" min={0} step={0.01} value={supplyCost} onChange={(e) => setSupplyCost(e.target.value)} placeholder="0.00" />
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
