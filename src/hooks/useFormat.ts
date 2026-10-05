import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createFormatter, type Formatter } from "@/lib/format";

/**
 * Locale-bound formatters; the component re-renders when the language changes.
 *
 *   const { formatDate, formatWeight } = useFormat();
 *   <time dateTime={h.date}>{formatDate(h.date, "relative")}</time> · {formatWeight(h.grams)}
 */
export function useFormat(): Formatter {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  return useMemo(() => createFormatter(lang), [lang]);
}
