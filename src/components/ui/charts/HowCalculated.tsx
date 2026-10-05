import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Info } from "lucide-react";

interface HowCalculatedProps {
  children: ReactNode;
  /** Defaults to t("metrics.howCalculated") — "Wie berechnet?". */
  summary?: ReactNode;
  className?: string;
}

/**
 * "Wie berechnet?" disclosure under a metric or card. Native <details>, so it
 * is keyboard- and screen-reader-friendly without extra state.
 */
export function HowCalculated({ children, summary, className = "" }: HowCalculatedProps) {
  const { t } = useTranslation();
  return (
    <details className={`group text-sm ${className}`}>
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 [&::-webkit-details-marker]:hidden">
        <Info size={14} aria-hidden="true" />
        {summary ?? t("metrics.howCalculated")}
        <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 dark:bg-white/5 dark:text-gray-300">{children}</div>
    </details>
  );
}
