export type AppLocale = "de" | "en" | "es" | "fr";

const SUPPORTED: AppLocale[] = ["de", "en", "es", "fr"];

/**
 * First-run language: the device's preferred language when the app speaks it,
 * German otherwise (the app's default locale). A stored choice always wins —
 * this only fills the gap before the user has picked one.
 */
export function deviceLocale(): AppLocale {
  try {
    const prefs = typeof navigator === "undefined" ? [] : [...(navigator.languages ?? []), navigator.language];
    for (const tag of prefs) {
      const lang = tag?.slice(0, 2).toLowerCase() as AppLocale;
      if (SUPPORTED.includes(lang)) return lang;
    }
  } catch {
    // No navigator (tests, SSR): fall through to the default.
  }
  return "de";
}
