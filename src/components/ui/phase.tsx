import { memo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { Apple, House, Shovel, Sprout } from "lucide-react";
import type { Phase } from "@/lib/season";

/**
 * Crop phases, one look everywhere (Kalender, Pflanzendetail, Dashboard,
 * Palette). Info blue (under glass) → green → earth ramp from the design tokens, plus a
 * second carrier that is not colour: an icon, and hatching for "under glass"
 * (Vorziehen). Rows in timelines keep a fixed phase order as a third cue.
 */
export const PHASE_META: Record<Phase, { icon: LucideIcon; bar: string; text: string; hatched: boolean }> = {
  // Under glass: the cool info hue, so it never reads as the earth-coloured harvest at small sizes.
  sowIndoors: { icon: House, bar: "bg-info/40 dark:bg-info/50", text: "text-info", hatched: true },
  sowOutdoors: { icon: Sprout, bar: "bg-garden-300 dark:bg-garden-400/70", text: "text-garden-600 dark:text-garden-300", hatched: false },
  transplant: { icon: Shovel, bar: "bg-garden-600 dark:bg-garden-300", text: "text-garden-700 dark:text-garden-300", hatched: false },
  harvest: { icon: Apple, bar: "bg-earth-500 dark:bg-earth-400", text: "text-earth-600 dark:text-earth-300", hatched: false },
};

const HATCH: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, rgb(255 255 255 / 0.55) 3px 5px)",
};

/** Class + style for a bar/swatch of a phase. */
export function phaseFill(phase: Phase): { className: string; style?: CSSProperties } {
  const meta = PHASE_META[phase];
  return { className: meta.bar, style: meta.hatched ? HATCH : undefined };
}

/** Small swatch for legends and list rows. */
export const PhaseSwatch = memo(function PhaseSwatch({ phase, className = "h-2.5 w-4" }: { phase: Phase; className?: string }) {
  const fill = phaseFill(phase);
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-sm ${fill.className} ${className}`} style={fill.style} />;
});

/** Phase as a neutral badge with its icon (text carries the meaning; one cue, no extra swatch). */
export const PhaseBadge = memo(function PhaseBadge({ phase, label }: { phase: Phase; label?: string }) {
  const { t } = useTranslation();
  const Icon = PHASE_META[phase].icon;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-700 dark:bg-white/10 dark:text-gray-300">
      <Icon size={12} aria-hidden="true" className={`shrink-0 ${PHASE_META[phase].text}`} />
      <span className="truncate">{label ?? t(`plants.details.${phase}`)}</span>
    </span>
  );
});

/** Legend for timelines. */
export const PhaseLegend = memo(function PhaseLegend({ phases }: { phases: Phase[] }) {
  const { t } = useTranslation();
  return (
    <>
      {phases.map((p) => {
        const Icon = PHASE_META[p].icon;
        return (
          <span key={p} className="inline-flex items-center gap-1.5">
            <PhaseSwatch phase={p} />
            <Icon size={13} aria-hidden="true" className={PHASE_META[p].text} />
            {t(`plants.details.${p}`)}
          </span>
        );
      })}
    </>
  );
});

/** Maps a sowing/planting action to its phase (for badges). */
export function actionPhase(action: string): Phase {
  if (action === "sow_indoors") return "sowIndoors";
  if (action === "sow_outdoors" || action === "sow_autumn") return "sowOutdoors";
  if (action === "harvest") return "harvest";
  return "transplant";
}
