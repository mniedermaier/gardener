import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** Inner padding. "none" for cards that hold a List or a full-bleed chart. */
  padding?: "none" | "sm" | "md";
}

const PADDING = { none: "", sm: "p-4", md: "p-4 sm:p-6" };

/** A surface. Border instead of heavy shadow; in dark mode a visible white/10 edge. */
export function Card({ children, className = "", padding = "md", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900 ${PADDING[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot, e.g. a "Alle anzeigen" link or an IconButton. */
  actions?: ReactNode;
  className?: string;
}

/** Title row inside a Card: Title level (16 px semibold). */
export function CardHeader({ title, description, actions, className = "" }: CardHeaderProps) {
  return (
    // Without a description the actions centre on the title, and their 44 px
    // touch target does not push the content down (negative margin).
    <div className={`mb-4 flex justify-between gap-3 ${description ? "items-start" : "items-center"} ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {description && <p className="mt-0.5 max-w-prose text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className={`flex shrink-0 items-center gap-2 ${description ? "" : "-my-2.5"}`}>{actions}</div>}
    </div>
  );
}
