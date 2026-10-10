import { describe, it, expect } from "vitest";
import {
  createFormatter,
  formatArea,
  formatCurrency,
  formatDate,
  formatDateRange,
  formatNumber,
  formatPercent,
  roundShares,
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
    expect(formatDate("2026-10-03", "short", { locale: "de", now: NOW })).toBe("3.\u00a0Okt.");
    expect(formatDate("2025-10-03", "short", { locale: "de", now: NOW })).toBe("3.\u00a0Okt.\u00a02025");
    expect(formatDate("2026-10-03", "short", { locale: "en", now: NOW })).toBe("3\u00a0Oct");
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
    expect(rel("2026-09-01")).toBe("1.\u00a0Sept.");
    expect(rel("2026-10-04", "en")).toBe("Yesterday");
    expect(rel("2026-10-02", "es")).toBe("Hace 3 días");
  });

  it("relativeInline stays lower case for the middle of a sentence", () => {
    const inl = (iso: string, locale = "de") => formatDate(iso, "relativeInline", { locale, now: NOW });
    expect(inl("2026-10-02")).toBe("vor 3 Tagen");
    expect(inl("2026-10-04", "en")).toBe("yesterday");
    expect(inl("2026-09-01")).toBe("1.\u00a0Sept.");
  });
});

describe("formatDateRange", () => {
  it("writes a repeated month once, with a tight en dash", () => {
    expect(n(formatDateRange("2026-10-05", "2026-10-11", { locale: "de", now: NOW }))).toBe("5.–11. Okt.");
    expect(n(formatDateRange("2026-10-05", "2026-10-11", { locale: "en", now: NOW }))).toBe("5–11 Oct");
  });

  it("spans months without spaces around the dash", () => {
    expect(n(formatDateRange("2026-10-10", "2026-11-15", { locale: "de", now: NOW }))).toBe("10. Okt.–15. Nov.");
  });

  it("orders the dates and adds the year outside the current one", () => {
    expect(n(formatDateRange("2027-03-20", "2027-03-01", { locale: "de", now: NOW }))).toBe("1.–20. März 2027");
  });
});

describe("numbers and units", () => {
  it("formatNumber uses the locale's separators", () => {
    expect(formatNumber(1234.56, { locale: "de" })).toBe("1.234,6");
    expect(formatNumber(1234.56, { locale: "en" })).toBe("1,234.6");
    expect(formatNumber(2, { locale: "de", minimumFractionDigits: 2 })).toBe("2,00");
    expect(formatNumber(Number.NaN)).toBe("–");
  });

  it("never breaks between number and unit", () => {
    for (const text of [formatWeight(750, { locale: "de" }), formatTemperature(1, { locale: "de" }), formatVolume(10, { locale: "fr" }), formatPercent(0.25, { locale: "de" }), formatCurrency(4.5, { locale: "de" }), formatArea(2, { locale: "de" })]) {
      expect(text).not.toMatch(/ /);
    }
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
    expect(n(formatTemperature(-1.4, { locale: "de" }))).toBe("\u22121 °C");
    expect(n(formatTemperature(-0.3, { locale: "de" }))).toBe("0 °C");
    expect(n(formatCurrency(-181.51, { locale: "de" }))).toBe("\u2212181,51 €");
    expect(n(formatNumber(-2.5, { locale: "en" }))).toBe("\u22122.5");
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

describe("roundShares", () => {
  it("rounds parts so they add up to the rounded total", () => {
    // 0,84 % + 3,46 % = 4,3 %; rounding each alone would give 0,8 + 3,5.
    const [garden, animals] = roundShares([0.0084, 0.0346], 1);
    expect(garden + animals).toBeCloseTo(0.043, 6);
    expect(roundShares([0.0076, 0.0346], 1).reduce((a, b) => a + b)).toBeCloseTo(0.042, 6);
  });

  it("keeps exact values unchanged", () => {
    expect(roundShares([0.25, 0.5], 0)).toEqual([0.25, 0.5]);
  });
});
