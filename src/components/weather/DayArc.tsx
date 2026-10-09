import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as SunCalc from "suncalc";
import { useFormat } from "@/hooks/useFormat";

const W = 300;
const PAD_X = 20;
const BASE = 66;
const PEAK = 12;

/** Point on the day arc (half ellipse) for progress 0 (sunrise) … 1 (sunset). */
function arcPoint(p: number): [number, number] {
  const a = Math.PI * (1 - p);
  const rx = (W - 2 * PAD_X) / 2;
  return [W / 2 + rx * Math.cos(a), BASE - (BASE - PEAK) * Math.sin(a)];
}

/**
 * The day at a glance: the sun's path from sunrise to sunset as an arc, the
 * part already behind us drawn solid, the sun where it stands now. Below the
 * horizon (night) the sun sits on the horizon at the nearer end, muted.
 */
export const DayArc = memo(function DayArc({ lat, lon, className = "" }: { lat: number; lon: number; className?: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  // Fixed when mounted; the page refreshes its data on demand anyway.
  const [now] = useState(() => new Date());

  const info = useMemo(() => {
    // Today's sun: SunCalc picks the solar day around the given instant, so just
    // after midnight "now" would return yesterday's rise and set — ask for local noon.
    const times = SunCalc.getTimes(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), lat, lon);
    if (!times.sunrise || !times.sunset || Number.isNaN(times.sunrise.getTime())) return null;
    const rise = times.sunrise.getTime();
    const set = times.sunset.getTime();
    const progress = (now.getTime() - rise) / (set - rise);
    return { rise: times.sunrise, set: times.sunset, hours: (set - rise) / 3_600_000, progress };
  }, [now, lat, lon]);

  if (!info) return null;
  const time = (d: Date) => new Intl.DateTimeFormat(f.locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  const p = Math.max(0, Math.min(1, info.progress));
  const day = info.progress > 0 && info.progress < 1;
  const [sx, sy] = arcPoint(p);
  const steps = 48;
  const path = (to: number) => {
    const n = Math.max(2, Math.round(steps * to) + 1);
    return Array.from({ length: n }, (_, i) => arcPoint((i / (n - 1)) * to))
      .map(([x, y], i) => `${i ? "L" : "M"}${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`)
      .join(" ");
  };
  const hours = t("sunlight.hoursValue", { hours: f.formatNumber(info.hours, { maximumFractionDigits: 1 }) });
  // What the arc means right now: daylight left, or when the sun went down / comes up.
  const left = Math.max(0, info.set.getTime() - now.getTime()) / 3_600_000;
  const status = day
    ? t("weather.daylightLeft", { hours: f.formatNumber(left, { maximumFractionDigits: 1 }) })
    : info.progress >= 1
      ? t("weather.afterSunset", { time: time(info.set) })
      : t("weather.beforeSunrise", { time: time(info.rise) });
  const label = t("weather.dayArcLabel", { sunrise: time(info.rise), sunset: time(info.set), hours });

  // Labels are HTML, not SVG text: the arc scales with its column, the text must stay ≥ 12 px.
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${BASE + 6}`} className="block h-auto w-full" role="img" aria-label={label}>
        <line x1={6} x2={W - 6} y1={BASE} y2={BASE} className="stroke-gray-200 dark:stroke-white/15" />
        <path d={path(1)} fill="none" strokeDasharray="3 4" strokeLinecap="round" className="stroke-gray-300 dark:stroke-white/30" strokeWidth={1.5} />
        {day && <path d={path(p)} fill="none" strokeLinecap="round" className="stroke-earth-300 dark:stroke-earth-400" strokeWidth={2.5} />}
        <circle cx={sx} cy={day ? sy : BASE} r={day ? 9 : 6} className={day ? "fill-earth-300/30 dark:fill-earth-400/25" : "fill-transparent"} />
        <circle cx={sx} cy={day ? sy : BASE} r={day ? 5 : 4} className={day ? "fill-earth-400 dark:fill-earth-300" : "fill-gray-300 dark:fill-gray-500"} />
      </svg>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-gray-500 tabular-nums dark:text-gray-400" aria-hidden="true">
        <span>{time(info.rise)}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{hours}</span>
        <span>{time(info.set)}</span>
      </div>
      <figcaption className="mt-1 text-center text-xs text-gray-600 dark:text-gray-400">{status}</figcaption>
    </figure>
  );
});
