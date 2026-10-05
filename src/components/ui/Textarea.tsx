import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { CONTROL_CLASS, Field, describedBy } from "./Field";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export function Textarea({ label, hint, error, wrapperClassName, className = "", id, "aria-describedby": ariaDescribedBy, rows = 3, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <Field id={textareaId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, hint, error, ariaDescribedBy)}
        className={`${CONTROL_CLASS} resize-y ${className}`}
        {...props}
      />
    </Field>
  );
}
