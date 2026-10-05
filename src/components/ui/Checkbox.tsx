import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
}

/** Checkbox with a clickable label and a 44 px touch row. */
export function Checkbox({ label, description, id, className = "", ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descId = description ? `${inputId}-desc` : undefined;

  return (
    <div className={`flex min-h-11 items-start gap-3 py-2 sm:min-h-0 ${className}`}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={descId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-gray-300"
        {...props}
      />
      <div className="text-sm">
        <label htmlFor={inputId} className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
          {label}
        </label>
        {description && (
          <p id={descId} className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
