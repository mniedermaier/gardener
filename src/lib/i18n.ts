import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import { deviceLocale } from "./deviceLocale";

function getStoredLocale(): string {
  try {
    const data = JSON.parse(localStorage.getItem("gardener-storage") ?? "{}");
    return data?.state?.locale ?? deviceLocale();
  } catch {
    return deviceLocale();
  }
}

// Plurals: i18next (v21+) resolves key_one/key_other via Intl.PluralRules
// (es/fr also need key_many). Pass the count option; see docs/DESIGN_SYSTEM.md.
i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getStoredLocale(),
    fallbackLng: "en",
    supportedLngs: ["en", "de", "es", "fr"],
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Screen readers and browser translation rely on this matching the UI language.
function syncDocumentLanguage(lng: string) {
  if (typeof document !== "undefined") document.documentElement.lang = lng;
}
syncDocumentLanguage(i18n.language ?? getStoredLocale());
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
