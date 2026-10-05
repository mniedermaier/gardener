import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  icon: LucideIcon;
  /** Required: becomes aria-label and tooltip. */
  label: string;
  tone?: "neutral" | "danger" | "brand";
  size?: "sm" | "md";
}

const TONES = {
  neutral: "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100",
  danger: "text-gray-500 hover:bg-danger/10 hover:text-danger dark:text-gray-400",
  brand: "text-garden-700 hover:bg-garden-50 dark:text-garden-300 dark:hover:bg-garden-500/15",
};

/**
 * Icon-only button. Always visible (no hover-only actions), at least 44 px on
 * touch, 32/36 px on desktop, never lighter than gray-500.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, tone = "neutral", size = "md", className = "", type = "button", title, ...props },
  ref,
) {
  const box = size === "sm" ? "size-11 sm:size-8" : "size-11 sm:size-9";
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${box} ${TONES[tone]} ${className}`}
      {...props}
    >
      <Icon size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </button>
  );
});
