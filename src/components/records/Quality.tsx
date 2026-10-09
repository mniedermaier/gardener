import { memo, useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { LABEL_CLASS } from "@/components/ui/Field";

export type Quality = 1 | 2 | 3 | 4 | 5;
const LEVELS: Quality[] = [1, 2, 3, 4, 5];

/** Read-only rating, e.g. in a list row: five small stars with a text name. */
export const QualityStars = memo(function QualityStars({ value }: { value: number }) {
  const { t } = useTranslation();
  const label = t("harvest.stars", { count: value });
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex items-center gap-px">
      {LEVELS.map((q) => (
        <Star key={q} size={12} aria-hidden="true" className={q <= (value ?? 0) ? "text-amber-500 dark:text-amber-400" : "text-gray-300 dark:text-gray-600"} fill={q <= (value ?? 0) ? "currentColor" : "none"} />
      ))}
    </span>
  );
});

/** Star rating input: a radio group (arrow keys move), 44 px targets. */
export function QualityInput({ label, value, onChange }: { label: string; value: Quality | null; onChange: (q: Quality) => void }) {
  const { t } = useTranslation();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = Math.min(5, Math.max(1, (value ?? 3) + delta)) as Quality;
    onChange(next);
    refs.current[next - 1]?.focus();
  };
  return (
    <div>
      <p className={LABEL_CLASS}>
        {label}{value === null
          ? <span className="font-normal text-gray-500 dark:text-gray-400"> {t("common.optionalMark")}</span>
          : <>: <span className="font-normal text-gray-600 dark:text-gray-400">{t(`harvest.qualityLevel.${value}`)}</span></>}
      </p>
      {/* Stars and endpoint captions share one box, so the right caption ends under star 5 (as on the pest scale). */}
      <div className="-ml-2 inline-flex flex-col">
      <div role="radiogroup" aria-label={label} className="flex">
        {LEVELS.map((q) => (
          <button
            key={q}
            ref={(el) => { refs.current[q - 1] = el; }}
            type="button"
            role="radio"
            aria-checked={q === value}
            aria-label={t("harvest.stars", { count: q })}
            tabIndex={q === (value ?? 1) ? 0 : -1}
            onClick={() => onChange(q)}
            onKeyDown={onKeyDown}
            className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-gray-100 sm:size-10 dark:hover:bg-white/10"
          >
            <Star size={24} aria-hidden="true" className={q <= (value ?? 0) ? "text-amber-500 dark:text-amber-400" : "text-gray-300 dark:text-gray-600"} fill={q <= (value ?? 0) ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      {/* Short endpoint words, so the right one sits under star 5 (the full level name is in the label above). */}
      <div className="flex justify-between gap-4 px-2.5 text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
        <span>{t("harvest.qualityScaleLow")}</span>
        <span className="text-right">{t("harvest.qualityScaleHigh")}</span>
      </div>
      </div>
    </div>
  );
}
