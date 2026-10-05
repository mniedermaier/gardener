import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  /** One sentence on the benefit: what appears here once there is data. */
  description: ReactNode;
  /** Primary action — required by convention (see docs/DESIGN_SYSTEM.md). */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /** Smaller padding for use inside a Card or a panel. */
  compact?: boolean;
  className?: string;
}

/** Empty list/page: icon, title, benefit sentence, next step. Never a dead end. */
export const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action, secondaryAction, compact, className = "" }: EmptyStateProps) {
  return (
    <div className={`mx-auto flex max-w-sm flex-col items-center text-center ${compact ? "py-8" : "py-16"} ${className}`}>
      <span className="mb-4 inline-flex rounded-2xl bg-garden-50 p-3 text-garden-600 dark:bg-garden-500/15 dark:text-garden-300" aria-hidden="true">
        <Icon size={compact ? 24 : 32} />
      </span>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
});
