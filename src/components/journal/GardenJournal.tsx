import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Tag, Sprout, LayoutGrid } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { format } from "date-fns";

export function GardenJournal() {
  const { t } = useTranslation();
  const { confirm } = useToast();
  const { journalEntries, gardens, addJournalEntry, deleteJournalEntry } = useStore(useShallow((s) => ({ journalEntries: s.journalEntries, gardens: s.gardens, addJournalEntry: s.addJournalEntry, deleteJournalEntry: s.deleteJournalEntry })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tags, setTags] = useState("");
  const [gardenId, setGardenId] = useState(gardens[0]?.id ?? "");
  const [bedId, setBedId] = useState("");
  const [plantId, setPlantId] = useState("");

  const selectedGarden = gardens.find((g) => g.id === gardenId);

  const handleAdd = () => {
    if (!title.trim() || !text.trim()) return;
    addJournalEntry({
      gardenId: gardenId || gardens[0]?.id || "",
      date,
      title: title.trim(),
      text: text.trim(),
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      bedId: bedId || undefined,
      plantId: plantId || undefined,
    });
    setTitle("");
    setText("");
    setTags("");
    setBedId("");
    setPlantId("");
    setShowAdd(false);
  };

  const sorted = [...journalEntries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("journal.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("journal.add")}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">{t("journal.noEntries")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((entry) => {
            const plant = entry.plantId ? plantMap.get(entry.plantId) : undefined;
            const garden = gardens.find((g) => g.id === entry.gardenId);
            const bed = garden?.beds.find((b) => b.id === entry.bedId);

            return (
              <Card key={entry.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{entry.title}</h3>
                    <p className="text-xs text-gray-400">{entry.date}</p>
                  </div>
                  <button
                    onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteJournalEntry(entry.id); }}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{entry.text}</p>

                {(plant || bed) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plant && (
                      <span className="flex items-center gap-1 rounded-full bg-garden-50 px-2 py-0.5 text-xs text-garden-700 dark:bg-garden-900/30 dark:text-garden-400">
                        <Sprout size={10} />
                        <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={14} /> {t(`plants.catalog.${plant.id}.name`)}
                      </span>
                    )}
                    {bed && (
                      <span className="flex items-center gap-1 rounded-full bg-earth-100 px-2 py-0.5 text-xs text-earth-700 dark:bg-earth-700/30 dark:text-earth-300">
                        <LayoutGrid size={10} />
                        {bed.name}
                      </span>
                    )}
                  </div>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        <Tag size={8} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("journal.add")}>
        <div className="space-y-4">
          <Input label={t("journal.entryTitle")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Input label={t("harvest.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("journal.text")}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <Input label={t("journal.tags")} value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("journal.tagsPlaceholder")} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {gardens.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("harvest.bed")}</label>
                <select
                  value={gardenId}
                  onChange={(e) => { setGardenId(e.target.value); setBedId(""); }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {gardens.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedGarden && (
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("harvest.bed")}</label>
                <select
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">--</option>
                  {selectedGarden.beds.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("harvest.plant")}</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">--</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {t(`plants.catalog.${p.id}.name`)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
