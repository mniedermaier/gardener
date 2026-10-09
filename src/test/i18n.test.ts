import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import i18next from "i18next";

const LOCALES = ["de", "en", "es", "fr"] as const;
const LOCALE_DIR = "public/locales";
const SRC_DIR = "src";

type Json = { [key: string]: Json | string | string[] };

function flatten(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? flatten(value as Json, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function loadLocale(lang: string): Json {
  return JSON.parse(readFileSync(join(LOCALE_DIR, lang, "translation.json"), "utf8"));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (key: string) => key.replace(PLURAL_SUFFIX, "");

function flattenValues(obj: Json, prefix = ""): Array<[string, string]> {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? flattenValues(value as Json, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)] as [string, string]],
  );
}

/** Keys passed a `count` option in source: t("key", { count … }). */
function keysUsedWithCount(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"'$]+)["']\s*,\s*\{[^}]*\bcount\b/g)) {
      if (!found.has(match[1])) found.set(match[1], file);
    }
  }
  return found;
}

/** Static t("…") calls only — template literals are resolved at runtime and can't be checked here. */
function usedKeys(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC_DIR)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"'$]+)["']/g)) {
      if (!found.has(match[1])) found.set(match[1], file);
    }
  }
  return found;
}

describe("Translations", () => {
  it("never ends a sentence on a short date ('17. Okt.' + '.' → double period)", () => {
    for (const lang of LOCALES) {
      const bad = flattenValues(loadLocale(lang)).filter(([, v]) => /\{\{date\}\}\.$/.test(v)).map(([k]) => k);
      expect(bad, lang).toEqual([]);
    }
  });

  const keysByLocale = new Map(LOCALES.map((l) => [l, new Set(flatten(loadLocale(l)))]));
  const german = keysByLocale.get("de")!;
  const germanBases = new Set([...german].map(baseKey));

  it("defines every key used in the source", () => {
    const missing = [...usedKeys()]
      .filter(([key]) => !germanBases.has(key))
      .map(([key, file]) => `${key} (${file})`);

    expect(missing, `Keys used via t() but not defined in ${LOCALE_DIR}/de`).toEqual([]);
  });

  for (const locale of LOCALES.filter((l) => l !== "de")) {
    it(`keeps ${locale} in sync with de`, () => {
      // Compared on base keys: es/fr carry an extra _many plural form.
      const keys = new Set([...keysByLocale.get(locale)!].map(baseKey));
      const missing = [...germanBases].filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !germanBases.has(k));

      expect(missing, `Missing in ${locale}`).toEqual([]);
      expect(extra, `Present in ${locale} but not in de`).toEqual([]);
    });
  }

  describe("plurals", () => {
    for (const locale of LOCALES) {
      it(`${locale}: every plural key has exactly the forms Intl.PluralRules needs`, () => {
        const needed = [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories].sort();
        const keys = keysByLocale.get(locale)!;
        const forms = new Map<string, string[]>();
        for (const key of keys) {
          const m = key.match(PLURAL_SUFFIX);
          if (m) forms.set(baseKey(key), [...(forms.get(baseKey(key)) ?? []), m[1]]);
        }
        const wrong = [...forms]
          .filter(([, f]) => f.sort().join() !== needed.join())
          .map(([base, f]) => `${base}: has ${f.join("/")}, needs ${needed.join("/")}`);
        const clashing = [...forms.keys()].filter((base) => keys.has(base));

        expect(wrong).toEqual([]);
        expect(clashing, "Plain key next to its plural forms").toEqual([]);
      });

      it(`${locale}: {{count}} only appears in plural forms`, () => {
        const offenders = flattenValues(loadLocale(locale))
          .filter(([key, value]) => value.includes("{{count}}") && !PLURAL_SUFFIX.test(key))
          .map(([key]) => key);
        expect(offenders, "Use key_one/key_other and t(key, { count })").toEqual([]);
      });
    }

    it("pluralises the same keys in every language", () => {
      const pluralBases = (l: (typeof LOCALES)[number]) =>
        new Set([...keysByLocale.get(l)!].filter((k) => PLURAL_SUFFIX.test(k)).map(baseKey));
      const de = pluralBases("de");
      for (const locale of LOCALES) {
        expect([...pluralBases(locale)].sort(), locale).toEqual([...de].sort());
      }
    });

    it("every t(key, { count }) in the source points at a plural key", () => {
      const pluralBases = new Set([...german].filter((k) => PLURAL_SUFFIX.test(k)).map(baseKey));
      const used = keysUsedWithCount();
      expect(used.size, "regex still finds count calls").toBeGreaterThan(5);
      const notPlural = [...used]
        .filter(([key]) => !pluralBases.has(key))
        .map(([key, file]) => `${key} (${file})`);
      expect(notPlural).toEqual([]);
    });

    it("resolves plural forms at runtime", async () => {
      const instance = i18next.createInstance();
      await instance.init({
        lng: "de",
        fallbackLng: false,
        resources: Object.fromEntries(LOCALES.map((l) => [l, { translation: loadLocale(l) }])),
      });
      expect(instance.t("dashboard.overdueCount", { count: 1 })).toBe("1 Aufgabe überfällig");
      expect(instance.t("dashboard.overdueCount", { count: 3 })).toBe("3 Aufgaben überfällig");
      expect(instance.t("seeds.yearsLeft", { count: 1 })).toBe("noch 1 Jahr");
      expect(instance.t("seeds.yearsLeft", { count: 1, lng: "en" })).toBe("1 year left");
      expect(instance.t("seeds.yearsLeft", { count: 0, lng: "fr" })).toBe("encore 0 an");
      expect(instance.t("seeds.yearsLeft", { count: 1_000_000, lng: "es" })).toBe("quedan 1000000 años");
    });
  });
});
