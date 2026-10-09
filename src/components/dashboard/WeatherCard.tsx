import { createElement, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Sun, Moon, CloudSun, Cloud, CloudDrizzle, CloudRain, CloudLightning, CloudSnow, CloudFog, Snowflake, ArrowRight, CloudOff,
} from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useFormat } from "@/hooks/useFormat";
import type { GlanceState } from "@/hooks/useWeatherGlance";
import { todayISO } from "@/lib/format";
import { FrostTaskButton, frostLabelKey, frostTone, useFrostAffectedText, useFrostSummary } from "@/components/weather/frost";
import { ALERT_ICON, SEVERITY_TONE, useAlertText, useWeatherAlerts } from "@/components/weather/alerts";
import { Badge } from "@/components/ui/Badge";
import { TONE_TEXT } from "@/components/ui/tone";

const ICONS: Record<string, LucideIcon> = {
  "01": Sun, "02": CloudSun, "03": Cloud, "04": Cloud, "09": CloudDrizzle, "10": CloudRain, "11": CloudLightning, "13": CloudSnow, "50": CloudFog,
};

function weatherIcon(code: string): LucideIcon {
  if (code === "01n") return Moon;
  return ICONS[code.slice(0, 2)] ?? Cloud;
}

function WeatherIcon({ code, size, className, label }: { code: string; size: number; className?: string; label?: string }) {
  return createElement(weatherIcon(code), {
    size, className, strokeWidth: 1.75,
    ...(label ? { "aria-label": label, role: "img" } : { "aria-hidden": true }),
  });
}

const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** Today plus three days, with a frost hint for the gardener. */
export const WeatherCard = memo(function WeatherCard({ glance }: { glance: GlanceState }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate, formatTemperature } = useFormat();
  const { threshold, locationName } = useStore(useShallow((s) => ({ threshold: s.alerts.frostThresholdC, locationName: s.locationName })));
  const [today] = useState(todayISO);
  // Same summary as the weather page (lib/weatherAlerts summarizeFrost).
  const frost = useFrostSummary(glance.status === "ready" ? glance.data.days : undefined);
  // Names the same crops and beds as the map pins and the weather page.
  const affected = useFrostAffectedText(frost?.summary);
  // The weather page's alerts (one source): warnings beyond the frost sentence, e.g. the greenhouse cold warning.
  const { groups } = useWeatherAlerts(glance.status === "ready" ? glance.data.days : undefined);
  // With a frost hint, the greenhouse cold warning is a line inside it (same
  // nights) instead of a second warning box.
  const related = frost ? groups.filter((g) => g.type === "greenhouse_cold") : [];
  const warnings = groups.filter((g) => g.type !== "frost" && g.severity !== "info" && !related.includes(g));
  const alertText = useAlertText();

  const more = (
    <Link to="/weather" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-garden-700 hover:underline sm:min-h-0 dark:text-garden-300">
      {t("dashboard.weatherMore")} <ArrowRight size={14} aria-hidden="true" />
    </Link>
  );

  if (glance.status === "unconfigured" || glance.status === "error") {
    const unconfigured = glance.status === "unconfigured";
    return (
      <Card padding="sm">
        <EmptyState
          compact
          icon={unconfigured ? Cloud : CloudOff}
          title={t(unconfigured ? "dashboard.weatherConnectTitle" : "dashboard.weatherErrorTitle")}
          description={t(unconfigured ? "dashboard.weatherConnectText" : "dashboard.weatherErrorText")}
          action={<Button variant="secondary" size="sm" onClick={() => navigate("/settings")}>{t("dashboard.openSettings")}</Button>}
        />
      </Card>
    );
  }

  if (glance.status === "loading") {
    return (
      <Card padding="sm" aria-busy="true">
        <Skeleton className="mb-4 h-5 w-24" />
        <Skeleton className="mb-4 h-10 w-40" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  const { data } = glance;
  const upcoming = data.days.filter((d) => d.date > today).slice(0, 3);

  return (
    <Card padding="sm">
      <CardHeader title={t("dashboard.weatherTitle")} description={locationName || undefined} actions={more} className="mb-3" />
      <div className="flex items-center gap-3">
        <WeatherIcon code={data.icon} size={40} className="shrink-0 text-gray-600 dark:text-gray-300" />
        <div>
          <p className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-gray-50">{formatTemperature(data.temp)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{capitalize(data.description)}</p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {upcoming.map((d) => {
            const frost = d.tempMin <= threshold;
            return (
              <li key={d.date} className="rounded-lg bg-gray-50 px-2 py-2.5 text-center dark:bg-white/5" title={capitalize(d.description)}>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{formatDate(d.date, "weekday")}</p>
                <WeatherIcon code={d.icon} size={20} label={d.description} className="mx-auto my-1.5 text-gray-600 dark:text-gray-300" />
                <p className="text-sm font-medium text-gray-900 tabular-nums dark:text-gray-100">{formatTemperature(d.tempMax)}</p>
                {/* Neutral number; the snowflake marks the frost night (colour carries meaning once, not on the figure). */}
                <p className="inline-flex items-center justify-center gap-1 text-xs text-gray-500 tabular-nums dark:text-gray-400">
                  {frost && <Snowflake size={12} aria-label={t("weather.frostRisk")} className="text-info" />}
                  {formatTemperature(d.tempMin)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {frost && (
        <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 ${frostTone(frost.summary) === "info" ? "bg-info/10" : "bg-gray-100 dark:bg-white/5"}`}>
          <p className="flex items-start gap-2">
            <Snowflake size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${TONE_TEXT[frostTone(frost.summary)]}`} />
            <span>
              <span className="font-medium">{frost.title}.</span>{" "}
              <Badge tone={frostTone(frost.summary)} size="sm" className="align-text-bottom">{t(frostLabelKey(frost.summary))}</Badge>{" "}
              {affected}
              {/* Only the headline of the greenhouse warning here; its reasoning
                  (outside low, assumed buffer) lives on the weather page. */}
              {related.length > 0 && (
                <span className="mt-1.5 block text-gray-700 dark:text-gray-300">
                  {related.map((g) => alertText(g.alerts[0]).title).join(" · ")}.{" "}
                  <Link to="/weather" className="font-medium text-garden-700 hover:underline dark:text-garden-300">{t("dashboard.frostDetails")}</Link>
                </span>
              )}
            </span>
          </p>
          <FrostTaskButton summary={frost.summary} className="mt-2 ml-6 bg-white dark:bg-gray-900" />
        </div>
      )}

      {warnings.map((g) => {
        const { title, description } = alertText(g.alerts[0]);
        const tone = SEVERITY_TONE[g.severity];
        const Icon = ALERT_ICON[g.type];
        return (
          <div key={g.id} className={`mt-3 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 ${g.severity === "danger" ? "bg-danger/10" : "bg-warning/10"}`}>
            <p className="flex items-start gap-2">
              <Icon size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${TONE_TEXT[tone]}`} />
              <span className="min-w-0">
                <span className="font-medium">{title}</span>{" "}
                <Badge tone={tone} size="sm" className="align-text-bottom">{t(`alerts.severity.${g.severity}`)}</Badge>
                <span className="mt-0.5 block text-gray-600 dark:text-gray-300">{description}</span>
              </span>
            </p>
          </div>
        );
      })}
    </Card>
  );
});
