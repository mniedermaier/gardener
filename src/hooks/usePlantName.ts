import { useTranslation } from "react-i18next";
import { usePlantMap } from "./usePlants";

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
