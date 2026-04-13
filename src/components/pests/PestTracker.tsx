import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Bug, Check } from "lucide-react";
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
import { format } from "date-fns";

const SEVERITY_COLORS = ["", "bg-green-100 text-green-700", "bg-lime-100 text-lime-700", "bg-amber-100 text-amber-700", "bg-orange-100 text-orange-700", "bg-red-100 text-red-700"];

export function PestTracker() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { pests, gardens, addPest, updatePest, deletePest } = useStore(
    useShallow((s) => ({ pests: s.pests, gardens: s.gardens, addPest: s.addPest, updatePest: s.updatePest, deletePest: s.deletePest }))
  );
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();

  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [bedId, setBedId] = useState("");
  const [type, setType] = useState<"pest" | "disease">("pest");
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [organic, setOrganic] = useState(true);

  const allBeds = gardens.flatMap((g) => g.beds.map((b) => ({ id: b.id, name: b.name, gardenName: g.name })));

  const filtered = pests
    .filter((p) => filter === "all" || (filter === "active" ? !p.resolved : p.resolved))
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeCount = pests.filter((p) => !p.resolved).length;
  const resolvedCount = pests.filter((p) => p.resolved).length;

  const handleAdd = () => {
    if (!name.trim()) return;
    addPest({
      plantId, bedId, type, name: name.trim(), severity: severity as 1|2|3|4|5,
      description: description || undefined, organic, resolved: false, date: format(new Date(), "yyyy-MM-dd"),
    });
    setName("");
    setDescription("");
    setShowAdd(false);
    toast(t("pests.added"), "success");
  };

  const handleResolve = (id: string) => {
    updatePest(id, { resolved: true, resolvedDate: format(new Date(), "yyyy-MM-dd") });
    toast(t("pests.resolved"), "success");
  };

  const handleAddTreatment = (id: string) => {
    const treatment = prompt(t("pests.treatmentPrompt"));
    if (treatment) {
      updatePest(id, { treatment, treatmentDate: format(new Date(), "yyyy-MM-dd") });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("pests.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("pests.add")}
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-2">
        {([
          { key: "active" as const, count: activeCount, label: t("pests.active"), color: "text-red-600" },
          { key: "resolved" as const, count: resolvedCount, label: t("pests.resolvedLabel"), color: "text-green-600" },
          { key: "all" as const, count: pests.length, label: t("plants.allCategories"), color: "text-gray-600" },
        ]).map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`rounded-lg border px-3 py-2 text-center ${filter === s.key ? "border-garden-400 bg-garden-50 dark:border-garden-600 dark:bg-garden-900/20" : "border-gray-200 dark:border-gray-700"}`}
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Pest list */}
      {filtered.length === 0 ? (
        <Card><p className="text-center text-gray-500">{t("pests.empty")}</p></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((pest) => {
            const plant = plantMap.get(pest.plantId);
            return (
              <Card key={pest.id} className={pest.resolved ? "opacity-60" : ""}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pest.type === "pest" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"}`}>
                        {t(`pests.types.${pest.type}`)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[pest.severity]} dark:opacity-80`}>
                        {pest.severity}/5
                      </span>
                      {pest.organic && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-600 dark:bg-green-900/20">{t("pests.organic")}</span>}
                      {pest.resolved && <Check size={14} className="text-green-500" />}
                    </div>
                    <p className="text-sm font-semibold">{pest.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      {plant && (
                        <span className="flex items-center gap-1">
                          <PlantIconDisplay plantId={pest.plantId} emoji={plant.icon} size={12} />
                          {getPlantName(pest.plantId)}
                        </span>
                      )}
                      <span>{pest.date}</span>
                    </div>
                    {pest.description && <p className="mt-1 text-xs text-gray-500">{pest.description}</p>}
                    {pest.treatment && (
                      <p className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {t("pests.treatment")}: {pest.treatment} ({pest.treatmentDate})
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!pest.resolved && (
                      <>
                        <button onClick={() => handleAddTreatment(pest.id)} className="rounded p-1 text-blue-400 hover:text-blue-600" title={t("pests.addTreatment")}>
                          <Bug size={14} />
                        </button>
                        <button onClick={() => handleResolve(pest.id)} className="rounded p-1 text-green-400 hover:text-green-600" title={t("pests.resolve")}>
                          <Check size={14} />
                        </button>
                      </>
                    )}
                    <button onClick={async () => { if (await confirm(t("common.confirmDelete"))) deletePest(pest.id); }} className="rounded p-1 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add pest modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("pests.add")}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["pest", "disease"] as const).map((t_) => (
              <button key={t_} onClick={() => setType(t_)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${type === t_ ? "border-garden-500 bg-garden-50 dark:bg-garden-900/30" : "border-gray-200 dark:border-gray-700"}`}>
                {t(`pests.types.${t_}`)}
              </button>
            ))}
          </div>
          <Input label={t("pests.name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("pests.namePlaceholder")} autoFocus />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.plant")}</label>
            <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              {plants.map((p) => <option key={p.id} value={p.id}>{p.icon} {getPlantName(p.id)}</option>)}
            </select>
          </div>
          {allBeds.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("harvest.bed")}</label>
              <select value={bedId} onChange={(e) => setBedId(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
                <option value="">--</option>
                {allBeds.map((b) => <option key={b.id} value={b.id}>{b.gardenName} / {b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("pests.severity")} ({severity}/5)</label>
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full" />
          </div>
          <Input label={t("pests.description")} value={description} onChange={(e) => setDescription(e.target.value)} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t("pests.organicOnly")}</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
