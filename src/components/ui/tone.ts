/**
 * Semantic tones shared by Badge, StatCard, Toast and friends. Colour carries
 * meaning only: positive = good/done, warning = needs attention soon,
 * danger = error/overdue/conflict, info = neutral hint, brand = garden green.
 */
export type Tone = "neutral" | "brand" | "positive" | "warning" | "danger" | "info";

/** Tinted surface + readable text, works in light and dark (tokens swap in .dark). */
export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  brand: "bg-garden-50 text-garden-700 dark:bg-garden-500/15 dark:text-garden-300",
  positive: "bg-positive/10 text-positive dark:bg-positive/15",
  warning: "bg-warning/10 text-warning dark:bg-warning/15",
  danger: "bg-danger/10 text-danger dark:bg-danger/15",
  info: "bg-info/10 text-info dark:bg-info/15",
};

export const TONE_OUTLINE: Record<Tone, string> = {
  neutral: "border-gray-300 text-gray-700 dark:border-white/20 dark:text-gray-300",
  brand: "border-garden-300 text-garden-700 dark:border-garden-500/40 dark:text-garden-300",
  positive: "border-positive/40 text-positive",
  warning: "border-warning/40 text-warning",
  danger: "border-danger/40 text-danger",
  info: "border-info/40 text-info",
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900",
  brand: "bg-garden-600 text-white",
  positive: "bg-positive text-white dark:text-gray-950",
  warning: "bg-warning text-white dark:text-gray-950",
  danger: "bg-danger text-white dark:text-gray-950",
  info: "bg-info text-white dark:text-gray-950",
};

/** Text only (icons, hints, trend values). */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-gray-500 dark:text-gray-400",
  brand: "text-garden-700 dark:text-garden-300",
  positive: "text-positive",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};
