import { useTranslation } from "react-i18next";

export function usePlantName() {
  const { t } = useTranslation();

  return (plantId: string): string => {
    if (plantId.startsWith("custom-")) {
      return localStorage.getItem(`plant-name-${plantId}`) ?? plantId;
    }
    const key = `plants.catalog.${plantId}.name`;
    const translated = t(key);
    // If i18next returns the key itself, it means no translation exists
    if (translated === key) {
      return localStorage.getItem(`plant-name-${plantId}`) ?? plantId;
    }
    return translated;
  };
}
