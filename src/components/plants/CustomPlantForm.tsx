import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { usePlantName } from "@/hooks/usePlantName";
import type { Plant, PlantCategory, SunRequirement, WaterNeed } from "@/types/plant";
import { DEFAULT_SOWING, NEUTRAL_ICON, sowingDraftOf, sowingFields, type SowingDraft } from "@/lib/customPlant";
import { familyNameKeys, type PlantFamily } from "@/data/plantFamilies";

// The icon of a custom plant is the id of a catalogue SVG, so custom plants look
// like the rest of the catalogue (PlantIconDisplay also still renders old emoji icons).
const ICONS = ["lettuce", "kale", "carrot", "potato", "onion", "garlic", "bean", "corn", "pumpkin", "cucumber", "tomato", "pepper", "strawberry", "raspberry", "basil", "sunflower"];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Set → edit this custom plant; unset → create a new one. */
  plant?: Plant;
  onDeleted?: () => void;
}

interface Draft {
  name: string;
  category: PlantCategory;
  /** "" = not set: crop rotation treats the plant as "Sonstige". */
  family: PlantFamily | "";
  sowing: SowingDraft;
  icon: string;
  /** The user picked a symbol: changing the category no longer changes it. */
  iconTouched: boolean;
  sun: SunRequirement;
  water: WaterNeed;
  spacingCm: number;
  harvestMin: number;
  harvestMax: number;
}

const EMPTY: Draft = { name: "", category: "vegetable", family: "", sowing: DEFAULT_SOWING, icon: NEUTRAL_ICON, iconTouched: false, sun: "full", water: "medium", spacingCm: 0, harvestMin: 0, harvestMax: 0 };

const FAMILIES = (Object.keys(familyNameKeys) as PlantFamily[]).filter((f) => f !== "other");

/** Weeks relative to the last frost, as the timing selects offer them. */
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function toDraft(p?: Plant): Draft {
  if (!p) return EMPTY;
  return {
    name: p.displayName ?? "", category: p.category, family: p.family ?? "", sowing: sowingDraftOf(p), icon: p.icon, iconTouched: true, sun: p.sunRequirement, water: p.waterNeed,
    spacingCm: p.spacingCm, harvestMin: p.harvestDaysMin, harvestMax: p.harvestDaysMax,
  };
}

