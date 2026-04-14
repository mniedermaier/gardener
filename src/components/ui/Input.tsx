import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, type, ...props }: InputProps) {
  // Auto-set inputMode for number inputs to show numeric keyboard on mobile
  const inputMode = type === "number" && !props.inputMode
    ? (props.step && String(props.step).includes(".") ? "decimal" : "numeric")
    : props.inputMode;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        className={`block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 sm:py-2 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${className}`}
        {...props}
      />
    </div>
  );
}
