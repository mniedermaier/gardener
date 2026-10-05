import type { ReactNode } from "react";

/** Shared look of every text-like form control (Input, Select, Textarea). */
export const CONTROL_CLASS =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-xs transition-colors placeholder:text-gray-500 focus:border-garden-500 focus:outline-none focus:ring-2 focus:ring-garden-500/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger sm:py-2 sm:text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-garden-400";

export const LABEL_CLASS = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

interface FieldProps {
  id: string;
  label?: ReactNode;
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

/** Label + control + hint/error, all tied together by id. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
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
