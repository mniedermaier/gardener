import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TONE_OUTLINE, TONE_SOFT, TONE_SOLID, type Tone } from "./tone";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  variant?: "soft" | "outline" | "solid";
  icon?: LucideIcon;
  /** Small coloured dot before the text (status). */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

const DOT: Record<Tone, string> = {
  neutral: "bg-gray-400",
  brand: "bg-garden-500",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/** Status/category label. 12 px, never smaller. */
export const Badge = memo(function Badge({ children, tone = "neutral", variant = "soft", icon: Icon, dot, size = "sm", className = "", title }: BadgeProps) {
  const look = variant === "outline" ? `border bg-transparent ${TONE_OUTLINE[tone]}` : variant === "solid" ? TONE_SOLID[tone] : TONE_SOFT[tone];
  const box = size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span title={title} className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full font-medium ${box} ${look} ${className}`}>
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${variant === "solid" ? "bg-current" : DOT[tone]}`} aria-hidden="true" />}
      {Icon && <Icon size={size === "md" ? 14 : 12} aria-hidden="true" className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
});
