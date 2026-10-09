import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useFormat } from "@/hooks/useFormat";
import { Badge } from "@/components/ui/Badge";

/**
 * Hint under "Eier, letzte 7 Tage": the average plus a trend badge when the
 * week is clearly off it (±25 %) — 8 eggs next to "Ø 24/Woche" must not read
 * as neutral (moult, cold snap, a sick hen).
 */
export function EggWeekHint({ week, avg }: { week: number; avg: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const delta = avg > 0 ? week / avg - 1 : 0;
  const avgText = t("livestock.eggWeeksAvg", { avg: f.formatNumber(avg, { maximumFractionDigits: 0 }) });
  if (Math.abs(delta) < 0.25) return <>{avgText}</>;
  const pct = `${delta > 0 ? "+" : ""}${f.formatPercent(delta)}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge size="sm" tone={delta < 0 ? "warning" : "positive"} icon={delta < 0 ? TrendingDown : TrendingUp}>
        {t("livestock.eggTrend", { value: pct })}
      </Badge>
      {avgText}
    </span>
  );
}
