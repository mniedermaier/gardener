import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Bird, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { OpenAddState } from "@/hooks/useOpenAddOnNavigate";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import type { Formatter } from "@/lib/format";
import { todayISO } from "@/lib/format";
import {
  PRODUCT_TYPES_BY_ANIMAL, PRODUCT_UNIT,
  type Animal, type AnimalProduct, type AnimalType, type FeedEntry, type HealthEvent, type HealthEventType, type ProductType,
} from "@/types/animal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LABEL_CLASS } from "@/components/ui/Field";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import { DateField } from "@/components/ui/DateField";
import { ANIMAL_ICON, HEALTH_ICON, PRODUCT_ICON } from "./icons";
import { TONE_SOFT, type Tone } from "@/components/ui/tone";
import type { LucideIcon } from "lucide-react";

export const ANIMAL_TYPES: AnimalType[] = ["chicken", "duck", "quail", "rabbit", "bee", "goat", "sheep"];
export const HEALTH_EVENT_TYPES: HealthEventType[] = ["checkup", "vaccination", "deworming", "treatment", "illness", "injury", "death", "other"];

/** Tinted square with a Lucide icon — leading slot of list rows and cards. */
export function IconTile({ icon: Icon, tone = "neutral", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg ${size === "lg" ? "size-11" : "size-8"} ${TONE_SOFT[tone]}`} aria-hidden="true">
      <Icon size={size === "lg" ? 22 : 16} />
    </span>
  );
}

export function animalLabel(a: Pick<Animal, "name" | "type">, t: TFunction): string {
  return a.name || t(`livestock.types.${a.type}`);
}

/** "12 Eier", "1,5 kg", "3 l" — quantity in the product's recording unit. */
export function formatProductAmount(type: ProductType, quantity: number, f: Formatter, t: TFunction): string {
  if (type === "eggs") return t("livestock.eggCount", { count: Math.round(quantity), n: f.formatNumber(quantity, { maximumFractionDigits: 0 }) });
  if (type === "milk") return f.formatVolume(quantity);
  return f.formatWeight(quantity * 1000);
}

/** Feed quantity with its unit. */
export function formatFeedAmount(entry: Pick<FeedEntry, "quantity" | "unit">, f: Formatter): string {
  if (entry.unit === "liters") return f.formatVolume(entry.quantity);
  return f.formatWeight(entry.unit === "g" ? entry.quantity : entry.quantity * 1000);
}

/** "6 Hühner · 2 Bienenvölker" — counts per type instead of one mixed sum. */
export function herdSummary(animals: Animal[], t: TFunction): string {
  const byType = new Map<AnimalType, number>();
  for (const a of animals) byType.set(a.type, (byType.get(a.type) ?? 0) + a.count);
  return ANIMAL_TYPES.filter((ty) => byType.has(ty))
    .map((ty) => t(`livestock.typeCount.${ty}`, { count: byType.get(ty) }))
    .join(" · ");
}

const parseNum = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));

/** A stored number back into a text field in the app's decimal style ("1,5"), no grouping. */
const toField = (n: number | undefined, f: Formatter) => (n === undefined ? "" : new Intl.NumberFormat(f.locale, { maximumFractionDigits: 3, useGrouping: false }).format(n));

// ------------------------------------------------------------------ dialog shell

function DialogFooter({ onCancel, onSave, saveLabel, canSave, onDelete }: { onCancel: () => void; onSave: () => void; saveLabel: string; canSave: boolean; onDelete?: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      {onDelete && (
        <Button variant="danger-ghost" className="mr-auto" onClick={onDelete}>
          <Trash2 size={16} aria-hidden="true" />
          {t("common.delete")}
        </Button>
      )}
      <Button variant="secondary" onClick={onCancel}>{t("common.cancel")}</Button>
      <Button onClick={onSave} disabled={!canSave}>{saveLabel}</Button>
    </>
  );
}

function animalOptions(animals: Animal[], t: TFunction) {
  return animals.map((a) => ({ value: a.id, label: `${animalLabel(a, t)} (${t(`livestock.typeCount.${a.type}`, { count: a.count })})` }));
}

/** Delete + undo toast for the three record kinds. */
export function useRecordActions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const f = useFormat();
  const s = useStore(useShallow((st) => ({
    addProduct: st.addProduct, deleteProduct: st.deleteProduct,
    addFeedEntry: st.addFeedEntry, deleteFeedEntry: st.deleteFeedEntry,
    addHealthEvent: st.addHealthEvent, deleteHealthEvent: st.deleteHealthEvent,
  })));
  const deleteProduct = useCallback(async (p: AnimalProduct) => {
    if (!(await confirmDelete("product", `${t(`livestock.products.${p.type}`)} · ${formatProductAmount(p.type, p.quantity, f, t)} · ${f.formatDate(p.date)}`))) return false;
    s.deleteProduct(p.id);
    const { id: _id, ...rest } = p;
    toast(t("livestock.productDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addProduct(rest) } });
    return true;
  }, [confirmDelete, f, s, t, toast]);
  const deleteFeed = useCallback(async (fe: FeedEntry) => {
    if (!(await confirmDelete("feed", `${fe.feedType} · ${f.formatDate(fe.date)}`))) return false;
    s.deleteFeedEntry(fe.id);
    const { id: _id, ...rest } = fe;
    toast(t("livestock.feedDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addFeedEntry(rest) } });
    return true;
  }, [confirmDelete, f, s, t, toast]);
  const deleteHealth = useCallback(async (h: HealthEvent) => {
    if (!(await confirmDelete("health", [h.description.trim() || t(`livestock.healthTypes.${h.type}`), f.formatDate(h.date)].join(" · ")))) return false;
    s.deleteHealthEvent(h.id);
    const { id: _id, ...rest } = h;
    toast(t("livestock.healthDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addHealthEvent(rest) } });
    return true;
  }, [confirmDelete, f, s, t, toast]);
  return { deleteProduct, deleteFeed, deleteHealth };
}

// ------------------------------------------------------------------ product

interface RecordDialogProps<T> {
  open: boolean;
  onClose: () => void;
  /** Entry to edit; undefined = create. */
  entry?: T;
  /** Preselected (and locked) animal, e.g. on the animal detail page. */
  animalId?: string;
}

/**
 * Which animal a new record starts on (DESIGN_SYSTEM rule 9: no silent
 * preselection): the animal of the latest record of this kind, the only
 * animal, or none — then "Tier wählen …" and Save stays disabled.
 */
function defaultAnimalId(animals: { id: string }[], records: { animalId: string; date: string }[]): string {
  if (animals.length === 1) return animals[0].id;
  const last = [...records].sort((a, b) => b.date.localeCompare(a.date)).find((r) => animals.some((a) => a.id === r.animalId));
  return last?.animalId ?? "";
}

export function ProductDialog({ open, onClose, entry, animalId }: RecordDialogProps<AnimalProduct>) {
  const { t } = useTranslation();
  const f = useFormat();
  const { toast } = useToast();
  const { animals, addProduct, updateProduct } = useStore(useShallow((s) => ({ animals: s.animals, addProduct: s.addProduct, updateProduct: s.updateProduct })));
  const { deleteProduct } = useRecordActions();
  const [aid, setAid] = useState("");
  const [type, setType] = useState<ProductType>("eggs");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  // Reset the form each time the dialog opens: state adjusted during render
  // (React's "reset state on prop change" pattern), not in an effect.
  const openKey = open ? (entry ?? animalId ?? "new") : null;
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      const first = animalId ?? entry?.animalId ?? defaultAnimalId(animals, useStore.getState().animalProducts);
      const a = animals.find((x) => x.id === first);
      setAid(first);
      setType(entry?.type ?? (a ? PRODUCT_TYPES_BY_ANIMAL[a.type][0] : "eggs"));
      setQty(toField(entry?.quantity, f));
      setDate(entry?.date ?? todayISO());
      setNotes(entry?.notes ?? "");
    }
  }

  const animal = animals.find((a) => a.id === aid);
  const types = animal ? PRODUCT_TYPES_BY_ANIMAL[animal.type] : [];
  const quantity = parseNum(qty);
  const canSave = !!animal && quantity > 0;

  const save = () => {
    if (!canSave) return;
    const fields = { animalId: aid, type, date, quantity, unit: PRODUCT_UNIT[type], notes: notes.trim() || undefined };
    if (entry) updateProduct(entry.id, fields);
    else addProduct(fields);
    toast(t(entry ? "livestock.productUpdated" : "livestock.productSaved", { amount: formatProductAmount(type, quantity, f, t), product: t(`livestock.products.${type}`) }), "success");
    onClose();
  };

  const unitLabel = type === "eggs" ? t("livestock.units.pieces") : type === "milk" ? t("livestock.units.liters") : t("livestock.units.kg");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? t("livestock.editProduct") : t("livestock.addProduct")}
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={t("common.save")} onDelete={entry ? () => void deleteProduct(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && (
          <Select
            label={t("livestock.selectAnimal")}
            value={aid}
            placeholder={t("livestock.chooseAnimal")}
            onChange={(e) => {
              setAid(e.target.value);
              const a = animals.find((x) => x.id === e.target.value);
              if (a) setType(PRODUCT_TYPES_BY_ANIMAL[a.type][0]);
            }}
            options={animalOptions(animals, t)}
          />
        )}
        {types.length > 1 && (
          <div>
            <p className={LABEL_CLASS}>{t("livestock.productType")}</p>
            <SegmentedControl
              fullWidth
              label={t("livestock.productType")}
              value={type}
              onChange={setType}
              options={types.map((ty) => ({ value: ty, label: t(`livestock.products.${ty}`), icon: PRODUCT_ICON[ty] }))}
            />
          </div>
        )}
        {/* Text field with a number keypad: no spin arrows, and "1,5" works in every locale. */}
        <Input
          label={`${t("livestock.quantity")} (${unitLabel})`}
          inputMode={type === "eggs" ? "numeric" : "decimal"}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder={t("common.examplePlaceholder", { value: f.formatNumber(type === "eggs" ? 6 : type === "milk" ? 2 : 1.5) })}
          autoFocus
        />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Textarea label={t("harvest.notes")} optional placeholder={t("livestock.production.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ feed

type FeedUnit = FeedEntry["unit"];

export function FeedDialog({ open, onClose, entry, animalId }: RecordDialogProps<FeedEntry>) {
  const { t } = useTranslation();
  const f = useFormat();
  const { toast } = useToast();
  const { animals, addFeedEntry, updateFeedEntry } = useStore(useShallow((s) => ({ animals: s.animals, addFeedEntry: s.addFeedEntry, updateFeedEntry: s.updateFeedEntry })));
  const { deleteFeed } = useRecordActions();
  const [aid, setAid] = useState("");
  const [feedType, setFeedType] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<FeedUnit>("kg");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  // Reset the form each time the dialog opens: state adjusted during render
  // (React's "reset state on prop change" pattern), not in an effect.
  const openKey = open ? (entry ?? animalId ?? "new") : null;
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setAid(animalId ?? entry?.animalId ?? defaultAnimalId(animals, useStore.getState().feedEntries));
      setFeedType(entry?.feedType ?? "");
      setQty(toField(entry?.quantity, f));
      setUnit(entry?.unit ?? "kg");
      setCost(toField(entry?.cost, f));
      setDate(entry?.date ?? todayISO());
      setNotes(entry?.notes ?? "");
    }
  }

  const quantity = parseNum(qty);
  const costNum = parseNum(cost);
  const canSave = !!aid && quantity > 0 && feedType.trim() !== "";

  const save = () => {
    if (!canSave) return;
    const fields = {
      animalId: aid, date, feedType: feedType.trim(), quantity, unit,
      cost: Number.isFinite(costNum) && costNum >= 0 ? costNum : undefined, notes: notes.trim() || undefined,
    };
    if (entry) updateFeedEntry(entry.id, fields);
    else addFeedEntry(fields);
    toast(t(entry ? "livestock.feedUpdated" : "livestock.feedAdded"), "success");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? t("livestock.editFeed") : t("livestock.addFeed")}
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={t("common.save")} onDelete={entry ? () => void deleteFeed(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && <Select label={t("livestock.selectAnimal")} value={aid} placeholder={t("livestock.chooseAnimal")} onChange={(e) => setAid(e.target.value)} options={animalOptions(animals, t)} />}
        <Input label={t("livestock.feedType")} value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder={t("livestock.feedTypePlaceholder")} autoFocus />
        {/* Same pattern as the harvest weight: the field plus an inline unit toggle (DESIGN_SYSTEM rule 9). */}
        <div className="flex items-end gap-2">
          <Input
            wrapperClassName="min-w-0 flex-1"
            label={t("livestock.quantityIn", { unit: t(`livestock.units.${unit === "liters" ? "litersShort" : unit}`) })}
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={t("common.examplePlaceholder", { value: f.formatNumber(unit === "g" ? 500 : unit === "liters" ? 2 : 10) })}
          />
          <SegmentedControl
            inline
            label={t("livestock.unit")}
            value={unit}
            onChange={setUnit}
            options={[
              { value: "kg", label: t("livestock.units.kg") },
              { value: "g", label: t("livestock.units.g") },
              { value: "liters", label: t("livestock.units.litersShort") },
            ]}
          />
        </div>
        <Input label={t("livestock.cost")} optional hint={t("common.costHint")} placeholder={t("common.examplePlaceholder", { value: f.formatNumber(4, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Textarea label={t("harvest.notes")} optional placeholder={t("livestock.feed.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ health

export function HealthDialog({ open, onClose, entry, animalId, presetAnimalId, presetType }: RecordDialogProps<HealthEvent> & { presetAnimalId?: string; presetType?: HealthEventType }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { toast } = useToast();
  const { animals, addHealthEvent, updateHealthEvent } = useStore(useShallow((s) => ({ animals: s.animals, addHealthEvent: s.addHealthEvent, updateHealthEvent: s.updateHealthEvent })));
  const { deleteHealth } = useRecordActions();
  const [aid, setAid] = useState("");
  const [type, setType] = useState<HealthEventType>("checkup");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  // Reset the form each time the dialog opens: state adjusted during render
  // (React's "reset state on prop change" pattern), not in an effect.
  const openKey = open ? (entry ?? animalId ?? "new") : null;
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setAid(animalId ?? entry?.animalId ?? presetAnimalId ?? defaultAnimalId(animals, useStore.getState().healthEvents));
      setType(entry?.type ?? presetType ?? "checkup");
      setDesc(entry?.description ?? "");
      setCost(toField(entry?.cost, f));
      setDate(entry?.date ?? todayISO());
      setNotes(entry?.notes ?? "");
    }
  }

  const costNum = parseNum(cost);
  // The type alone is a valid entry ("Kontrolle"); the description only adds detail.
  const canSave = !!aid;

  const save = () => {
    if (!canSave) return;
    const fields = {
      animalId: aid, date, type, description: desc.trim() || t(`livestock.healthTypes.${type}`),
      cost: Number.isFinite(costNum) && costNum >= 0 ? costNum : undefined, notes: notes.trim() || undefined,
    };
    if (entry) updateHealthEvent(entry.id, fields);
    else addHealthEvent(fields);
    toast(t(entry ? "livestock.healthUpdated" : "livestock.healthAdded"), "success");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? t("livestock.editHealth") : t("livestock.addHealth")}
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={t("common.save")} onDelete={entry ? () => void deleteHealth(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && <Select label={t("livestock.selectAnimal")} value={aid} placeholder={t("livestock.chooseAnimal")} onChange={(e) => setAid(e.target.value)} options={animalOptions(animals, t)} />}
        <Select
          label={t("livestock.healthType")}
          value={type}
          onChange={(e) => setType(e.target.value as HealthEventType)}
          options={HEALTH_EVENT_TYPES.map((ty) => ({ value: ty, label: t(`livestock.healthTypes.${ty}`) }))}
        />
        <Input label={t("livestock.healthDesc")} optional value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t(`livestock.healthDescPlaceholders.${type}`)} autoFocus />
        <Input label={t("livestock.cost")} optional hint={t("common.costHint")} placeholder={t("common.examplePlaceholder", { value: f.formatNumber(4, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Textarea label={t("harvest.notes")} optional placeholder={t("livestock.health.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ animal

export function AnimalDialog({ open, onClose, animal, onDeleted }: { open: boolean; onClose: () => void; animal?: Animal; onDeleted?: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirmDelete = useConfirmDelete();
  const s = useStore(useShallow((st) => ({
    addAnimal: st.addAnimal, updateAnimal: st.updateAnimal, deleteAnimal: st.deleteAnimal, restoreAnimal: st.restoreAnimal,
  })));
  // A new animal starts without a species: a wrong default would be a silent data error (rule 9).
  const [type, setType] = useState<AnimalType | "">("");
  const [name, setName] = useState("");
  const [count, setCount] = useState("");
  const [notes, setNotes] = useState("");
  const [acquired, setAcquired] = useState(todayISO());

  // Reset the form each time the dialog opens: state adjusted during render
  // (React's "reset state on prop change" pattern), not in an effect.
  const openKey = open ? (animal ?? "new") : null;
  const [openedFor, setOpenedFor] = useState<unknown>(null);
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setType(animal?.type ?? "");
      setName(animal?.name ?? "");
      setCount(animal ? String(animal.count) : "");
      setNotes(animal?.notes ?? "");
      setAcquired(animal?.acquiredDate ?? todayISO());
    }
  }

  const n = parseNum(count);
  const canSave = type !== "" && Number.isInteger(n) && n >= (animal ? 0 : 1);

  const save = () => {
    if (!canSave) return;
    const fields = { type, name: name.trim() || undefined, count: n, notes: notes.trim() || undefined, acquiredDate: acquired };
    if (animal) {
      s.updateAnimal(animal.id, fields);
      toast(t("livestock.updated"), "success");
    } else {
      s.addAnimal(fields);
      toast(t("livestock.added", { name: fields.name ?? t(`livestock.types.${type}`) }), "success");
    }
    onClose();
  };

  const remove = async () => {
    if (!animal) return;
    if (!(await confirmDelete("animal", animalLabel(animal, t), t("livestock.confirmDeleteAnimal")))) return;
    const st = useStore.getState();
    const snapshot = {
      animal,
      products: st.animalProducts.filter((p) => p.animalId === animal.id),
      feeds: st.feedEntries.filter((f) => f.animalId === animal.id),
      health: st.healthEvents.filter((h) => h.animalId === animal.id),
    };
    s.deleteAnimal(animal.id);
    onClose();
    onDeleted?.();
    toast(t("livestock.deleted", { name: animalLabel(animal, t) }), "success", { action: { label: t("common.undo"), onClick: () => s.restoreAnimal(snapshot) } });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={animal ? t("livestock.editAnimal") : t("livestock.addAnimal")}
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={t("common.save")} onDelete={animal ? () => void remove() : undefined} />}
    >
      <div className="space-y-4">
        {!animal && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.animalType")}</legend>
            {/* Two columns on phones: "Bienenvölker" must not break mid-word. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ANIMAL_TYPES.map((ty) => {
                const Icon = ANIMAL_ICON[ty];
                const selected = type === ty;
                return (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(ty)}
                    className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-sm transition-colors sm:gap-2 sm:px-3 ${
                      selected
                        ? "border-garden-600 bg-garden-50 font-medium text-garden-800 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {/* Fixed icon box: every tile starts its label at the same x, whatever the glyph's width. */}
                    <span className="inline-flex size-5 shrink-0 items-center justify-center" aria-hidden="true"><Icon size={18} /></span>
                    <span className="min-w-0 leading-tight hyphens-auto">{t(`livestock.types.${ty}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <Input label={t("livestock.animalName")} optional value={name} onChange={(e) => setName(e.target.value)} placeholder={t("livestock.namePlaceholder")} />
        {/* The count is short, the date long ("9. Oktober 2026"): give the date the room. */}
        <div className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-3">
          <Input label={t("livestock.count")} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder={t("common.examplePlaceholder", { value: 6 })} />
          <DatePicker label={t("livestock.acquired")} value={acquired} onChange={(e) => setAcquired(e.target.value)} />
        </div>
        <Textarea label={t("harvest.notes")} optional placeholder={t("livestock.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

/**
 * Empty state of the production, feed and health pages before any animal
 * exists: the page's own sentence plus one action that opens the add-animal
 * dialog on "Tiere" (useOpenAddOnNavigate), not a bare "go there" link.
 */
/** No animals yet on a livestock sub-page: its own icon and outcome title, one way forward. */
export function NoAnimalsYet({ text, title, icon = Bird }: { text: string; title?: string; icon?: LucideIcon }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Card>
      <EmptyState
        icon={icon}
        title={title ?? t("livestock.emptyTitle")}
        description={text}
        action={
          <Button onClick={() => navigate("/livestock", { state: { openAdd: true } satisfies OpenAddState })}>
            <Plus size={16} aria-hidden="true" />
            {t("livestock.addAnimal")}
          </Button>
        }
      />
    </Card>
  );
}

export { ANIMAL_ICON, HEALTH_ICON, PRODUCT_ICON };
