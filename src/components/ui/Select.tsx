import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { CONTROL_CLASS, Field, describedBy } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** Shortcut for simple lists; `children` (<option>/<optgroup>) also works. */
  options?: SelectOption[];
  /** Adds an empty first option, e.g. "– keins –". */
  placeholder?: string;
  wrapperClassName?: string;
}

/** Native <select> with the Input look and a label tied via useId. */
export function Select({ label, hint, error, options, placeholder, wrapperClassName, className = "", id, "aria-describedby": ariaDescribedBy, children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field id={selectId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error, ariaDescribedBy)}
          className={`${CONTROL_CLASS} appearance-none truncate pr-9 ${className}`}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
        />
      </div>
    </Field>
  );
}
