import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

function getStoredLocale(): string {
  try {
    const data = JSON.parse(localStorage.getItem("gardener-storage") ?? "{}");
    return data?.state?.locale ?? "de";
  } catch {
    return "de";
  }
}

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getStoredLocale(),
    fallbackLng: "en",
    supportedLngs: ["en", "de"],
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
