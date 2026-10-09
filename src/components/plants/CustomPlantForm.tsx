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
import type { Plant, PlantCategory, SunRequirement, WaterNeed } from "@/types/plant";

// The icon of a custom plant is user content, so an emoji is allowed here.
const ICONS = ["🌿", "🌱", "🌾", "🌽", "🌸", "🥬", "🫚", "🍇", "🍒", "🪴"];

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
  icon: string;
  sun: SunRequirement;
  water: WaterNeed;
  spacingCm: number;
  harvestMin: number;
  harvestMax: number;
}

const EMPTY: Draft = { name: "", category: "vegetable", icon: ICONS[0], sun: "full", water: "medium", spacingCm: 30, harvestMin: 60, harvestMax: 90 };

function toDraft(p?: Plant): Draft {
  if (!p) return EMPTY;
  return {
    name: p.displayName ?? "", category: p.category, icon: p.icon, sun: p.sunRequirement, water: p.waterNeed,
    spacingCm: p.spacingCm, harvestMin: p.harvestDaysMin, harvestMax: p.harvestDaysMax,
  };
}

/** One dialog for creating and editing a custom plant. Mount with a `key` per plant so the draft resets. */
export function CustomPlantForm({ open, onClose, plant, onDeleted }: Props) {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { addCustomPlant, updateCustomPlant, deleteCustomPlant } = useStore(
    useShallow((s) => ({ addCustomPlant: s.addCustomPlant, updateCustomPlant: s.updateCustomPlant, deleteCustomPlant: s.deleteCustomPlant })),
  );
  const [draft, setDraft] = useState<Draft>(() => toDraft(plant));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const name = draft.name.trim();
  const harvestError = draft.harvestMax < draft.harvestMin ? t("plants.form.harvestError") : undefined;
  const valid = name.length > 0 && !harvestError;

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
    };
    if (plant) {
      updateCustomPlant(plant.id, fields);
      toast(t("plants.saved", { name }), "success");
    } else {
      const id = `custom-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      addCustomPlant({
        id, ...fields,
        sowIndoorsWeeks: null, sowOutdoorsWeeks: 0, transplantWeeks: null,
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
        <Input label={t("plants.customName")} value={draft.name} onChange={(e) => patch({ name: e.target.value })} autoFocus />

        <div>
          <span id="custom-plant-icon-label" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("plants.customIcon")}
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-labelledby="custom-plant-icon-label">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => patch({ icon: ic })}
                aria-label={ic}
                aria-pressed={draft.icon === ic}
                className={`flex size-11 items-center justify-center rounded-lg text-xl sm:size-10 ${
                  draft.icon === ic
                    ? "bg-garden-50 ring-2 ring-garden-500 dark:bg-garden-500/15"
                    : "hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <Select
          label={t("plants.form.category")}
          value={draft.category}
          onChange={(e) => patch({ category: e.target.value as PlantCategory })}
          options={(["vegetable", "fruit", "berry", "herb"] as const).map((c) => ({ value: c, label: t(`plants.category.${c}`) }))}
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

        <Input
          label={t("plants.form.spacingCm")}
          type="number" min={5} max={200}
          value={draft.spacingCm}
          onChange={(e) => patch({ spacingCm: Number(e.target.value) })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("plants.form.harvestMin")}
            type="number" min={10} max={365}
            value={draft.harvestMin}
            onChange={(e) => patch({ harvestMin: Number(e.target.value) })}
          />
          <Input
            label={t("plants.form.harvestMax")}
            type="number" min={10} max={365}
            value={draft.harvestMax}
            error={harvestError}
            onChange={(e) => patch({ harvestMax: Number(e.target.value) })}
          />
        </div>
      </div>
    </Modal>
  );
}
