import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { Card, CardHeader } from "@/components/ui/Card";
import { BarChart } from "@/components/ui/charts";
import { getDaylightInfo, getMonthlyDaylight } from "@/lib/sunlight";
import { useToday } from "@/hooks/useToday";

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Icon size={12} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}

/** Today's sun times and daylight hours per month (with a today marker). */
export function SunlightWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const { locationLat, locationLon } = useStore(useShallow((s) => ({ locationLat: s.locationLat, locationLon: s.locationLon })));
  const now = useToday();

  const today = useMemo(() => (locationLat === null || locationLon === null ? null : getDaylightInfo(now, locationLat, locationLon)), [locationLat, locationLon, now]);
  const yearly = useMemo(() => (locationLat === null || locationLon === null ? null : getMonthlyDaylight(locationLat, locationLon, now.getFullYear())), [locationLat, locationLon, now]);

  if (!today || !yearly) return null;

  const hours = (h: number) => t("sunlight.hoursValue", { hours: f.formatNumber(h, { maximumFractionDigits: 1 }) });
  const longest = yearly.reduce((a, b) => (b.daylightHours > a.daylightHours ? b : a));
  const shortest = yearly.reduce((a, b) => (b.daylightHours < a.daylightHours ? b : a));
  /** getMonthlyDaylight numbers months 1–12. */
  const monthDate = (m: number) => new Date(now.getFullYear(), m - 1, 1);

  return (
    <Card className="mt-6">
      <CardHeader title={t("sunlight.title")} description={t("sunlight.desc")} />
      <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact icon={Sunrise} label={t("sunlight.sunrise")} value={today.sunrise} />
        <Fact icon={Sunset} label={t("sunlight.sunset")} value={today.sunset} />
        <Fact icon={Clock} label={t("sunlight.daylight")} value={hours(today.daylightHours)} />
        <Fact icon={Sun} label={t("sunlight.maxAltitude")} value={`${f.formatNumber(today.maxAltitudeDeg, { maximumFractionDigits: 0 })}°`} />
      </dl>
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("sunlight.yearlyDaylight")}</h3>
      <BarChart
        data={yearly.map((d) => ({
          key: String(d.month),
          label: f.formatDate(monthDate(d.month), "month"),
          fullLabel: f.formatDate(monthDate(d.month), "monthYear"),
          values: [d.daylightHours],
        }))}
        series={[{ label: t("sunlight.daylight"), color: "earth" }]}
        formatValue={hours}
        formatTick={(v) => t("sunlight.hoursShort", { hours: f.formatNumber(v, { maximumFractionDigits: 0 }) })}
        marker={{ index: now.getMonth(), label: t("charts.today") }}
        caption={t("sunlight.caption", {
          longest: f.formatDate(monthDate(longest.month), "monthYear"),
          longestHours: hours(longest.daylightHours),
          shortest: f.formatDate(monthDate(shortest.month), "monthYear"),
          shortestHours: hours(shortest.daylightHours),
        })}
        categoryLabel={t("charts.month")}
        height={170}
      />
    </Card>
  );
}
