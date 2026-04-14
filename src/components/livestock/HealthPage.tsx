import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Filter, AlertTriangle } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ANIMAL_ICONS, type HealthEventType } from "@/types/animal";
import { format, differenceInDays, parseISO } from "date-fns";

const HEALTH_EVENT_TYPES: HealthEventType[] = ["vaccination", "deworming", "illness", "injury", "checkup", "treatment", "death", "other"];
const HEALTH_ICONS: Record<HealthEventType, string> = {
  vaccination: "💉", deworming: "💊", illness: "🤒", injury: "🩹",
  checkup: "🩺", treatment: "💊", death: "✝️", other: "📋",
};

export function HealthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();
  const { animals, healthEvents, addHealthEvent, deleteHealthEvent } = useStore(
    useShallow((s) => ({ animals: s.animals, healthEvents: s.healthEvents, addHealthEvent: s.addHealthEvent, deleteHealthEvent: s.deleteHealthEvent }))
  );

  const [filterAnimalId, setFilterAnimalId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [healthAnimalId, setHealthAnimalId] = useState("");
  const [healthType, setHealthType] = useState<HealthEventType>("checkup");
  const [healthDesc, setHealthDesc] = useState("");
  const [healthCost, setHealthCost] = useState("");
  const [healthDate, setHealthDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [healthNotes, setHealthNotes] = useState("");

  const animalMap = useMemo(() => new Map(animals.map((a) => [a.id, a])), [animals]);

  const filtered = useMemo(() => {
    let items = healthEvents;
    if (filterAnimalId) items = items.filter((h) => h.animalId === filterAnimalId);
    if (filterType) items = items.filter((h) => h.type === filterType);
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }, [healthEvents, filterAnimalId, filterType]);

  const stats = useMemo(() => {
    const totalCost = Math.round(healthEvents.reduce((s, h) => s + (h.cost ?? 0), 0) * 100) / 100;
    const deaths = healthEvents.filter((h) => h.type === "death").length;
    const openIllnesses = healthEvents.filter((h) => (h.type === "illness" || h.type === "injury")).length;

    // Last vaccination per animal
    const lastVaccination = new Map<string, string>();
    for (const h of healthEvents) {
      if (h.type === "vaccination") {
        const current = lastVaccination.get(h.animalId);
        if (!current || h.date > current) lastVaccination.set(h.animalId, h.date);
      }
    }

    // Animals overdue for vaccination (>180 days since last)
    const overdueVaccinations: Array<{ animalId: string; daysSince: number }> = [];
    for (const animal of animals) {
      const lastDate = lastVaccination.get(animal.id);
      if (lastDate) {
        const days = differenceInDays(new Date(), parseISO(lastDate));
        if (days > 180) overdueVaccinations.push({ animalId: animal.id, daysSince: days });
      } else if (healthEvents.some((h) => h.animalId === animal.id)) {
        // Has health records but no vaccination
        overdueVaccinations.push({ animalId: animal.id, daysSince: -1 });
      }
    }

    return { totalCost, deaths, openIllnesses, overdueVaccinations };
  }, [healthEvents, animals]);

  const handleAdd = () => {
    if (!healthAnimalId || !healthDesc) return;
    addHealthEvent({ animalId: healthAnimalId, date: healthDate, type: healthType, description: healthDesc, cost: healthCost ? Number(healthCost) : undefined, notes: healthNotes || undefined });
    setHealthDesc(""); setHealthCost(""); setHealthNotes(""); setShowAdd(false);
    toast(t("livestock.healthAdded"), "success");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("livestock.health.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {t("livestock.addHealth")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold">{healthEvents.length}</p>
          <p className="text-xs text-gray-500">{t("livestock.health.totalEvents")}</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-rose-600">{stats.totalCost.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">{t("livestock.health.totalCost")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${stats.deaths > 0 ? "text-red-600" : "text-green-600"}`}>{stats.deaths}</p>
          <p className="text-xs text-gray-500">{t("livestock.health.losses")}</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${stats.overdueVaccinations.length > 0 ? "text-amber-600" : "text-green-600"}`}>{stats.overdueVaccinations.length}</p>
          <p className="text-xs text-gray-500">{t("livestock.health.overdueVacc")}</p>
        </Card>
      </div>

      {/* Overdue vaccinations warning */}
      {stats.overdueVaccinations.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} /> {t("livestock.health.overdueWarning")}
          </h3>
          <div className="space-y-1">
            {stats.overdueVaccinations.map(({ animalId, daysSince }) => {
              const animal = animalMap.get(animalId);
              if (!animal) return null;
              return (
                <button key={animalId} onClick={() => navigate(`/livestock/${animalId}`)}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/20">
                  <span>{ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}</span>
                  <span>{daysSince > 0 ? t("livestock.health.daysSince", { days: daysSince }) : t("livestock.health.neverVaccinated")}</span>
                </button>
              );
            })}
          </div>
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
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
          <option value="">{t("livestock.health.allTypes")}</option>
          {HEALTH_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>{HEALTH_ICONS[type]} {t(`livestock.healthTypes.${type}`)}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><p className="text-center text-gray-500">{t("livestock.noHealth")}</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const animal = animalMap.get(event.animalId);
            return (
              <div key={event.id} className={`flex items-center gap-3 rounded-lg border p-3 ${event.type === "death" ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                <span className="text-lg">{HEALTH_ICONS[event.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(`livestock.healthTypes.${event.type}`)} — {event.description}</p>
                  <p className="text-xs text-gray-400">
                    {animal && (
                      <button onClick={() => navigate(`/livestock/${animal.id}`)} className="hover:underline">
                        {ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}
                      </button>
                    )}
                    {" · "}{event.date}
                    {event.cost ? ` · ${event.cost.toFixed(2)} €` : ""}
                    {event.notes ? ` · ${event.notes}` : ""}
                  </p>
                </div>
                <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteHealthEvent(event.id); }}
                  className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("livestock.addHealth")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.selectAnimal")}</label>
            <select value={healthAnimalId} onChange={(e) => setHealthAnimalId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="">--</option>
              {animals.map((a) => (
                <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
              ))}
            </select>
          </div>
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
          <Input label={t("harvest.notes")} value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
