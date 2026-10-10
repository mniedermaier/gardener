import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CONTROL_CLASS, Field, describedBy } from "./Field";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Marks the field optional: "(optional)" after the label. */
  optional?: boolean;
  /** Helper text below the field, linked via aria-describedby. */
  hint?: ReactNode;
  /** Error text; also sets aria-invalid. */
  error?: ReactNode;
  /** Class for the wrapper (label + field), e.g. grid placement or width. */
  wrapperClassName?: string;
}

export function Input({ label, optional, hint, error, wrapperClassName, className = "", id, "aria-describedby": ariaDescribedBy, type, ...props }: InputProps) {
  // No caller passes an id, so without a generated one every label pointed at
  // nothing and screen readers announced the fields unlabelled.
  const generatedId = useId();
  const inputId = id ?? generatedId;

  // Auto-set inputMode for number inputs to show numeric keyboard on mobile
  const inputMode = type === "number" && !props.inputMode
    ? (props.step && String(props.step).includes(".") ? "decimal" : "numeric")
    : props.inputMode;

  return (
    <Field id={inputId} label={label} optional={optional} hint={hint} error={error} className={wrapperClassName}>
      <input
        id={inputId}
        type={type}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error, ariaDescribedBy)}
        className={`${CONTROL_CLASS} ${className}`}
        {...props}
      />
    </Field>
  );
}