/** One dialog for creating and editing a custom plant. Mount with a `key` per plant so the draft resets. */
export function CustomPlantForm({ open, onClose, plant, onDeleted }: Props) {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const getPlantName = usePlantName();
  const { addCustomPlant, updateCustomPlant, deleteCustomPlant } = useStore(
    useShallow((s) => ({ addCustomPlant: s.addCustomPlant, updateCustomPlant: s.updateCustomPlant, deleteCustomPlant: s.deleteCustomPlant })),
  );
  const [draft, setDraft] = useState<Draft>(() => toDraft(plant));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const relLabel = (w: number) => (w === 0 ? t("plants.form.atFrost") : w < 0 ? t("plants.form.weeksBefore", { count: -w }) : t("plants.form.weeksAfter", { count: w }));
  const relOptions = (from: number, to: number) => range(from, to).map((w) => ({ value: String(w), label: relLabel(w) }));
  const patchSowing = (p: Partial<SowingDraft>) => setDraft((d) => ({ ...d, sowing: { ...d.sowing, ...p } }));

  const name = draft.name.trim();
  // Only once both are filled: typing "ab" before "bis" is not an error yet.
  const harvestError = draft.harvestMin > 0 && draft.harvestMax > 0 && draft.harvestMax < draft.harvestMin ? t("plants.form.harvestError") : undefined;
  const valid = name.length > 0 && !harvestError && draft.spacingCm > 0 && draft.harvestMin > 0;

  const handleSave = () => {
    if (!valid) return;
    const fields = {
      displayName: name,
      category: draft.category,
      icon: draft.icon,
      sunRequirement: draft.sun,
      waterNeed: draft.water,
      spacingCm: draft.spacingCm,
      rowSpacingCm: draft.spacingCm + 10,
      harvestDaysMin: draft.harvestMin,
      harvestDaysMax: draft.harvestMax,
      family: draft.family || undefined,
      ...sowingFields(draft.sowing),
    };
    if (plant) {
      updateCustomPlant(plant.id, fields);
      toast(t("plants.saved", { name }), "success");
    } else {
      const id = `custom-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      addCustomPlant({
        id, ...fields,
        companions: [], antagonists: [], color: "#6b7280",
      });
      toast(t("plants.added", { name }), "success");
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!plant) return;
    const label = plant.displayName ?? plant.id;
    if (!(await confirm(t("plants.deleteConfirm", { name: label }), { confirmLabel: t("common.delete") }))) return;
    deleteCustomPlant(plant.id);
    onClose();
    onDeleted?.();
    toast(t("plants.deleted", { name: label }), "success", {
      action: { label: t("common.undo"), onClick: () => addCustomPlant(plant) },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plant ? t("plants.editCustom") : t("plants.addCustom")}
      footer={
        <>
          {plant && (
            <Button variant="danger-ghost" className="mr-auto" onClick={() => void handleDelete()}>
              <Trash2 size={16} aria-hidden="true" />
              {t("common.delete")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={!valid}>{t("common.save")}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t("plants.customName")} value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t("plants.form.namePlaceholder")} autoFocus />
        {/* Symbol right after the name: it is identity, not a detail. */}
        <div>
          {/* The chosen symbol is named next to the label: no silent default. */}
          <span id="custom-plant-icon-label" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("plants.customIcon")}
            {ICONS.includes(draft.icon) && <span className="font-normal text-gray-600 dark:text-gray-400">: {getPlantName(draft.icon)}</span>}
          </span>
          {/* 16 icons: 4 × 4 on phones, 8 × 2 on wider screens — no row ends with a lone tile. Only an old emoji icon of an edited plant is added as an extra tile; the neutral default is not a choice. */}
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2" role="group" aria-labelledby="custom-plant-icon-label">
            {(ICONS.includes(draft.icon) || draft.icon === NEUTRAL_ICON ? ICONS : [...ICONS, draft.icon]).map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => patch({ icon: ic, iconTouched: true })}
                aria-label={ICONS.includes(ic) ? getPlantName(ic) : ic}
                title={ICONS.includes(ic) ? getPlantName(ic) : undefined}
                aria-pressed={draft.icon === ic}
                className={`flex h-11 items-center justify-center rounded-lg border ${
                  draft.icon === ic
                    ? "border-garden-500 bg-garden-50 ring-1 ring-garden-500 dark:bg-garden-500/15"
                    : "border-gray-200 hover:bg-gray-100 dark:border-white/10 dark:hover:bg-white/10"
                }`}
              >
                <PlantIconDisplay plantId={ic} emoji={ic} size={28} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t("plants.form.category")}
            value={draft.category}
            onChange={(e) => {
              const category = e.target.value as PlantCategory;
              patch({ category });
            }}
            options={(["vegetable", "fruit", "berry", "herb", "flower"] as const).map((c) => ({ value: c, label: t(`plants.category.${c}`) }))}
          />
          <Select
            label={t("plants.form.family")}
            optional
            value={draft.family}
            placeholder={t("plants.form.familyUnknown")}
            onChange={(e) => patch({ family: e.target.value as PlantFamily | "" })}
            options={FAMILIES.map((f) => ({ value: f, label: t(`planner.families.${f}`) }))}
          />
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.form.sowMode")}</p>
            <SegmentedControl
              fullWidth
              label={t("plants.form.sowMode")}
              value={draft.sowing.mode}
              onChange={(mode) => patchSowing({ mode })}
              options={[{ value: "direct", label: t("plants.form.sowDirect") }, { value: "indoors", label: t("plants.form.sowIndoors") }]}
            />
          </div>
          {draft.sowing.mode === "direct" ? (
            <Select label={t("plants.form.sowWhen")} value={String(draft.sowing.sowWeeks)} onChange={(e) => patchSowing({ sowWeeks: Number(e.target.value) })} options={relOptions(-8, 8)} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Select label={t("plants.form.indoorsWhen")} value={String(draft.sowing.indoorsWeeks)} onChange={(e) => patchSowing({ indoorsWeeks: Number(e.target.value) })} options={relOptions(-12, -1)} />
              <Select label={t("plants.form.transplantWhen")} value={String(draft.sowing.transplantWeeks)} onChange={(e) => patchSowing({ transplantWeeks: Number(e.target.value) })} options={relOptions(-4, 6)} />
            </div>
          )}
        </div>
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("plants.form.harvestMin")}
              inputMode="numeric"
              placeholder={t("common.examplePlaceholder", { value: 60 })}
              value={String(draft.harvestMin || "")}
              onChange={(e) => patch({ harvestMin: Number(e.target.value.replace(/\D/g, "")) })}
            />
            <Input
              label={t("plants.form.harvestMax")}
              inputMode="numeric"
              placeholder={t("common.examplePlaceholder", { value: 90 })}
              value={String(draft.harvestMax || "")}
              error={harvestError}
              onChange={(e) => patch({ harvestMax: Number(e.target.value.replace(/\D/g, "")) })}
            />
          </div>
          {/* One shared hint for both fields: what the days count from. */}
          {!harvestError && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("plants.form.daysAfterSowing")}</p>}
        </div>
        <Input
          label={t("plants.form.spacingCm")}
          inputMode="numeric"
          wrapperClassName="sm:w-1/2 sm:pr-2"
          placeholder={t("common.examplePlaceholder", { value: 30 })}
          value={String(draft.spacingCm || "")}
          onChange={(e) => patch({ spacingCm: Number(e.target.value.replace(/\D/g, "")) })}
        />
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.sun")}</p>
          <SegmentedControl
            fullWidth
            label={t("plants.details.sun")}
            value={draft.sun}
            onChange={(sun) => patch({ sun })}
            options={(["full", "partial", "shade"] as const).map((s) => ({ value: s, label: t(`plants.sun.${s}`) }))}
          />
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.water")}</p>
          <SegmentedControl
            fullWidth
            label={t("plants.details.water")}
            value={draft.water}
            onChange={(water) => patch({ water })}
            options={(["low", "medium", "high"] as const).map((w) => ({ value: w, label: t(`plants.water.${w}`) }))}
          />
        </div>


      </div>
    </Modal>
  );
}
