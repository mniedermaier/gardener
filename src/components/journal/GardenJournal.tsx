import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Tag, Sprout, LayoutGrid, Bird } from "lucide-react";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ANIMAL_ICONS } from "@/types/animal";
import { format } from "date-fns";

export function GardenJournal() {
  const { t } = useTranslation();
  const { confirm } = useToast();
  const { journalEntries, gardens, animals, addJournalEntry, deleteJournalEntry } = useStore(useShallow((s) => ({
    journalEntries: s.journalEntries, gardens: s.gardens, animals: s.animals,
    addJournalEntry: s.addJournalEntry, deleteJournalEntry: s.deleteJournalEntry,
  })));
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
  const [animalId, setAnimalId] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const selectedGarden = gardens.find((g) => g.id === gardenId);

  // Collect all unique tags
  const allTags = [...new Set(journalEntries.flatMap((e) => e.tags ?? []))].sort();

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
      animalId: animalId || undefined,
    });
    setTitle("");
    setText("");
    setTags("");
    setBedId("");
    setPlantId("");
    setAnimalId("");
    setShowAdd(false);
  };

  const sorted = [...journalEntries]
    .filter((e) => !filterTag || e.tags?.includes(filterTag))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("journal.title")}</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t("journal.add")}
        </Button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            onClick={() => setFilterTag(null)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${!filterTag ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}
          >
            {t("journal.all")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${filterTag === tag ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}
            >
              <Tag size={8} className="mr-0.5 inline" />
              {tag}
            </button>
          ))}
        </div>
      )}

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
            const animal = entry.animalId ? animals.find((a) => a.id === entry.animalId) : undefined;

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

                {(plant || bed || animal) && (
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
                    {animal && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        <Bird size={10} />
                        {ANIMAL_ICONS[animal.type]} {animal.name || t(`livestock.types.${animal.type}`)}
                      </span>
                    )}
                  </div>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className="flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <Tag size={8} />
                        {tag}
                      </button>
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
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("harvest.garden")}</label>
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            {animals.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{t("journal.animal")}</label>
                <select
                  value={animalId}
                  onChange={(e) => setAnimalId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">--</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>{ANIMAL_ICONS[a.type]} {a.name || t(`livestock.types.${a.type}`)} ({a.count}×)</option>
                  ))}
                </select>
              </div>
            )}
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
