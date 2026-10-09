/**
 * Locale-aware formatting for everything the UI shows as number or date.
 * Components use `useFormat()` (re-renders on language change); plain
 * modules may call the functions directly — they default to the current
 * i18n language. Never use toFixed()/raw ISO strings in the UI.
 */
import i18n from "i18next";
import { differenceInCalendarDays, format as formatISO, isValid, parseISO, startOfDay } from "date-fns";

/** App language → BCP 47 locale for Intl. en-GB: day-month order, metric. */
const LOCALES: Record<string, string> = { de: "de-DE", en: "en-GB", es: "es-ES", fr: "fr-FR" };

export function intlLocale(lang?: string): string {
  const base = (lang ?? i18n.resolvedLanguage ?? i18n.language ?? "de").split("-")[0];
  return LOCALES[base] ?? LOCALES.de;
}

export type DateInput = Date | string | number;

/**
 * Typographic minus: Intl prints a hyphen-minus ("-6 °C"), which Inter sets
 * short and with a visible gap in tabular figures. Every number formatter
 * returns U+2212 instead ("−6 °C", "−181,51 €"). Rounding to zero never shows
 * a sign ("−0 °C" → "0 °C").
 */
const MINUS = "\u2212";
function withMinus(text: string): string {
  return text.replace(/-/g, MINUS);
}
/** Number and unit stay on one line ("1 °C", "1,9 kg", "473,10 €"): non-breaking space. */
function keepTogether(text: string): string {
  return text.replace(/ /g, "\u00a0");
}
/** Values that round to 0 must not keep their sign. */
function noNegativeZero(value: number, maximumFractionDigits: number): number {
  const f = 10 ** maximumFractionDigits;
  return Math.round(value * f) === 0 ? 0 : value;
}
/**
 * - short:     "3. Okt." (current year) / "3. Okt. 2025" — lists, compact (non-breaking spaces)
 * - numeric:   "03.10.2026"                              — tables, exports
 * - long:      "Samstag, 3. Oktober 2026"                — headers, details
 * - relative:  "Heute", "Gestern", "Vor 3 Tagen", "In 2 Tagen"; beyond ±6 days falls back to short
 * - relativeInline: the same in the middle of a sentence ("zuletzt vor 3 Tagen")
 * - monthYear: "Oktober 2026"                            — group headers
 * - month:     "Okt."                                    — chart axes
 * - weekday:   "Sa."                                     — weather strips
 * - weekdayDate: "Mo., 12. Okt."                          — the coming week (one format per group)
 */
export type DateStyle = "short" | "numeric" | "long" | "relative" | "relativeInline" | "monthYear" | "month" | "weekday" | "weekdayDate";

export interface FormatOptions {
  locale?: string;
}

/** Parses Date, timestamp or ISO string. "2026-10-03" is a *local* date (not UTC). */
export function toDate(value: DateInput): Date | null {
  const d = value instanceof Date ? value : typeof value === "number" ? new Date(value) : parseISO(value);
  return isValid(d) ? d : null;
}

/** Date → "yyyy-MM-dd" for storage (local date). */
export function toISODate(value: DateInput = new Date()): string {
  const d = toDate(value);
  return d ? formatISO(d, "yyyy-MM-dd") : "";
}

/** Today as "yyyy-MM-dd" — the storage format of all date fields. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(value: DateInput, style: DateStyle = "short", opts: FormatOptions & { now?: Date } = {}): string {
  const d = toDate(value);
  if (!d) return "";
  const locale = intlLocale(opts.locale);
  const now = opts.now ?? new Date();

  switch (style) {
    case "relative":
    case "relativeInline": {
      const diff = differenceInCalendarDays(startOfDay(d), startOfDay(now));
      if (Math.abs(diff) <= 6) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        const text = rtf.format(diff, "day");
        return style === "relative" ? capitalizeFirst(text, locale) : text;
      }
      return formatDate(d, "short", { ...opts, now });
    }
    case "numeric":
      return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    case "long":
      return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
    case "monthYear":
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
    case "month":
      return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
    case "weekday":
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    case "weekdayDate":
      return nonBreaking(new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d));
    case "short":
    default: {
      const sameYear = d.getFullYear() === now.getFullYear();
      return nonBreaking(new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).format(d));
    }
  }
}

/** Compact dates wrap as a whole ("15. Sept."), never between day and month. */
function nonBreaking(text: string): string {
  return text.replace(/ /g, "\u00a0");
}

/** "heute" at the start of a sentence/cell reads better as "Heute". */
function capitalizeFirst(text: string, locale: string): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

