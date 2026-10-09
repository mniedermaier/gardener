import { useEffect, useRef, useState } from "react";

/** 1/2/2.5/5 × 10^n step so that `max` fits in about `count` ticks. */
export function niceScale(max: number, count = 3): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks };
}

/**
 * Width of an element, kept in sync with ResizeObserver. Returns 0 until the
 * first measurement — render nothing wide before that, so a chart never
 * stretches its grid column (and then measures its own overflow).
 * `fallback` is used only where layout reports 0 (jsdom).
 */
export function useElementWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width || fallback);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

/**
 * Series colours. Fixed order, never cycled: brand green, earth, sky.
 * `sky` is the muted `water-*` steel blue (index.css), not Tailwind's cyan.
 * `rain` is its pale sibling, drawn dotted (rain next to watering): same
 * family, told apart by lightness and pattern, never by hue alone.
 * `fill`/`bg` classes are theme-aware; text never takes the series colour.
 */
export type SeriesColor = "brand" | "earth" | "sky" | "muted" | "rain";
export const SERIES_FILL: Record<SeriesColor, string> = {
  brand: "fill-garden-500 dark:fill-garden-400",
  earth: "fill-earth-300 dark:fill-earth-400",
  sky: "fill-water-400 dark:fill-water-300",
  muted: "fill-gray-300 dark:fill-gray-500",
  rain: "fill-water-200 dark:fill-water-600",
};
export const SERIES_BG: Record<SeriesColor, string> = {
  brand: "bg-garden-500 dark:bg-garden-400",
  earth: "bg-earth-300 dark:bg-earth-400",
  sky: "bg-water-400 dark:bg-water-300",
  muted: "bg-gray-300 dark:bg-gray-500",
  rain: "bg-water-200 dark:bg-water-600",
};
export const SERIES_STROKE: Record<SeriesColor, string> = {
  brand: "stroke-garden-500 dark:stroke-garden-400",
  earth: "stroke-earth-400 dark:stroke-earth-300",
  sky: "stroke-water-500 dark:stroke-water-300",
  muted: "stroke-gray-400 dark:stroke-gray-500",
  rain: "stroke-water-300 dark:stroke-water-500",
};
export const SERIES_TEXT: Record<SeriesColor, string> = {
  // Lighter than the solid fill in dark mode, so the hatch reads on gray-900.
  brand: "text-garden-500 dark:text-garden-300",
  earth: "text-earth-300 dark:text-earth-400",
  sky: "text-water-400 dark:text-water-300",
  muted: "text-gray-300 dark:text-gray-600",
  rain: "text-water-500 dark:text-water-300",
};

/** Rough width of an 11 px axis label in px (Inter, tabular figures). */
export function estimateLabelWidth(label: string): number {
  return label.length * 6.2 + 8;
}

/**
 * Show every n-th category label so neighbours never collide at the given
 * band width. BarChart anchors the step on the "today" marker (or the last
 * category) so the highlighted label is always one of the visible ones.
 */
export function axisLabelStep(labels: string[], band: number): number {
  if (band <= 0 || labels.length === 0) return 1;
  const widest = Math.max(...labels.map(estimateLabelWidth));
  return Math.max(1, Math.ceil(widest / band));
}
