import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { subDays } from "date-fns";
import { SegmentedControl } from "./SegmentedControl";
import { DatePicker } from "./DatePicker";
import { LABEL_CLASS } from "./Field";
import { useFormat } from "@/hooks/useFormat";
import { toISODate, todayISO } from "@/lib/format";

type Choice = "today" | "yesterday" | "custom";

interface DateFieldProps {
  label: string;
  /** ISO yyyy-MM-dd */
  value: string;
  onChange: (iso: string) => void;
  /** Allow dates in the future (e.g. best-before). Default false. */
  allowFuture?: boolean;
}

/**
 * Date input for records: the two most common answers as one tap
 * ("Heute" / "Gestern"), any other date via `DatePicker` (native calendar,
 * displayed in the app language).
 */
export function DateField({ label, value, onChange, allowFuture = false }: DateFieldProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const today = todayISO();
  const yesterday = toISODate(subDays(new Date(), 1));
  const preset: Choice = value === today ? "today" : value === yesterday ? "yesterday" : "custom";
  const [custom, setCustom] = useState(preset === "custom");
  const choice: Choice = custom ? "custom" : preset;

  const select = (c: Choice) => {
    if (c === "today") { setCustom(false); onChange(today); }
    else if (c === "yesterday") { setCustom(false); onChange(yesterday); }
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
          { value: "today", label: t("records.today") },
          { value: "yesterday", label: t("records.yesterday") },
          { value: "custom", label: t("records.otherDate"), icon: CalendarDays },
        ]}
      />
      {choice === "custom" ? (
        <DatePicker
          wrapperClassName="mt-2"
          aria-label={label}
          max={allowFuture ? undefined : today}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(value, "long")}</p>
      )}
    </div>
  );
}
