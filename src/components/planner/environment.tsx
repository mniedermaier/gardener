import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { AppWindow, ArrowUpFromLine, Fence, Flower2, Snowflake, Sprout, Tent, Warehouse } from "lucide-react";
import type { EnvironmentType } from "@/types/garden";

/** Lucide icon per bed type — the UI never shows the emoji from ENVIRONMENT_ICONS. */
export const ENVIRONMENT_LUCIDE: Record<EnvironmentType, LucideIcon> = {
  outdoor_bed: Sprout,
  raised_bed: Fence,
  greenhouse: Warehouse,
  cold_frame: Snowflake,
  polytunnel: Tent,
  container: Flower2,
  windowsill: AppWindow,
  vertical: ArrowUpFromLine,
};

/**
 * Bed type as a small neutral icon tile (optionally with its name). Replaces
 * the coloured card borders that looked like error states in dark mode.
 */
export const EnvironmentChip = memo(function EnvironmentChip({
  type,
  withLabel = false,
  size = "md",
}: {
  type: EnvironmentType;
  withLabel?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();
  const Icon = ENVIRONMENT_LUCIDE[type] ?? Sprout;
  const label = t(`planner.environmentTypes.${type}`);
  const box = size === "sm" ? "size-6" : "size-8";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300" title={withLabel ? undefined : label}>
      <span
        className={`${box} inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300`}
        aria-hidden={withLabel ? true : undefined}
        role={withLabel ? undefined : "img"}
        aria-label={withLabel ? undefined : label}
      >
        <Icon size={size === "sm" ? 14 : 16} />
      </span>
      {withLabel && <span>{label}</span>}
    </span>
  );
});
