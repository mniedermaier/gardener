import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Camera, ImagePlus, LayoutGrid, PawPrint, Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useOpenAddParamsOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { useOpenFromParam } from "@/hooks/useOpenFromParam";
import { todayISO } from "@/lib/format";
import { putPhoto, deletePhotos } from "@/lib/photoStore";
import type { JournalEntry } from "@/types/journal";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LABEL_CLASS } from "@/components/ui/Field";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { PlantCombobox } from "@/components/records/PlantCombobox";
import { useBeds } from "@/components/records/useBeds";
import { useAddFromUrl, type AddParams } from "@/components/records/useAddFromUrl";
import { JournalPhoto, useResolvedPhoto } from "./JournalPhoto";

const MAX_PHOTOS = 3;

function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = e.target!.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function FullPhoto({ photo, alt }: { photo: string; alt: string }) {
  const src = useResolvedPhoto(photo);
  if (!src) return <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />;
  return <img src={src} alt={alt} className="max-h-[70dvh] w-full rounded-lg object-contain" />;
}

interface Draft {
  title: string;
  text: string;
  date: string;
  tags: string;
  plantId: string;
  bedId: string;
  animalId: string;
  photos: string[];
}

const emptyDraft = (): Draft => ({ title: "", text: "", date: todayISO(), tags: "", plantId: "", bedId: "", animalId: "", photos: [] });

