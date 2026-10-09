import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { addDays, subDays } from "date-fns";
import { SegmentedControl } from "./SegmentedControl";
import { DatePicker } from "./DatePicker";
import { LABEL_CLASS } from "./Field";
import { useFormat } from "@/hooks/useFormat";
import { toISODate, todayISO } from "@/lib/format";
import { useToday } from "@/hooks/useToday";

interface DateFieldProps {
  label: string;
  /** ISO yyyy-MM-dd */
  value: string;
  onChange: (iso: string) => void;
  /** Allow dates in the future (e.g. best-before). Default false. */
  allowFuture?: boolean;
  /**
   * "past" (records, default): Heute / Gestern / Datum ….
   * "future" (tasks): Heute / Morgen / Datum ….
   */
  mode?: "past" | "future";
}

/**
 * Date input with the most common answers as one tap — "Heute" / "Gestern"
 * for records, "Heute" / "Morgen" for things to do — and any
 * other date via `DatePicker` (native calendar, displayed in the app language).
 */
export function DateField({ label, value, onChange, allowFuture = false, mode = "past" }: DateFieldProps) {
  const now = useToday();
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const today = todayISO();
  const presets = mode === "future"
    ? [
      { value: "today", iso: today, label: t("records.today") },
      { value: "tomorrow", iso: toISODate(addDays(now, 1)), label: t("records.tomorrow") },
    ]
    : [
      { value: "today", iso: today, label: t("records.today") },
      { value: "yesterday", iso: toISODate(subDays(now, 1)), label: t("records.yesterday") },
    ];
  const preset = presets.find((p) => p.iso === value)?.value ?? "custom";
  const [custom, setCustom] = useState(preset === "custom");
  const choice = custom ? "custom" : preset;

  const select = (c: string) => {
    const p = presets.find((x) => x.value === c);
    if (p) { setCustom(false); onChange(p.iso); }
    else setCustom(true);
  };

  return (
    <div>
      <p className={LABEL_CLASS}>{label}</p>
      <SegmentedControl
        fullWidth
        label={label}
        value={choice}
        onChange={select}
        options={[
          ...presets.map((p) => ({ value: p.value, label: p.label })),
          // One look in every dialog: three segments, the last "Datum …" with the
          // calendar icon and always its text (no icon-only segment on phones).
          { value: "custom", label: t("records.otherDateShort"), icon: CalendarDays },
        ]}
      />
      {choice === "custom" ? (
        <DatePicker
          wrapperClassName="mt-2"
          aria-label={label}
          max={allowFuture || mode === "future" ? undefined : today}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(value, "date")}</p>
      )}
    </div>
  );
}
