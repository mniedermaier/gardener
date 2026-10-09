import { createElement, useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, Cloud, CloudFog, CloudLightning, CloudOff, CloudRain, CloudSnow, CloudSun, Droplets, MapPin, Moon,
  Info, RefreshCw, Settings, Snowflake, Sun, Thermometer, Umbrella, Wind, type LucideIcon,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { useFormat } from "@/hooks/useFormat";
import { todayISO } from "@/lib/format";
import type { AlertGroup, FrostSummary } from "@/lib/weatherAlerts";
import { fetchWeather as fetchWeather_, getWeatherProvider, isWeatherConfigured, WeatherAuthError } from "@/lib/weather";
import type { WeatherData } from "@/types/weather";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { TONE_SOFT } from "@/components/ui/tone";
import { RangeBar } from "@/components/ui/charts";
import { SunlightWidget } from "./SunlightWidget";
import { DayArc } from "./DayArc";
import { FrostTaskButton, useDayLabel, useFrostAffectedText, useFrostSummary } from "./frost";
import { ALERT_ICON, SEVERITY_TONE, useAlertText, useWeatherAlerts } from "./alerts";

/** OpenWeatherMap icon code → Lucide. */
function weatherIcon(code: string): LucideIcon {
  const n = code.slice(0, 2);
  if (n === "01") return code.endsWith("n") ? Moon : Sun;
  if (n === "02") return CloudSun;
  if (n === "09" || n === "10") return CloudRain;
  if (n === "11") return CloudLightning;
  if (n === "13") return CloudSnow;
  if (n === "50") return CloudFog;
  return Cloud;
}

type FetchError = "auth" | "network";

function AlertCallout({ group, frost }: { group: AlertGroup; frost: { summary: FrostSummary; title: string } | null }) {
  const { t } = useTranslation();
  const f = useFormat();
  const dayLabel = useDayLabel();
  const alertText = useAlertText();
  const affected = useFrostAffectedText(frost?.summary);
  const Icon = ALERT_ICON[group.type];
  const tone = SEVERITY_TONE[group.severity];

  let title: string;
  let body: ReactNode;
  if (group.type === "frost") {
    // Same sentence as on "Heute" (one source: summarizeFrost).
    title = frost?.title ?? "";
    body = (
      <>
        <span className="flex flex-wrap gap-1.5">
          {group.alerts.map((a) => (
            <Badge key={a.id} variant="outline" tone={a.severity === "danger" ? "danger" : "warning"}>
              {dayLabel(a.date ?? "")} {f.formatTemperature(Number(a.titleParams?.temp ?? 0))}
            </Badge>
          ))}
        </span>
        <span className="mt-1.5 block">
          {affected}
        </span>
        {frost && <FrostTaskButton summary={frost.summary} className="mt-2.5" />}
      </>
    );
  } else {
    ({ title, description: body } = alertText(group.alerts[0]));
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-gray-900">
      <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${TONE_SOFT[tone]}`} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
          <Badge tone={tone} dot>{t(`alerts.severity.${group.severity}`)}</Badge>
        </p>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body}</div>
      </div>
    </div>
  );
}

export function WeatherDashboard() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { weatherApiKey, locationLat, locationLon, locationName, alerts: alertConfig, addWeatherHistory } = useStore(useShallow((s) => ({ weatherApiKey: s.weatherApiKey, locationLat: s.locationLat, locationLon: s.locationLon, locationName: s.locationName, alerts: s.alerts, addWeatherHistory: s.addWeatherHistory })));
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try {
      const cached = sessionStorage.getItem("gardener-weather");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [error, setError] = useState<FetchError | null>(null);
  /** OpenWeatherMap failed and Open-Meteo stepped in (see lib/weather.ts). */
  const [fallback, setFallback] = useState<"auth" | "unavailable" | null>(null);
  const dayLabel = useDayLabel();

  // Same alerts as the weather card on "Heute".
  const { alerts: allAlerts, groups } = useWeatherAlerts(weather?.forecast);
  const weekly = allAlerts.find((a) => a.type === "weekly");
  const frost = useFrostSummary(weather?.forecast);

  const provider = fallback ? "open-meteo" : getWeatherProvider(weatherApiKey);
  // Each request has a key; `loading` is derived (no setState inside the effect body).
  const [reload, setReload] = useState(0);
  const configured = isWeatherConfigured(locationLat, locationLon);
  const requestKey = `${weatherApiKey}|${locationLat}|${locationLon}|${i18n.language}|${reload}`;
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const loading = configured && doneKey !== requestKey;
  const fetchWeather = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    if (locationLat === null || locationLon === null) return;
    const ctrl = new AbortController();
    fetchWeather_({ lat: locationLat, lon: locationLon, apiKey: weatherApiKey, locale: i18n.language, locationName, t, signal: ctrl.signal })
      .then((result) => {
        addWeatherHistory(result.today);
        setWeather(result.data);
        setFallback(result.fallback ?? null);
        setError(null);
        try { sessionStorage.setItem("gardener-weather", JSON.stringify(result.data)); } catch { /* private mode */ }
        setDoneKey(requestKey);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof WeatherAuthError ? "auth" : "network");
        setDoneKey(requestKey);
      });
    return () => ctrl.abort();
  }, [requestKey, locationLat, locationLon, weatherApiKey, i18n.language, locationName, t, addWeatherHistory]);

  const toSettings = (
    <Button onClick={() => navigate("/settings")}>
      <Settings size={16} aria-hidden="true" />
      {t("weather.toSettings")}
    </Button>
  );

  if (!configured) {
    return (
      <div>
        <PageHeader title={t("weather.title")} description={t("weather.subtitle")} />
        <Card>
          <EmptyState
            icon={MapPin}
            title={t("weather.locationTitle")}
            description={t("weather.locationText")}
            action={
              <Button onClick={() => navigate("/settings")}>
                <MapPin size={16} aria-hidden="true" />
                {t("weather.setLocation")}
              </Button>
            }
          />
        </Card>
        <SunlightWidget />
      </div>
    );
  }

  const [primary, ...rest] = groups;
  const visible = [primary, rest[0]].filter(Boolean) as AlertGroup[];
  const hidden = rest.slice(1);
  // The API's first day can be yesterday (UTC buckets) — only show today onwards.
  const days = weather ? weather.forecast.filter((d) => d.date >= todayISO()) : [];
  const domain: [number, number] = days.length
    ? [Math.min(...days.map((d) => d.tempMin), 0) - 2, Math.max(...days.map((d) => d.tempMax)) + 2]
    : [0, 1];

  return (
    <div>
      <PageHeader
        title={t("weather.title")}
        // The frost card already says it: the subtitle then stays general instead of repeating it.
        description={weekly && !groups.some((g) => g.type === "frost") ? t(weekly.descriptionKey, { ...weekly.descriptionParams, minTemp: f.formatTemperature(Number(weekly.descriptionParams?.minTemp)), maxTemp: f.formatTemperature(Number(weekly.descriptionParams?.maxTemp)) }) : t("weather.subtitle")}
      />

      {fallback && weather && (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-info/10 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
          <Info size={16} aria-hidden="true" className="shrink-0 text-info" />
          <span className="min-w-0 flex-1">{t(fallback === "auth" ? "weather.fallbackAuth" : "weather.fallbackUnavailable")}</span>
          <button type="button" onClick={() => navigate("/settings")} className="inline-flex min-h-11 items-center font-medium text-garden-700 underline-offset-2 hover:underline sm:min-h-0 dark:text-garden-300">
            {t("weather.toSettings")}
          </button>
        </p>
      )}

      {error && (
        <Card className="mb-6">
          <EmptyState
            compact
            icon={CloudOff}
            title={t("weather.errorTitle")}
            description={error === "auth" ? t("weather.errorAuth") : t("weather.errorNetwork")}
            action={error === "auth" ? toSettings : <Button onClick={() => void fetchWeather()}><RefreshCw size={16} aria-hidden="true" />{t("weather.retry")}</Button>}
            secondaryAction={error === "auth" ? undefined : <Button variant="ghost" onClick={() => navigate("/settings")}>{t("weather.toSettings")}</Button>}
          />
        </Card>
      )}

      {visible.length > 0 && (
        <section aria-label={t("weather.alertsLabel")} className="mb-6 space-y-2">
          {visible.map((g) => <AlertCallout key={g.id} group={g} frost={frost} />)}
          {hidden.length > 0 && (
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
                {t("weather.moreAlerts", { count: hidden.length })}
              </summary>
              <div className="mt-2 space-y-2">
                {hidden.map((g) => <AlertCallout key={g.id} group={g} frost={frost} />)}
              </div>
            </details>
          )}
        </section>
      )}

      {!weather && loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {weather && (
        // Phones: now → forecast → daylight. Desktop: now and daylight on the left, forecast spans both rows.
        <div className="grid gap-6 lg:grid-cols-5 lg:grid-rows-[auto_1fr] lg:items-start">
          <Card className="lg:col-span-2">
            <div className="-mt-1 -mr-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={14} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate">{weather.locationName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={weather.fetchedAt} className="shrink-0">{t("weather.updatedAt", { time: new Intl.DateTimeFormat(f.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(weather.fetchedAt)) })}</time>
              <IconButton icon={RefreshCw} size="sm" label={t("weather.refresh")} onClick={() => void fetchWeather()} disabled={loading} className={`ml-auto ${loading ? "[&_svg]:animate-spin" : ""}`} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              {createElement(weatherIcon(weather.current.icon), { size: 48, strokeWidth: 1.5, "aria-hidden": true, className: "text-gray-700 dark:text-gray-300" })}
              <div>
                <p className="text-4xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-gray-50">{f.formatTemperature(weather.current.temp)}</p>
                <p className="text-sm text-gray-600 first-letter:uppercase dark:text-gray-300">{weather.current.description}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-sm dark:border-white/5">
              <div>
                <dt className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Thermometer size={12} aria-hidden="true" />{t("weather.feelsLike")}</dt>
                <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{f.formatTemperature(weather.current.feelsLike)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Droplets size={12} aria-hidden="true" />{t("weather.humidity")}</dt>
                <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{f.formatPercent(weather.current.humidity / 100)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Wind size={12} aria-hidden="true" />{t("weather.wind")}</dt>
                <dd className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{t("weather.windValue", { speed: f.formatNumber(weather.current.windSpeed, { maximumFractionDigits: 0 }) })}</dd>
              </div>
            </dl>
            {locationLat !== null && locationLon !== null && (
              <div className="mt-4 border-t border-gray-100 pt-3 dark:border-white/5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("weather.dayArcTitle")}</p>
                <DayArc lat={locationLat} lon={locationLon} className="mx-auto mt-1 max-w-sm" />
              </div>
            )}
          </Card>

          <Card padding="none" className="lg:col-span-3 lg:row-span-2">
            <div className="px-4 pt-4 sm:px-6 sm:pt-5">
              <CardHeader title={t("weather.forecast")} description={t("weather.forecastDesc", { threshold: f.formatTemperature(alertConfig.frostThresholdC) })} />
            </div>
            <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
              {days.map((day) => {
                const frost = day.tempMin <= alertConfig.frostThresholdC;
                return (
                  <li key={day.date} className="grid grid-cols-[4.5rem_1.5rem_1fr] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[5.5rem_1.5rem_minmax(0,1fr)_3rem_minmax(6rem,10rem)_3rem] sm:px-6">
                    <time dateTime={day.date} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dayLabel(day.date)}
                      <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{f.formatDate(day.date, "short")}</span>
                    </time>
                    {createElement(weatherIcon(day.icon), { size: 20, "aria-hidden": true, className: "text-gray-600 dark:text-gray-300" })}
                    <span className="min-w-0 text-sm text-gray-700 first-letter:uppercase dark:text-gray-300">
                      {day.description}
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs normal-case text-gray-500 dark:text-gray-400">
                        <Umbrella size={12} aria-hidden="true" />
                        {t("weather.rainChance", { percent: f.formatPercent(day.precipitation / 100) })}
                        {frost && <Badge tone={day.tempMin <= 0 ? "danger" : "warning"} icon={Snowflake}>{day.tempMin <= 0 ? t("weather.frost") : t("weather.frostRisk")}</Badge>}
                      </span>
                    </span>
                    <span className="col-start-3 flex items-center gap-2 sm:col-start-auto sm:contents">
                      <span className="w-12 text-right text-sm tabular-nums text-gray-600 dark:text-gray-400 sm:w-auto">{f.formatTemperature(day.tempMin)}</span>
                      <RangeBar
                        className="flex-1"
                        min={day.tempMin}
                        max={day.tempMax}
                        domain={domain}
                        threshold={alertConfig.frostThresholdC}
                        emphasis={frost}
                        label={t("weather.rangeLabel", { min: f.formatTemperature(day.tempMin), max: f.formatTemperature(day.tempMax) })}
                      />
                      <span className="w-12 text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100 sm:w-auto">{f.formatTemperature(day.tempMax)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500 sm:px-6 dark:border-white/5 dark:text-gray-400">
              {provider === "open-meteo" ? (
                <>
                  {t("weather.sourceLabel")}{" "}
                  <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-garden-700 underline-offset-2 hover:underline dark:text-garden-300">Open-Meteo.com</a>
                  {" "}(CC BY 4.0)
                </>
              ) : (
                <>{t("weather.sourceLabel")} OpenWeatherMap</>
              )}
            </p>
          </Card>

          <div className="lg:col-span-2">
            <SunlightWidget compact />
          </div>
        </div>
      )}

      {!weather && <SunlightWidget />}
    </div>
  );
}