const parseTags = (s: string) => [...new Set(s.split(",").map((x) => x.trim().replace(/^#/, "")).filter(Boolean))];

export function GardenJournal() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const { formatDate } = useFormat();
  const { journalEntries, gardens, animals, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useStore(useShallow((s) => ({
    journalEntries: s.journalEntries, gardens: s.gardens, animals: s.animals,
    addJournalEntry: s.addJournalEntry, updateJournalEntry: s.updateJournalEntry, deleteJournalEntry: s.deleteJournalEntry,
  })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const beds = useBeds();

  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<{ photo: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------- dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [originalPhotos, setOriginalPhotos] = useState<string[]>([]);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const openAdd = useCallback((params: AddParams = {}) => {
    setEditingId(null);
    setSubmitted(false);
    setOriginalPhotos([]);
    setDraft({
      ...emptyDraft(),
      plantId: params.plant ?? "",
      bedId: params.bed ?? "",
      animalId: params.animal ?? "",
      date: params.date ?? todayISO(),
    });
    setDialogOpen(true);
  }, []);
  const openAddPlain = useCallback(() => openAdd(), [openAdd]);
  useOpenAddParamsOnNavigate(openAdd);
  useAddFromUrl(openAdd);

  // Deep link from the command palette: #/journal?entry=<id> scrolls to the entry and highlights it.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const showEntry = useCallback((id: string) => {
    if (!journalEntries.some((e) => e.id === id)) return false;
    setFilterTag(null);
    setHighlightId(id);
  }, [journalEntries]);
  useOpenFromParam("entry", showEntry);
  useEffect(() => {
    if (!highlightId) return;
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(`journal-entry-${highlightId}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    });
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [highlightId]);

  const openEdit = (e: JournalEntry) => {
    setEditingId(e.id);
    setSubmitted(false);
    setOriginalPhotos(e.photos ?? []);
    setDraft({
      title: e.title, text: e.text, date: e.date, tags: (e.tags ?? []).join(", "),
      plantId: e.plantId ?? "", bedId: e.bedId ?? "", animalId: e.animalId ?? "", photos: e.photos ?? [],
    });
    setDialogOpen(true);
  };

  /** Closing without saving drops photos uploaded in this session only. */
  const closeDialog = () => {
    const fresh = draft.photos.filter((p) => !originalPhotos.includes(p));
    if (fresh.length) void deletePhotos(fresh);
    setDialogOpen(false);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const toProcess = Array.from(files).slice(0, MAX_PHOTOS - draft.photos.length);
    setUploading(true);
    const refs: string[] = [];
    for (const file of toProcess) {
      try {
        const blob = await resizeImage(file, 1200, 900, 0.75);
        refs.push(await putPhoto(blob));
      } catch {
        toast(t("journal.photoError"), "error");
      }
    }
    setUploading(false);
    setDraft((d) => ({ ...d, photos: [...d.photos, ...refs].slice(0, MAX_PHOTOS) }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDraftPhoto = (photo: string) => {
    // Unsaved uploads can go right away; saved ones only when the change is saved.
    if (!originalPhotos.includes(photo)) void deletePhotos([photo]);
    setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p !== photo) }));
  };

  const titleError = submitted && !draft.title.trim() ? t("journal.needTitle") : undefined;

  const handleSave = () => {
    setSubmitted(true);
    if (!draft.title.trim()) return;
    const tags = parseTags(draft.tags);
    const fields = {
      gardenId: beds.byId.get(draft.bedId)?.gardenId ?? gardens[0]?.id ?? "",
      date: draft.date,
      title: draft.title.trim(),
      text: draft.text.trim(),
      tags: tags.length ? tags : undefined,
      bedId: draft.bedId || undefined,
      plantId: draft.plantId || undefined,
      animalId: draft.animalId || undefined,
      photos: draft.photos.length ? draft.photos : undefined,
    };
    if (editingId) {
      const removed = originalPhotos.filter((p) => !draft.photos.includes(p));
      if (removed.length) void deletePhotos(removed);
      updateJournalEntry(editingId, fields);
      toast(t("journal.updated"), "success");
    } else {
      addJournalEntry(fields);
      toast(t("journal.added"), "success");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (entry: JournalEntry) => {
    if (!(await confirmDelete("journal", entry.title.trim() || formatDate(entry.date)))) return;
    deleteJournalEntry(entry.id);
    setDialogOpen(false);
    // Keep the photos until the undo window has passed.
    let undone = false;
    if (entry.photos?.length) setTimeout(() => { if (!undone) void deletePhotos(entry.photos!); }, 7000);
    const { id: _id, ...rest } = entry;
    toast(t("journal.deleted"), "success", {
      action: { label: t("common.undo"), onClick: () => { undone = true; addJournalEntry(rest); } },
    });
  };

  // ---------------------------------------------------------------- list
  const allTags = useMemo(() => [...new Set(journalEntries.flatMap((e) => e.tags ?? []))].sort(), [journalEntries]);
  const groups = useMemo(() => {
    const sorted = journalEntries
      .filter((e) => !filterTag || e.tags?.includes(filterTag))
      .sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, JournalEntry[]>();
    for (const e of sorted) map.set(e.date.slice(0, 7), [...(map.get(e.date.slice(0, 7)) ?? []), e]);
    return [...map.entries()];
  }, [journalEntries, filterTag]);

  const animalLabel = (id: string) => {
    const a = animals.find((x) => x.id === id);
    return a ? a.name || t(`livestock.types.${a.type}`) : undefined;
  };

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium transition-colors sm:min-h-8 ${
      active
        ? "border-garden-600/40 bg-garden-50 text-garden-800 dark:border-garden-400/40 dark:bg-garden-500/15 dark:text-garden-200"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
    }`;

  const editing = editingId ? journalEntries.find((e) => e.id === editingId) : undefined;
  const draftTags = parseTags(draft.tags);
  const suggestedTags = allTags.filter((tag) => !draftTags.includes(tag)).slice(0, 8);

  return (
    <div>
      <PageHeader
        title={t("journal.title")}
        description={t("journal.subtitle")}
        // While the empty state shows, its button is the one way in.
        actions={journalEntries.length > 0 ? (
          <Button onClick={openAddPlain}>
            <Plus size={16} aria-hidden="true" />
            {t("journal.add")}
          </Button>
        ) : undefined}
      />

      {journalEntries.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={t("journal.emptyTitle")}
            description={t("journal.emptyText")}
            action={<Button onClick={openAddPlain}><Plus size={16} aria-hidden="true" />{t("journal.add")}</Button>}
          />
        </Card>
      ) : (
        // Wide screens: entries left, tag filter as a sticky side column instead of empty space.
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-8">
          {allTags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2 lg:sticky lg:top-0 lg:order-2 lg:mb-0 lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:p-4 lg:shadow-xs dark:lg:border-white/10 dark:lg:bg-gray-900" role="group" aria-label={t("journal.filterByTag")}>
              <p className="hidden w-full text-xs font-semibold text-gray-600 lg:block dark:text-gray-400">{t("journal.filterByTag")}</p>
              <button type="button" aria-pressed={!filterTag} onClick={() => setFilterTag(null)} className={chip(!filterTag)}>
                {t("journal.all")}
              </button>
              {allTags.map((tag) => (
                <button key={tag} type="button" aria-pressed={filterTag === tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} className={chip(filterTag === tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="min-w-0 space-y-6 lg:order-1">
            {/* One surface per month with the same sticky header as the other record lists (ui/List). */}
            {groups.map(([month, entries]) => (
              <section key={month} className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900">
                <h2 className="sticky top-0 z-20 rounded-t-xl border-b border-gray-200 bg-gray-50/95 px-4 py-2 text-xs font-semibold text-gray-600 backdrop-blur dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-400">
                  {formatDate(`${month}-01`, "monthYear")}
                </h2>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {entries.map((entry) => {
                    const plant = entry.plantId ? plantMap.get(entry.plantId) : undefined;
                    const bedLabel = beds.label(entry.bedId);
                    const animal = entry.animalId ? animalLabel(entry.animalId) : undefined;
                    const photos = entry.photos ?? [];
                    return (
                      <article
                        key={entry.id}
                        id={`journal-entry-${entry.id}`}
                        tabIndex={-1}
                        className={`relative p-4 last:rounded-b-xl sm:p-5 ${
                          highlightId === entry.id ? "ring-2 ring-inset ring-garden-500 dark:ring-garden-400" : ""
                        }`}
                      >
                        {photos.length > 0 && (
                          <div className={`mb-3 grid gap-0.5 overflow-hidden rounded-lg ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                            {photos.map((photo, idx) => (
                              <button
                                key={photo}
                                type="button"
                                onClick={() => setViewPhoto({ photo, title: entry.title })}
                                aria-label={t("journal.openPhoto", { title: entry.title, n: idx + 1 })}
                                className="relative z-10 block bg-gray-100 dark:bg-white/5"
                              >
                                <JournalPhoto photo={photo} alt="" className={`w-full object-cover ${photos.length === 1 ? "aspect-[16/9] max-h-80" : "aspect-square sm:aspect-[4/3]"}`} />
                              </button>
                            ))}
                          </div>
                        )}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                <time dateTime={entry.date}>{formatDate(entry.date, "weekdayDate")}</time>
                              </p>
                              <h3 className="mt-0.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                                <button
                                  type="button"
                                  onClick={() => openEdit(entry)}
                                  className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-focus"
                                >
                                  {entry.title}
                                </button>
                              </h3>
                            </div>
                            <div className="relative z-10 -mt-1 -mr-2">
                              <Menu
                                label={t("common.moreActions")}
                                items={[
                                  { label: t("common.edit"), icon: Pencil, onSelect: () => openEdit(entry) },
                                  "separator",
                                  { label: t("common.delete"), icon: Trash2, danger: true, onSelect: () => void handleDelete(entry) },
                                ]}
                              />
                            </div>
                          </div>
                          {entry.text && <p className="mt-2 line-clamp-6 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{entry.text}</p>}
                          {(plant || bedLabel || animal || entry.tags?.length) && (
                            <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5">
                              {plant && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 py-0.5 pr-2 pl-1 text-xs font-medium text-gray-700 dark:border-white/20 dark:text-gray-300">
                                  <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={16} />
                                  {getPlantName(plant.id)}
                                </span>
                              )}
                              {bedLabel && <Badge variant="outline" icon={LayoutGrid}>{bedLabel}</Badge>}
                              {animal && <Badge variant="outline" icon={PawPrint}>{animal}</Badge>}
                              {entry.tags?.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setFilterTag(tag)}
                                  aria-label={t("journal.filterTag", { tag })}
                                  className="relative inline-flex min-h-6 items-center rounded px-1 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] sm:before:hidden text-xs text-gray-500 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {groups.length === 0 && (
              <Card><p className="text-center text-sm text-gray-500 dark:text-gray-400">{t("journal.emptyFilter")}</p></Card>
            )}
          </div>
        </div>
      )}

      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title={editingId ? t("journal.edit") : t("journal.add")}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete(editing)}>
                <Trash2 size={16} aria-hidden="true" />
                {t("common.delete")}
              </Button>
            )}
            <Button variant="secondary" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={uploading || !draft.title.trim()}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input label={t("journal.entryTitle")} value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder={t("journal.titlePlaceholder")} error={titleError} autoFocus />
          <Textarea label={t("harvest.notes")} value={draft.text} onChange={(e) => patch({ text: e.target.value })} rows={4} placeholder={t("journal.text")} />
          <DateField label={t("harvest.date")} value={draft.date} onChange={(date) => patch({ date })} />

          {/* Photos */}
          <div>
            <p className={LABEL_CLASS}>{t("journal.photos")}</p>
            <div className="flex flex-wrap gap-2">
              {draft.photos.map((photo, idx) => (
                <div key={photo} className="relative">
                  <JournalPhoto photo={photo} alt={t("journal.photoN", { n: idx + 1 })} className="size-28 rounded-lg border border-gray-200 object-cover dark:border-white/10" />
                  <IconButton
                    icon={X}
                    size="sm"
                    label={t("journal.removePhoto", { n: idx + 1 })}
                    onClick={() => removeDraftPhoto(photo)}
                    className="absolute top-1 right-1 bg-white/90 shadow-xs hover:bg-white dark:bg-gray-900/90"
                  />
                </div>
              ))}
              {draft.photos.length < MAX_PHOTOS && (
                <label className="flex size-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-2 text-center border-2 border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-garden-500 hover:text-garden-700 focus-within:outline-2 focus-within:outline-focus dark:border-white/20 dark:text-gray-400 dark:hover:text-garden-300">
                  {uploading ? <Camera size={20} aria-hidden="true" className="animate-pulse" /> : <ImagePlus size={20} aria-hidden="true" />}
                  {t("journal.addPhoto")}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoSelect} />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("journal.photoHint", { max: MAX_PHOTOS })}</p>
          </div>

          {/* A plain section, not a framed card inside the dialog card. */}
          <fieldset className="space-y-4 border-t border-gray-100 pt-5 dark:border-white/10">
            <legend className="float-left mb-1 w-full text-sm font-semibold text-gray-900 dark:text-gray-100">{t("journal.linkedTo")}</legend>
            <PlantCombobox
              label={t("harvest.plant")}
              plants={plants}
              beds={beds.beds}
              optional
              value={draft.plantId}
              bedId={draft.bedId}
              onChange={({ plantId, bedId }) => patch({ plantId, ...(bedId ? { bedId } : {}) })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {beds.beds.length > 0 && (
                <Select label={t("harvest.bed")} value={draft.bedId} onChange={(e) => patch({ bedId: e.target.value })} placeholder={t("harvest.noBed")} options={beds.options} />
              )}
              {animals.length > 0 && (
                <Select
                  label={t("journal.animal")}
                  value={draft.animalId}
                  onChange={(e) => patch({ animalId: e.target.value })}
                  placeholder={t("journal.noAnimal")}
                  options={animals.map((a) => ({ value: a.id, label: a.name || t(`livestock.types.${a.type}`) }))}
                />
              )}
            </div>
          </fieldset>

          <div>
            <Input label={t("journal.tags")} value={draft.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder={t("journal.tagsPlaceholder")} />
            {suggestedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("journal.suggestedTags")}</span>
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => patch({ tags: [...draftTags, tag].join(", ") })}
                    className="inline-flex min-h-11 items-center rounded-full bg-gray-100 px-2.5 text-xs sm:min-h-8 font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                  >
                    + #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={viewPhoto !== null} onClose={() => setViewPhoto(null)} title={viewPhoto?.title ?? ""} size="lg">
        {viewPhoto && <FullPhoto photo={viewPhoto.photo} alt={viewPhoto.title} />}
      </Modal>
    </div>
  );
}
