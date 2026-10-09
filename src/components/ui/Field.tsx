import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Shared look of every text-like form control (Input, Select, Textarea). */
export const CONTROL_CLASS =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-xs transition-colors placeholder:text-gray-500 focus:border-garden-500 focus:outline-none focus:ring-2 focus:ring-garden-500/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger sm:py-2 sm:text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-garden-400";

export const LABEL_CLASS = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

interface FieldProps {
  id: string;
  label?: ReactNode;
  /** Appends a muted "(optional)" to the label — the one way to mark optional fields. */
  optional?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function hintId(id: string) {
  return `${id}-hint`;
}

export function errorId(id: string) {
  return `${id}-error`;
}

/** describedby for a control: error wins over hint, both may be present. */
export function describedBy(id: string, hint?: ReactNode, error?: ReactNode, extra?: string) {
  const ids = [extra, hint ? hintId(id) : undefined, error ? errorId(id) : undefined].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/**
 * Label text with the shared optional marker: "Notizen (optional)". A label
 * that already ends in a bracket (a unit) gets " · optional" instead of a
 * second pair of brackets: "Kosten (€) · optional" (DESIGN_SYSTEM rule 9).
 */
export function LabelText({ label, optional }: { label: ReactNode; optional?: boolean }) {
  const { t } = useTranslation();
  const unitLabel = typeof label === "string" && label.trimEnd().endsWith(")");
  return (
    <>
      {label}
      {optional && <span className="font-normal text-gray-500 dark:text-gray-400">{unitLabel ? ` · ${t("common.optionalWord")}` : ` ${t("common.optionalMark")}`}</span>}
    </>
  );
}

/** Label + control + hint/error, all tied together by id. */
export function Field({ id, label, optional, hint, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={LABEL_CLASS}>
          <LabelText label={label} optional={optional} />
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId(id)} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(id)} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
