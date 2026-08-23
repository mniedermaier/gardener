import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
  const keysByLocale = new Map(LOCALES.map((l) => [l, new Set(flatten(loadLocale(l)))]));
  const german = keysByLocale.get("de")!;

  it("defines every key used in the source", () => {
    const missing = [...usedKeys()]
      .filter(([key]) => !german.has(key))
      .map(([key, file]) => `${key} (${file})`);

    expect(missing, `Keys used via t() but not defined in ${LOCALE_DIR}/de`).toEqual([]);
  });

  for (const locale of LOCALES.filter((l) => l !== "de")) {
    it(`keeps ${locale} in sync with de`, () => {
      const keys = keysByLocale.get(locale)!;
      const missing = [...german].filter((k) => !keys.has(k));
      const extra = [...keys].filter((k) => !german.has(k));

      expect(missing, `Missing in ${locale}`).toEqual([]);
      expect(extra, `Present in ${locale} but not in de`).toEqual([]);
    });
  }
});
