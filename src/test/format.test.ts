import { describe, it, expect } from "vitest";
import {
  createFormatter,
  formatArea,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatTemperature,
  formatVolume,
  formatWeight,
  intlLocale,
  toDate,
  toISODate,
} from "@/lib/format";

// Intl uses (narrow) no-break spaces in several locales; compare on plain spaces.
const n = (s: string) => s.replace(/[  ]/g, " ");
const NOW = new Date(2026, 9, 5, 14, 30); // Mon 5 Oct 2026, local time

describe("intlLocale", () => {
  it("maps app languages and falls back to German", () => {
    expect(intlLocale("de")).toBe("de-DE");
    expect(intlLocale("en")).toBe("en-GB");
    expect(intlLocale("fr-CA")).toBe("fr-FR");
    expect(intlLocale("xx")).toBe("de-DE");
  });
});

describe("toDate / toISODate", () => {
  it("parses a date-only ISO string as a local date", () => {
    const d = toDate("2026-10-03")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 3]);
    expect(toISODate(d)).toBe("2026-10-03");
  });

  it("returns null/empty for garbage", () => {
    expect(toDate("not a date")).toBeNull();
    expect(formatDate("", "short")).toBe("");
  });
});

describe("formatDate", () => {
  it("short omits the current year and keeps other years", () => {
    expect(formatDate("2026-10-03", "short", { locale: "de", now: NOW })).toBe("3. Okt.");
    expect(formatDate("2025-10-03", "short", { locale: "de", now: NOW })).toBe("3. Okt. 2025");
    expect(formatDate("2026-10-03", "short", { locale: "en", now: NOW })).toBe("3 Oct");
  });

  it("numeric and long", () => {
    expect(formatDate("2026-10-03", "numeric", { locale: "de" })).toBe("03.10.2026");
    expect(formatDate("2026-10-05", "long", { locale: "de" })).toBe("Montag, 5. Oktober 2026");
    expect(formatDate("2026-10-05", "monthYear", { locale: "fr" })).toBe("octobre 2026");
  });

  it("relative within a week, short beyond", () => {
    const rel = (iso: string, locale = "de") => formatDate(iso, "relative", { locale, now: NOW });
    expect(rel("2026-10-05")).toBe("Heute");
    expect(rel("2026-10-04")).toBe("Gestern");
    expect(rel("2026-10-06")).toBe("Morgen");
    expect(rel("2026-10-02")).toBe("Vor 3 Tagen");
    expect(rel("2026-10-08")).toBe("In 3 Tagen");
    expect(rel("2026-09-01")).toBe("1. Sept.");
    expect(rel("2026-10-04", "en")).toBe("Yesterday");
    expect(rel("2026-10-02", "es")).toBe("Hace 3 días");
  });
});

describe("numbers and units", () => {
  it("formatNumber uses the locale's separators", () => {
    expect(formatNumber(1234.56, { locale: "de" })).toBe("1.234,6");
    expect(formatNumber(1234.56, { locale: "en" })).toBe("1,234.6");
    expect(formatNumber(2, { locale: "de", minimumFractionDigits: 2 })).toBe("2,00");
    expect(formatNumber(Number.NaN)).toBe("–");
  });

  it("formatWeight switches between g and kg", () => {
    expect(n(formatWeight(750, { locale: "de" }))).toBe("750 g");
    expect(n(formatWeight(1900, { locale: "de" }))).toBe("1,9 kg");
    expect(n(formatWeight(55500, { locale: "en" }))).toBe("55.5 kg");
    expect(n(formatWeight(252000, { locale: "de" }))).toBe("252 kg");
    expect(n(formatWeight(500, { locale: "de", unit: "kg" }))).toBe("0,5 kg");
  });

  it("formatCurrency puts the euro sign where the locale wants it", () => {
    expect(n(formatCurrency(473.1, { locale: "de" }))).toBe("473,10 €");
    expect(n(formatCurrency(473.1, { locale: "en" }))).toBe("€473.10");
    expect(n(formatCurrency(1200, { locale: "fr" }))).toBe("1 200,00 €");
  });

  it("formatVolume, formatArea, formatTemperature, formatPercent", () => {
    expect(n(formatVolume(10, { locale: "de" }))).toBe("10 l");
    expect(n(formatVolume(2.25, { locale: "en" }))).toBe("2.3 l");
    expect(n(formatArea(13.5, { locale: "de" }))).toBe("13,5 m²");
    expect(n(formatTemperature(-1.4, { locale: "de" }))).toBe("-1 °C");
    expect(n(formatPercent(0.25, { locale: "de" }))).toBe("25 %");
    expect(n(formatPercent(0.25, { locale: "en" }))).toBe("25%");
  });
});

describe("createFormatter", () => {
  it("binds all formatters to one language", () => {
    const f = createFormatter("de");
    expect(f.locale).toBe("de-DE");
    expect(n(f.formatWeight(1900))).toBe("1,9 kg");
    expect(f.formatDate("2026-10-05", "relative", NOW)).toBe("Heute");
    expect(n(f.formatCurrency(5))).toBe("5,00 €");
  });
});
