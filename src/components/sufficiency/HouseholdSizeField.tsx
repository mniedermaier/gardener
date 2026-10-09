import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { useAnalysisPrefs } from "@/store/analysisPrefs";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Household size stepper shared by Selbstversorgung and Ernährungsplan (one
 * value for both, stored in useAnalysisPrefs). − / + plus a typed value.
 */
export function HouseholdSizeField() {
  const { t } = useTranslation();
  const size = useAnalysisPrefs((s) => s.householdSize);
  const setSize = useAnalysisPrefs((s) => s.setHouseholdSize);
  const [text, setText] = useState(String(size));
  // Follow outside changes (the other page's stepper) without an effect.
  const [shown, setShown] = useState(size);
  if (shown !== size) {
    setShown(size);
    setText(String(size));
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="household-size" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("sufficiency.familySize")}</label>
      <div className="flex items-center rounded-lg border border-gray-300 bg-white dark:border-white/15 dark:bg-white/5">
        <IconButton icon={Minus} size="sm" label={t("sufficiency.fewerPeople")} onClick={() => setSize(size - 1)} disabled={size <= 1} />
        <input
          id="household-size"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) setSize(n);
          }}
          onBlur={() => setText(String(size))}
          className="min-h-11 w-10 appearance-none bg-transparent text-center sm:min-h-0 text-sm font-semibold tabular-nums text-gray-900 [-moz-appearance:textfield] focus-visible:outline-2 focus-visible:outline-focus dark:text-gray-100 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <IconButton icon={Plus} size="sm" label={t("sufficiency.morePeople")} onClick={() => setSize(size + 1)} disabled={size >= 20} />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{t("sufficiency.people", { count: size })}</span>
    </div>
  );
}
