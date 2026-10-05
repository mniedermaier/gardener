import { createElement, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, Cloud, CloudFog, CloudLightning, CloudOff, CloudRain, CloudSnow, CloudSun, Droplets, MapPin, Moon,
  RefreshCw, Settings, Snowflake, Sprout, Sun, Thermometer, Umbrella, Wind, type LucideIcon,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { toDate, todayISO } from "@/lib/format";
import { differenceInCalendarDays } from "date-fns";
import { getAllAlerts, groupAlerts, type AlertGroup, type WeatherAlert } from "@/lib/weatherAlerts";
import { fetchWeather as fetchWeather_, getWeatherProvider, isWeatherConfigured, WeatherAuthError } from "@/lib/weather";
import type { Plant } from "@/types/plant";
import type { WeatherData } from "@/types/weather";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { TONE_SOFT, type Tone } from "@/components/ui/tone";
import { RangeBar } from "@/components/ui/charts";
import { SunlightWidget } from "./SunlightWidget";

const ALERT_ICON: Record<WeatherAlert["type"], LucideIcon> = {
  frost: Snowflake,
  heat: Sun,
  greenhouse_hot: Thermometer,
  greenhouse_cold: Snowflake,
  watering: Droplets,
  weekly: Sprout,
};

const SEVERITY_TONE: Record<WeatherAlert["severity"], Tone> = { danger: "danger", warning: "warning", info: "info" };

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

/** Same day names as the forecast list: "Heute", "Morgen", then "Mi." … */
function dayLabel(date: string, f: ReturnType<typeof useFormat>): string {
  const diff = differenceInCalendarDays(toDate(date) ?? new Date(), new Date());
  return diff >= 0 && diff < 2 ? f.formatDate(date, "relative") : f.formatDate(date, "weekday");
}

/** "Mittwoch, 7. Okt." — the day inside an alert sentence. */
function dayPhrase(date: string, locale: string): string {
  const d = toDate(date);
  return d ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(d) : date;
}

/** Frost-sensitive crops = planted crops normally set out only after the last frost. */
function frostSensitive(plants: Plant[]): Plant[] {
  return plants.filter((p) => p.transplantWeeks !== null && p.transplantWeeks >= 0 && p.harvestDaysMax < 365);
}

function AlertCallout({ group, sensitive }: { group: AlertGroup; sensitive: string[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const Icon = ALERT_ICON[group.type];
  const tone = SEVERITY_TONE[group.severity];
  const fmtParams = (p?: Record<string, string | number>) => {
    if (!p) return p;
    const out: Record<string, string | number> = { ...p };
    if (typeof p.date === "string") out.date = dayPhrase(p.date, f.locale);
    for (const k of ["temp", "max", "min", "outside", "buffer"] as const) if (typeof p[k] === "number") out[k] = f.formatTemperature(p[k] as number);
    return out;
  };

  let title: string;
  let body: ReactNode;
  if (group.type === "frost") {
    const coldest = Math.min(...group.alerts.map((a) => Number(a.titleParams?.temp ?? 0)));
    title = t("alerts.frostGroupTitle", { count: group.alerts.length, temp: f.formatTemperature(coldest) });
    body = (
      <>
        <span className="flex flex-wrap gap-1.5">
          {group.alerts.map((a) => (
            <Badge key={a.id} variant="outline" tone={a.severity === "danger" ? "danger" : "warning"}>
              {dayLabel(a.date ?? "", f)} {f.formatTemperature(Number(a.titleParams?.temp ?? 0))}
            </Badge>
          ))}
        </span>
        <span className="mt-1.5 block">
          {sensitive.length > 0 ? t("alerts.frostAffected", { plants: sensitive.slice(0, 4).join(", "), count: sensitive.length }) : t("alerts.frostAdvice")}
        </span>
      </>
    );
  } else {
    const a = group.alerts[0];
    title = t(a.titleKey, fmtParams(a.titleParams));
    body = t(a.descriptionKey, fmtParams(a.descriptionParams));
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
  const { weatherApiKey, locationLat, locationLon, locationName, alerts: alertConfig, gardens, addWeatherHistory } = useStore(useShallow((s) => ({ weatherApiKey: s.weatherApiKey, locationLat: s.locationLat, locationLon: s.locationLon, locationName: s.locationName, alerts: s.alerts, gardens: s.gardens, addWeatherHistory: s.addWeatherHistory })));
  const plantMap = usePlantMap();
  const plantName = usePlantName();
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    try {
      const cached = sessionStorage.getItem("gardener-weather");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FetchError | null>(null);

  const allBeds = useMemo(() => gardens.flatMap((g) => g.beds), [gardens]);
  const plantedPlants = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return Array.from(ids).map((id) => plantMap.get(id)).filter((p): p is Plant => !!p);
  }, [gardens, plantMap]);

  const allAlerts = useMemo(() => (weather ? getAllAlerts(weather.forecast.filter((d) => d.date >= todayISO()), allBeds, plantedPlants, alertConfig) : []), [weather, allBeds, plantedPlants, alertConfig]);
  const groups = useMemo(() => groupAlerts(allAlerts), [allAlerts]);
  const weekly = allAlerts.find((a) => a.type === "weekly");
  const sensitive = useMemo(() => frostSensitive(plantedPlants).map((p) => plantName(p.id)), [plantedPlants, plantName]);

  const provider = getWeatherProvider(weatherApiKey);
  const fetchWeather = useCallback(async () => {
    if (!isWeatherConfigured(locationLat, locationLon)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWeather_({ lat: locationLat!, lon: locationLon!, apiKey: weatherApiKey, locale: i18n.language, locationName, t });
      addWeatherHistory(result.today);
      setWeather(result.data);
      try { sessionStorage.setItem("gardener-weather", JSON.stringify(result.data)); } catch { /* private mode */ }
    } catch (e) {
      setError(e instanceof WeatherAuthError ? "auth" : "network");
    } finally {
      setLoading(false);
    }
  }, [weatherApiKey, locationLat, locationLon, locationName, addWeatherHistory, t, i18n.language]);

  useEffect(() => { void fetchWeather(); }, [fetchWeather]);

  const toSettings = (
    <Button onClick={() => navigate("/settings")}>
      <Settings size={16} aria-hidden="true" />
      {t("weather.toSettings")}
    </Button>
  );

  if (!isWeatherConfigured(locationLat, locationLon)) {
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
        description={weekly ? t(weekly.descriptionKey, { ...weekly.descriptionParams, minTemp: f.formatTemperature(Number(weekly.descriptionParams?.minTemp)), maxTemp: f.formatTemperature(Number(weekly.descriptionParams?.maxTemp)) }) : t("weather.subtitle")}
        actions={<IconButton icon={RefreshCw} label={t("weather.refresh")} onClick={() => void fetchWeather()} disabled={loading} className={loading ? "[&_svg]:animate-spin" : ""} />}
      />

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
          {visible.map((g) => <AlertCallout key={g.id} group={g} sensitive={sensitive} />)}
          {hidden.length > 0 && (
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 [&::-webkit-details-marker]:hidden">
                <ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
                {t("weather.moreAlerts", { count: hidden.length })}
              </summary>
              <div className="mt-2 space-y-2">
                {hidden.map((g) => <AlertCallout key={g.id} group={g} sensitive={sensitive} />)}
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
        <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
          <Card className="lg:col-span-2">
            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={14} aria-hidden="true" />
              {weather.locationName}
              <span aria-hidden="true">·</span>
              <time dateTime={weather.fetchedAt}>{t("weather.updatedAt", { time: new Intl.DateTimeFormat(f.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(weather.fetchedAt)) })}</time>
            </p>
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
          </Card>

          <Card padding="none" className="lg:col-span-3">
            <div className="px-4 pt-4 sm:px-6 sm:pt-5">
              <CardHeader title={t("weather.forecast")} description={t("weather.forecastDesc", { threshold: f.formatTemperature(alertConfig.frostThresholdC) })} />
            </div>
            <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-white/5 dark:border-white/5">
              {days.map((day) => {
                const frost = day.tempMin <= alertConfig.frostThresholdC;
                return (
                  <li key={day.date} className="grid grid-cols-[4.5rem_1.5rem_1fr] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[5.5rem_1.5rem_minmax(0,1fr)_3rem_minmax(6rem,10rem)_3rem] sm:px-6">
                    <time dateTime={day.date} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dayLabel(day.date, f)}
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
        </div>
      )}

      <SunlightWidget />
    </div>
  );
}
