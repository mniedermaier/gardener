import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { PlantCategory, SunRequirement, WaterNeed } from "@/types/plant";

const ICONS = ["\ud83c\udf3f", "\ud83c\udf31", "\ud83c\udf3e", "\ud83c\udf3d", "\ud83c\udf38", "\ud83e\udd6c", "\ud83e\udeda", "\ud83c\udf47", "\ud83c\udf52", "\ud83e\udeb4"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CustomPlantForm({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { addCustomPlant } = useStore(useShallow((s) => ({ addCustomPlant: s.addCustomPlant })));
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlantCategory>("vegetable");
  const [icon, setIcon] = useState("\ud83c\udf3f");
  const [sun, setSun] = useState<SunRequirement>("full");
  const [water, setWater] = useState<WaterNeed>("medium");
  const [spacingCm, setSpacingCm] = useState(30);
  const [harvestMin, setHarvestMin] = useState(60);
  const [harvestMax, setHarvestMax] = useState(90);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const id = `custom-${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    addCustomPlant({
      id,
      displayName: name.trim(),
      category,
      sowIndoorsWeeks: null,
      sowOutdoorsWeeks: 0,
      transplantWeeks: null,
      harvestDaysMin: harvestMin,
      harvestDaysMax: harvestMax,
      spacingCm,
      rowSpacingCm: spacingCm + 10,
      sunRequirement: sun,
      waterNeed: water,
      companions: [],
      antagonists: [],
      color: "#6b7280",
      icon,
    });
    setName("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("plants.addCustom")}>
      <div className="space-y-4">
        <Input label={t("plants.customName")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Icon</label>
          <div className="flex gap-1">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded text-lg ${icon === ic ? "ring-2 ring-garden-500 bg-garden-50 dark:bg-garden-900/30" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.category.vegetable")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PlantCategory)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {(["vegetable", "fruit", "berry", "herb"] as const).map((c) => (
                <option key={c} value={c}>{t(`plants.category.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.sun")}</label>
            <select
              value={sun}
              onChange={(e) => setSun(e.target.value as SunRequirement)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {(["full", "partial", "shade"] as const).map((s) => (
                <option key={s} value={s}>{t(`plants.sun.${s}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("plants.details.water")}</label>
            <select
              value={water}
              onChange={(e) => setWater(e.target.value as WaterNeed)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              {(["low", "medium", "high"] as const).map((w) => (
                <option key={w} value={w}>{t(`plants.water.${w}`)}</option>
              ))}
            </select>
          </div>
          <Input label={t("plants.details.spacing")} type="number" min={5} max={200} value={spacingCm} onChange={(e) => setSpacingCm(Number(e.target.value))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label={`${t("plants.details.harvest")} (min days)`} type="number" min={10} max={365} value={harvestMin} onChange={(e) => setHarvestMin(Number(e.target.value))} />
          <Input label={`${t("plants.details.harvest")} (max days)`} type="number" min={10} max={365} value={harvestMax} onChange={(e) => setHarvestMax(Number(e.target.value))} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit}>{t("common.add")}</Button>
        </div>
      </div>
    </Modal>
  );
}
