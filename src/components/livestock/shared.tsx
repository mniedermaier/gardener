import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { DateField } from "@/components/records/DateField";
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
  const { toast, confirm } = useToast();
  const s = useStore(useShallow((st) => ({
    addProduct: st.addProduct, deleteProduct: st.deleteProduct,
    addFeedEntry: st.addFeedEntry, deleteFeedEntry: st.deleteFeedEntry,
    addHealthEvent: st.addHealthEvent, deleteHealthEvent: st.deleteHealthEvent,
  })));
  const ask = useCallback(() => confirm(t("common.confirmDelete"), { confirmLabel: t("common.delete") }), [confirm, t]);

  const deleteProduct = useCallback(async (p: AnimalProduct) => {
    if (!(await ask())) return false;
    s.deleteProduct(p.id);
    const { id: _id, ...rest } = p;
    toast(t("livestock.productDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addProduct(rest) } });
    return true;
  }, [ask, s, t, toast]);
  const deleteFeed = useCallback(async (f: FeedEntry) => {
    if (!(await ask())) return false;
    s.deleteFeedEntry(f.id);
    const { id: _id, ...rest } = f;
    toast(t("livestock.feedDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addFeedEntry(rest) } });
    return true;
  }, [ask, s, t, toast]);
  const deleteHealth = useCallback(async (h: HealthEvent) => {
    if (!(await ask())) return false;
    s.deleteHealthEvent(h.id);
    const { id: _id, ...rest } = h;
    toast(t("livestock.healthDeleted"), "success", { action: { label: t("common.undo"), onClick: () => s.addHealthEvent(rest) } });
    return true;
  }, [ask, s, t, toast]);
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

  useEffect(() => {
    if (!open) return;
    const first = animalId ?? entry?.animalId ?? animals[0]?.id ?? "";
    const a = animals.find((x) => x.id === first);
    setAid(first);
    setType(entry?.type ?? (a ? PRODUCT_TYPES_BY_ANIMAL[a.type][0] : "eggs"));
    setQty(entry ? String(entry.quantity) : "");
    setDate(entry?.date ?? todayISO());
    setNotes(entry?.notes ?? "");
  }, [open, entry, animalId, animals]);

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
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={entry ? t("common.save") : t("common.add")} onDelete={entry ? () => void deleteProduct(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && (
          <Select
            label={t("livestock.selectAnimal")}
            value={aid}
            onChange={(e) => {
              setAid(e.target.value);
              const a = animals.find((x) => x.id === e.target.value);
              if (a) setType(PRODUCT_TYPES_BY_ANIMAL[a.type][0]);
            }}
            options={animalOptions(animals, t)}
          />
        )}
        {types.length > 1 && (
          <SegmentedControl
            fullWidth
            label={t("livestock.productType")}
            value={type}
            onChange={setType}
            options={types.map((ty) => ({ value: ty, label: t(`livestock.products.${ty}`), icon: PRODUCT_ICON[ty] }))}
          />
        )}
        <Input
          label={`${t("livestock.quantity")} (${unitLabel})`}
          type="number"
          inputMode="decimal"
          min={0}
          step={type === "eggs" ? 1 : 0.1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          autoFocus
        />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Input label={t("harvest.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ feed

type FeedUnit = FeedEntry["unit"];

export function FeedDialog({ open, onClose, entry, animalId }: RecordDialogProps<FeedEntry>) {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!open) return;
    setAid(animalId ?? entry?.animalId ?? animals[0]?.id ?? "");
    setFeedType(entry?.feedType ?? "");
    setQty(entry ? String(entry.quantity) : "");
    setUnit(entry?.unit ?? "kg");
    setCost(entry?.cost !== undefined ? String(entry.cost) : "");
    setDate(entry?.date ?? todayISO());
    setNotes(entry?.notes ?? "");
  }, [open, entry, animalId, animals]);

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
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={entry ? t("common.save") : t("common.add")} onDelete={entry ? () => void deleteFeed(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && <Select label={t("livestock.selectAnimal")} value={aid} onChange={(e) => setAid(e.target.value)} options={animalOptions(animals, t)} />}
        <Input label={t("livestock.feedType")} value={feedType} onChange={(e) => setFeedType(e.target.value)} placeholder={t("livestock.feedTypePlaceholder")} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("livestock.quantity")} type="number" inputMode="decimal" min={0} step={0.1} value={qty} onChange={(e) => setQty(e.target.value)} />
          <Select
            label={t("livestock.unit")}
            value={unit}
            onChange={(e) => setUnit(e.target.value as FeedUnit)}
            options={[
              { value: "kg", label: t("livestock.units.kg") },
              { value: "g", label: t("livestock.units.g") },
              { value: "liters", label: t("livestock.units.liters") },
            ]}
          />
        </div>
        <Input label={t("livestock.cost")} hint={t("livestock.costHint")} type="number" inputMode="decimal" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Input label={t("harvest.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ health

export function HealthDialog({ open, onClose, entry, animalId, presetAnimalId, presetType }: RecordDialogProps<HealthEvent> & { presetAnimalId?: string; presetType?: HealthEventType }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { animals, addHealthEvent, updateHealthEvent } = useStore(useShallow((s) => ({ animals: s.animals, addHealthEvent: s.addHealthEvent, updateHealthEvent: s.updateHealthEvent })));
  const { deleteHealth } = useRecordActions();
  const [aid, setAid] = useState("");
  const [type, setType] = useState<HealthEventType>("checkup");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAid(animalId ?? entry?.animalId ?? presetAnimalId ?? animals[0]?.id ?? "");
    setType(entry?.type ?? presetType ?? "checkup");
    setDesc(entry?.description ?? "");
    setCost(entry?.cost !== undefined ? String(entry.cost) : "");
    setDate(entry?.date ?? todayISO());
    setNotes(entry?.notes ?? "");
  }, [open, entry, animalId, animals, presetAnimalId, presetType]);

  const costNum = parseNum(cost);
  const canSave = !!aid && desc.trim() !== "";

  const save = () => {
    if (!canSave) return;
    const fields = {
      animalId: aid, date, type, description: desc.trim(),
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
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={entry ? t("common.save") : t("common.add")} onDelete={entry ? () => void deleteHealth(entry).then((ok) => ok && onClose()) : undefined} />}
    >
      <div className="space-y-4">
        {!animalId && <Select label={t("livestock.selectAnimal")} value={aid} onChange={(e) => setAid(e.target.value)} options={animalOptions(animals, t)} />}
        <Select
          label={t("livestock.healthType")}
          value={type}
          onChange={(e) => setType(e.target.value as HealthEventType)}
          options={HEALTH_EVENT_TYPES.map((ty) => ({ value: ty, label: t(`livestock.healthTypes.${ty}`) }))}
        />
        <Input label={t("livestock.healthDesc")} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("livestock.healthDescPlaceholder")} autoFocus />
        <Input label={t("livestock.cost")} hint={t("livestock.costHint")} type="number" inputMode="decimal" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} />
        <DateField label={t("harvest.date")} value={date} onChange={setDate} />
        <Textarea label={t("harvest.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ animal

export function AnimalDialog({ open, onClose, animal, onDeleted }: { open: boolean; onClose: () => void; animal?: Animal; onDeleted?: () => void }) {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const s = useStore(useShallow((st) => ({
    addAnimal: st.addAnimal, updateAnimal: st.updateAnimal, deleteAnimal: st.deleteAnimal, restoreAnimal: st.restoreAnimal,
  })));
  const [type, setType] = useState<AnimalType>("chicken");
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [acquired, setAcquired] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setType(animal?.type ?? "chicken");
    setName(animal?.name ?? "");
    setCount(String(animal?.count ?? 1));
    setNotes(animal?.notes ?? "");
    setAcquired(animal?.acquiredDate ?? todayISO());
  }, [open, animal]);

  const n = parseNum(count);
  const canSave = Number.isInteger(n) && n >= (animal ? 0 : 1);

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
    if (!(await confirm(t("livestock.confirmDeleteAnimal"), { confirmLabel: t("common.delete") }))) return;
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
      footer={<DialogFooter onCancel={onClose} onSave={save} canSave={canSave} saveLabel={animal ? t("common.save") : t("common.add")} onDelete={animal ? () => void remove() : undefined} />}
    >
      <div className="space-y-4">
        {!animal && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t("livestock.animalType")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ANIMAL_TYPES.map((ty) => {
                const Icon = ANIMAL_ICON[ty];
                const selected = type === ty;
                return (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(ty)}
                    className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-garden-600 bg-garden-50 font-medium text-garden-800 dark:border-garden-400 dark:bg-garden-500/15 dark:text-garden-200"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {t(`livestock.types.${ty}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        <Input label={t("livestock.animalName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("livestock.namePlaceholder")} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("livestock.count")} type="number" inputMode="numeric" min={animal ? 0 : 1} step={1} value={count} onChange={(e) => setCount(e.target.value)} />
          <Input label={t("livestock.acquired")} type="date" value={acquired} onChange={(e) => setAcquired(e.target.value)} />
        </div>
        <Textarea label={t("harvest.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("livestock.notesPlaceholder")} />
      </div>
    </Modal>
  );
}

export { ANIMAL_ICON, HEALTH_ICON, PRODUCT_ICON };
