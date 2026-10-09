import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { DotPattern, HatchPattern, Legend } from "./Legend";
import { axisLabelStep, niceScale, SERIES_FILL, SERIES_TEXT, useElementWidth, type SeriesColor } from "./scale";

export interface BarDatum {
  key: string;
  /** Axis label ("Okt."). */
  label: string;
  /** Full label for tooltip and table ("Oktober 2026"). */
  fullLabel?: string;
  /** One value per series, stacked bottom → top. */
  values: number[];
}

export interface BarSeries {
  label: string;
  color: SeriesColor;
  /** Hatched fill: use for forecasts/estimates so the meaning is not colour-only. */
  hatched?: boolean;
  /** Dotted fill: a second measured series of the same family (rain beside watering). */
  dotted?: boolean;
  /** Drawn with less emphasis, so another series stays the hero (animal products beside the garden). */
  muted?: boolean;
}

export interface BarChartProps {
  data: BarDatum[];
  series: BarSeries[];
  /** Value with unit for tooltip/table ("1,9 kg", "11 h"). */
  formatValue: (n: number) => string;
  /** Axis tick text; defaults to formatValue. */
  formatTick?: (n: number) => string;
  /** Accessible name and caption of the screen-reader table. Summarise the finding. */
  caption: string;
  /** Header of the category column of the table ("Monat"). */
  categoryLabel: string;
  /** Vertical "today" marker on a category. */
  marker?: { index: number; label: string };
  /** Horizontal reference line ("Bedarf", "Ziel"). */
  target?: { value: number; label: string };
  /** Fixed y maximum (e.g. 1 for ratios); otherwise a nice scale over the data. */
  max?: number;
  height?: number;
  /** Hide the legend (single series: the card title names it). Default: shown for ≥ 2 series. */
  legend?: boolean;
  className?: string;
}

const M = { top: 18, right: 8, bottom: 24 };

/**
 * Vertical (optionally stacked) bar chart in SVG: recessive grid with 3–4
 * ticks, thin bars with 4 px rounded tops, today marker, target line, hover
 * and keyboard tooltip (←/→), plus a visually hidden data table.
 */
