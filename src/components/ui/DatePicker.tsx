import { useId, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { useFormat } from "@/hooks/useFormat";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS, Field, describedBy } from "./Field";

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  /** ISO yyyy-MM-dd, or "" for no date. */
  value: string;
}

/** Opens the native calendar; showPicker() throws outside a user gesture or in some iframes. */
function openPicker(el: HTMLInputElement) {
  try {
    el.showPicker?.();
  } catch {
    // The native input stays usable (keyboard entry, platform picker on tap).
  }
}

/**
 * Date field whose visible text is always formatted in the app language
 * ("Montag, 5. Oktober 2026"). Native date inputs follow the browser locale
 * ("10/05/2026"), so the real `<input type="date">` lies transparently on top
 * of a formatted display: a click or Enter/Space opens the native calendar via
 * showPicker(), typing still edits the date, and screen readers get the native
 * control with its label. Drop-in for `<Input type="date">`.
 */
export function DatePicker({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id,
  value,
  placeholder,
  disabled,
  onClick,
  onKeyDown,
  "aria-describedby": ariaDescribedBy,
  ...props
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const { i18n } = useTranslation();
  const { formatDate } = useFormat();

  const handleClick = (e: MouseEvent<HTMLInputElement>) => {
    openPicker(e.currentTarget);
    onClick?.(e);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker(e.currentTarget);
    }
    onKeyDown?.(e);
  };

  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <input
          id={inputId}
          type="date"
          lang={i18n.resolvedLanguage ?? i18n.language}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error, ariaDescribedBy)}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 outline-none disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          {...props}
        />
        <div
          aria-hidden="true"
          className={cn(
            CONTROL_CLASS,
            "flex items-center justify-between gap-2 peer-focus:border-garden-500 peer-focus:ring-2 peer-focus:ring-garden-500/30 peer-disabled:opacity-60 peer-aria-[invalid=true]:border-danger dark:peer-focus:border-garden-400",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-gray-400")}>{value ? formatDate(value, "long") : (placeholder ?? "–")}</span>
          <CalendarDays size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </Field>
  );
}
