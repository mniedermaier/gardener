import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePlantMap, usePlants } from "./usePlants";

export function usePlantName() {
  const { t } = useTranslation();
  const plantMap = usePlantMap();

  return (plantId: string): string => {
    const plant = plantMap.get(plantId);
    if (plant?.displayName) {
      return plant.displayName;
    }
    const key = `plants.catalog.${plantId}.name`;
    const translated = t(key);
    if (translated === key) {
      return plantId;
    }
    return translated;
  };
}

/**
 * All plants (built-in + custom) as `<Select>` options, sorted alphabetically
 * by their localized name — the same order as the plant combobox and the
 * plant list, never the JSON order.
 */
export function usePlantOptions(): { value: string; label: string }[] {
  const { t, i18n } = useTranslation();
  const plants = usePlants();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => {
    const collator = new Intl.Collator(lang);
    return plants
      .map((p) => ({ value: p.id, label: p.displayName ?? t(`plants.catalog.${p.id}.name`, { defaultValue: p.id }) }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }, [plants, t, lang]);
}