export function BarChart({
  data, series, formatValue, formatTick = formatValue, caption, categoryLabel,
  marker, target, max, height = 180, legend, className = "",
}: BarChartProps) {
  const uid = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const totals = useMemo(() => data.map((d) => d.values.reduce((s, v) => s + Math.max(0, v), 0)), [data]);
  const { top, ticks } = useMemo(() => {
    if (max !== undefined) return niceScale(max, 4);
    return niceScale(Math.max(...totals, target?.value ?? 0, 0));
  }, [totals, max, target]);

  const tickLabels = ticks.map((t) => formatTick(t));
  const left = Math.min(64, Math.max(28, Math.max(...tickLabels.map((l) => l.length)) * 6.4 + 8));
  const plotW = Math.max(10, width - left - M.right);
  const plotH = height - M.top - M.bottom;
  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(36, band * 0.62));
  const y = (v: number) => M.top + plotH - (Math.min(v, top) / top) * plotH;
  // Thin the axis by the real label width ("KW 34" needs more room than "Okt.").
  const labelEvery = axisLabelStep(data.map((d) => d.label), band);
  // Labels start at the first bar (Jan, Mär, Mai …); the marker carries its own label.
  const labelAnchor = 0;
  const showLabel = (i: number) => (((i - labelAnchor) % labelEvery) + labelEvery) % labelEvery === 0;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  // The target line is named in the legend (a label on the line would sit on the bars).
  const showLegend = legend ?? (series.length > 1 || !!target);
  const activeDatum = active !== null ? data[active] : null;

  return (
    <figure className={`min-w-0 ${className}`}>
      <div
        ref={ref}
        className="relative w-full min-w-0 overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        tabIndex={0}
        role="slider"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, data.length - 1)}
        aria-valuenow={active ?? 0}
        aria-valuetext={activeDatum ? `${activeDatum.fullLabel ?? activeDatum.label}: ${series.map((s, k) => `${s.label} ${formatValue(activeDatum.values[k] ?? 0)}`).join(", ")}` : caption}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
      >
        {width === 0 ? <div style={{ height }} aria-hidden="true" /> : (
        <svg width={width} height={height} aria-hidden="true" className="block max-w-full">
          <defs>
            {series.map((s, i) => (s.hatched ? <HatchPattern key={i} id={`${uid}-h${i}`} className={SERIES_TEXT[s.color]} /> : s.dotted ? <DotPattern key={i} id={`${uid}-h${i}`} className={SERIES_TEXT[s.color]} /> : null))}
          </defs>
          {/* grid + y ticks */}
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} className={i === 0 ? "stroke-gray-300 dark:stroke-white/20" : "stroke-gray-100 dark:stroke-white/5"} />
              <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[11px] tabular-nums dark:fill-gray-400">
                {tickLabels[i]}
              </text>
            </g>
          ))}
          {/* "today" marker behind the bars, so it never crosses a segment */}
          {marker && marker.index >= 0 && marker.index < data.length && (
            <g>
              <line
                x1={left + band * marker.index + band / 2}
                x2={left + band * marker.index + band / 2}
                y1={M.top - 4}
                y2={M.top + plotH}
                className="stroke-gray-900/40 dark:stroke-white/40"
                strokeDasharray="2 2"
              />
              <text x={left + band * marker.index + band / 2} y={M.top - 7} textAnchor="middle" className="fill-gray-900 text-[11px] font-semibold dark:fill-gray-100">
                {marker.label}
              </text>
            </g>
          )}
          {/* bars */}
          {data.map((d, i) => {
            const cx = left + band * i + band / 2;
            let acc = 0;
            const lastIdx = d.values.reduce((li, v, k) => (v > 0 ? k : li), -1);
            return (
              <g key={d.key} className={active !== null && active !== i ? "opacity-60" : undefined}>
                {d.values.map((v, k) => {
                  if (v <= 0) return null;
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  // A value above zero stays visible as a segment (≥ 3 px), never a hairline.
                  const h = Math.max(3, y0 - y1 - (k < lastIdx ? 2 : 0));
                  const s = series[k];
                  const patterned = s.hatched || s.dotted;
                  const fill = patterned ? `url(#${uid}-h${k})` : undefined;
                  const cls = patterned ? SERIES_TEXT[s.color] : SERIES_FILL[s.color];
                  const r = k === lastIdx ? Math.min(4, barW / 2, h) : 0;
                  const x0 = cx - barW / 2;
                  const top0 = y0 - h;
                  const path = `M${x0},${y0} V${top0 + r} Q${x0},${top0} ${x0 + r},${top0} H${x0 + barW - r} Q${x0 + barW},${top0} ${x0 + barW},${top0 + r} V${y0} Z`;
                  return <path key={k} d={path} className={s.muted ? `${cls} opacity-60` : cls} fill={fill} />;
                })}
                {showLabel(i) && (
                  <text
                    x={cx}
                    y={height - 6}
                    textAnchor="middle"
                    className={`text-[11px] ${i === marker?.index ? "fill-gray-900 font-semibold dark:fill-gray-100" : "fill-gray-500 dark:fill-gray-400"}`}
                  >
                    {d.label}
                  </text>
                )}
                {/* hit target: full band height */}
                <rect x={left + band * i} y={M.top} width={band} height={plotH} fill="transparent" onMouseEnter={() => setActive(i)} />
              </g>
            );
          })}
          {target && target.value <= top && (
            <g>
              <line x1={left} x2={left + plotW} y1={y(target.value)} y2={y(target.value)} strokeDasharray="4 3" className="stroke-gray-700 dark:stroke-gray-300" strokeWidth={1.5} />
            </g>
          )}
        </svg>
        )}

        {activeDatum && active !== null && (
          <div
            className="pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-gray-800"
            style={{ left: Math.min(width - 70, Math.max(70, left + band * active + band / 2)), top: 0 }}
            aria-live="polite"
          >
            <p className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{activeDatum.fullLabel ?? activeDatum.label}</p>
            {series.map((s, k) => (
              <p key={s.label} className="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
                <span>{s.label}</span>
                <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatValue(activeDatum.values[k] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      {showLegend && (
        <Legend
          className="mt-2"
          items={[
            ...series.map((s) => ({ label: s.label, color: s.color, muted: s.muted, swatch: s.hatched ? ("hatched" as const) : s.dotted ? ("dotted" as const) : ("solid" as const) })),
            ...(target ? [{ label: target.label, color: "muted" as const, swatch: "line" as const }] : []),
          ]}
        />
      )}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{categoryLabel}</th>
              {series.map((s) => <th key={s.label} scope="col">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.fullLabel ?? d.label}</th>
                {series.map((s, k) => <td key={s.label}>{formatValue(d.values[k] ?? 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