export interface NumberOptions extends FormatOptions {
  /** Default 1 */
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

/** 1234.5 → "1.234,5" (de) / "1,234.5" (en). */
export function formatNumber(value: number, opts: NumberOptions = {}): string {
  if (!Number.isFinite(value)) return "–";
  const { maximumFractionDigits = 1, minimumFractionDigits = 0 } = opts;
  const max = Math.max(maximumFractionDigits, minimumFractionDigits);
  return withMinus(new Intl.NumberFormat(intlLocale(opts.locale), {
    maximumFractionDigits: max,
    minimumFractionDigits,
  }).format(noNegativeZero(value, max)));
}

/**
 * Weight given in **grams**: < 1 kg → "750 g", otherwise kg with one decimal
 * ("1,9 kg"), from 100 kg without decimals ("252 kg"). Pass `unit: "kg"` to
 * force kilograms (e.g. for a column that must be comparable).
 */
export function formatWeight(grams: number, opts: FormatOptions & { unit?: "g" | "kg" } = {}): string {
  if (!Number.isFinite(grams)) return "–";
  const locale = intlLocale(opts.locale);
  const useKg = opts.unit === "kg" || (opts.unit !== "g" && Math.abs(grams) >= 1000);
  if (!useKg) {
    return keepTogether(withMinus(new Intl.NumberFormat(locale, { style: "unit", unit: "gram", maximumFractionDigits: 0 }).format(noNegativeZero(grams, 0))));
  }
  const kg = grams / 1000;
  return keepTogether(withMinus(new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilogram",
    maximumFractionDigits: Math.abs(kg) >= 100 ? 0 : 1,
  }).format(kg)));
}

/** Amount in **euros** (not cents): 473.1 → "473,10 €" (de) / "€473.10" (en). */
export function formatCurrency(amount: number, opts: FormatOptions & { currency?: string; maximumFractionDigits?: number } = {}): string {
  if (!Number.isFinite(amount)) return "–";
  const max = opts.maximumFractionDigits ?? 2;
  return keepTogether(withMinus(new Intl.NumberFormat(intlLocale(opts.locale), {
    style: "currency",
    currency: opts.currency ?? "EUR",
    maximumFractionDigits: max,
    minimumFractionDigits: Math.min(2, max),
  }).format(noNegativeZero(amount, max))));
}

/** Volume in **litres**: 10 → "10 l"; up to one decimal. */
export function formatVolume(liters: number, opts: FormatOptions = {}): string {
  if (!Number.isFinite(liters)) return "–";
  return keepTogether(withMinus(new Intl.NumberFormat(intlLocale(opts.locale), { style: "unit", unit: "liter", maximumFractionDigits: 1 }).format(noNegativeZero(liters, 1))));
}

/** Area in m²: 13.5 → "13,5 m²". */
export function formatArea(squareMeters: number, opts: FormatOptions = {}): string {
  if (!Number.isFinite(squareMeters)) return "–";
  return `${formatNumber(squareMeters, { ...opts, maximumFractionDigits: 1 })} m²`;
}

/** Temperature in °C: -1.4 → "−1 °C" (true minus sign), -0.3 → "0 °C". */
export function formatTemperature(celsius: number, opts: FormatOptions = {}): string {
  if (!Number.isFinite(celsius)) return "–";
  return keepTogether(withMinus(new Intl.NumberFormat(intlLocale(opts.locale), { style: "unit", unit: "celsius", maximumFractionDigits: 0 }).format(noNegativeZero(celsius, 0))));
}

/**
 * Takes a **ratio** (0.25 → "25 %" in de, "25%" in en). For values that are
 * already percentages, divide by 100 first.
 */
export function formatPercent(ratio: number, opts: FormatOptions & { maximumFractionDigits?: number } = {}): string {
  if (!Number.isFinite(ratio)) return "–";
  const max = opts.maximumFractionDigits ?? 0;
  return keepTogether(withMinus(new Intl.NumberFormat(intlLocale(opts.locale), { style: "percent", maximumFractionDigits: max }).format(noNegativeZero(ratio, max + 2))));
}

/** All formatters bound to one language — what useFormat() returns. */
export function createFormatter(lang?: string) {
  const locale = intlLocale(lang);
  return {
    locale,
    formatDate: (value: DateInput, style: DateStyle = "short", now?: Date) => formatDate(value, style, { locale, now }),
    formatNumber: (value: number, o: Omit<NumberOptions, "locale"> = {}) => formatNumber(value, { ...o, locale }),
    formatWeight: (grams: number, unit?: "g" | "kg") => formatWeight(grams, { locale, unit }),
    formatCurrency: (amount: number, o: { currency?: string; maximumFractionDigits?: number } = {}) => formatCurrency(amount, { ...o, locale }),
    formatVolume: (liters: number) => formatVolume(liters, { locale }),
    formatArea: (squareMeters: number) => formatArea(squareMeters, { locale }),
    formatTemperature: (celsius: number) => formatTemperature(celsius, { locale }),
    formatPercent: (ratio: number, maximumFractionDigits?: number) => formatPercent(ratio, { locale, maximumFractionDigits }),
  };
}

export type Formatter = ReturnType<typeof createFormatter>;
