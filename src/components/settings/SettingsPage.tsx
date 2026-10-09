import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, CloudOff, Coffee, ExternalLink, Loader2, MapPin, RefreshCw, Sun, Moon, Monitor, Trash2, Sparkles } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { applyTheme } from "@/lib/theme";
import { estimateLastFrost } from "@/lib/location";
import { fetchWeather, getOwmKeyStatus, getWeatherFetchStatus, getWeatherProvider, isWeatherConfigured, subscribeOwmKeyStatus, subscribeWeatherFetchStatus } from "@/lib/weather";
import { clearAllData } from "@/lib/dataImport";
import { useFormat } from "@/hooks/useFormat";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Checkbox } from "@/components/ui/Checkbox";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { DataManagement } from "./DataManagement";
import { LocationPicker, type PickedLocation } from "./LocationPicker";
import { useToday } from "@/hooks/useToday";

type Locale = "de" | "en" | "es" | "fr";
type Theme = "light" | "dark" | "system";

const LANGUAGES: Array<{ value: Locale; label: string }> = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

const SETTING_KEYS = [
  "locale", "theme", "weatherApiKey", "locationLat", "locationLon", "locationName", "locationRegion",
  "lastFrostDate", "gridCellSizeCm", "backendUrl", "alerts",
] as const;

/** Two-column settings row: what it is on the left, the controls in a card on the right. */
function Section({ id, title, description, children, tone }: { id: string; title: string; description?: string; children: ReactNode; tone?: "danger" }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-8">
      <div className="md:pt-1">
        <h2 id={id} className={`text-base font-semibold ${tone === "danger" ? "text-danger" : "text-gray-900 dark:text-gray-100"}`}>{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <Card className={tone === "danger" ? "border-danger/30 dark:border-danger/30" : ""}>{children}</Card>
    </section>
  );
}

/**
 * Every control saves immediately (one model for all fields); the header
 * confirms each save briefly. The irreversible "delete everything" sits
 * alone in a danger zone at the very end.
 */
export function SettingsPage() {
  const now = useToday();
  const { t, i18n } = useTranslation();
  const { confirm } = useToast();
  const { formatDate } = useFormat();
  const store = useStore(
    useShallow((s) => ({
      locale: s.locale,
      theme: s.theme,
      weatherApiKey: s.weatherApiKey,
      locationLat: s.locationLat,
      locationLon: s.locationLon,
      locationName: s.locationName,
      locationRegion: s.locationRegion,
      lastFrostDate: s.lastFrostDate,
      gridCellSizeCm: s.gridCellSizeCm,
      backendUrl: s.backendUrl,
      alerts: s.alerts,
      setLocale: s.setLocale,
      setTheme: s.setTheme,
      setWeatherApiKey: s.setWeatherApiKey,
      setLocation: s.setLocation,
      setLastFrostDate: s.setLastFrostDate,
      setGridCellSizeCm: s.setGridCellSizeCm,
      setBackendUrl: s.setBackendUrl,
      setAlerts: s.setAlerts,
    })),
  );
  const [elevation, setElevation] = useState<number | undefined>(undefined);

  // "Gespeichert" flash whenever one of the settings changes.
  const [savedFlash, setSavedFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (!SETTING_KEYS.some((k) => state[k] !== prev[k])) return;
      setSavedFlash(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSavedFlash(false), 1800);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
    };
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    store.setLocale(locale);
    void i18n.changeLanguage(locale);
  };

  const handleThemeChange = (theme: Theme) => {
    store.setTheme(theme);
    applyTheme(theme);
  };

  const handleLocation = (v: PickedLocation) => {
    setElevation(v.elevation);
    if (v.lat !== null && v.lon !== null) store.setLocation(v.lat, v.lon, v.name, v.region);
    else useStore.setState({ locationLat: v.lat, locationLon: v.lon, locationName: v.name, locationRegion: v.region ?? "" });
  };

  const handleClearAll = async () => {
    const ok = await confirm({ title: t("settings.danger.confirmTitle"), message: t("settings.danger.confirm"), confirmLabel: t("settings.danger.action") });
    if (ok) clearAllData();
  };

  const frostYear = Number(store.lastFrostDate.slice(0, 4)) || now.getFullYear();
  const frostEstimate = store.locationLat !== null && elevation !== undefined ? estimateLastFrost(store.locationLat, elevation, frostYear) : null;
  const hasLocation = isWeatherConfigured(store.locationLat, store.locationLon);
  const configuredProvider = getWeatherProvider(store.weatherApiKey);
  // The provider that actually delivers: a rejected or unreachable key falls
  // back to Open-Meteo (lib/weather.ts), and Settings must say so.
  const keyStatus = useSyncExternalStore(subscribeOwmKeyStatus, () => getOwmKeyStatus(store.weatherApiKey));
  const provider = configuredProvider === "openweathermap" && (keyStatus === "auth" || keyStatus === "unavailable") ? "open-meteo" : configuredProvider;
  // What the last request for this location really found (same fetch as the weather page and "Heute").
  const fetchStatus = useSyncExternalStore(subscribeWeatherFetchStatus, () => getWeatherFetchStatus(store.locationLat, store.locationLon));
  // Nothing fetched yet this session, a key nobody has used yet, or "Erneut versuchen": check once per
  // location/key/retry, after typing stops. fetchWeather gives up after a timeout, so "checking" always ends.
  const [retry, setRetry] = useState(0);
  const attempt = `${store.locationLat}|${store.locationLon}|${store.weatherApiKey}|${retry}`;
  const [doneAttempt, setDoneAttempt] = useState<string | null>(null);
  const wanted = fetchStatus === undefined || (configuredProvider === "openweathermap" && keyStatus === undefined) || retry > 0;
  const checking = hasLocation && wanted && doneAttempt !== attempt;
  useEffect(() => {
    if (!checking || store.locationLat === null || store.locationLon === null) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchWeather({ lat: store.locationLat!, lon: store.locationLon!, apiKey: store.weatherApiKey, locale: store.locale, t, signal: ctrl.signal })
        .catch(() => {})
        .finally(() => { if (!ctrl.signal.aborted) setDoneAttempt(attempt); });
    }, 800);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [checking, attempt, store.locationLat, store.locationLon, store.weatherApiKey, store.locale, t]);
  const weatherState: "needsLocation" | "checking" | "error" | "ok" =
    !hasLocation ? "needsLocation" : fetchStatus === "error" && !checking ? "error" : fetchStatus === "ok" ? "ok" : "checking";
  const place = store.locationName || t("settings.weatherYourLocation");
  const providerStatus =
    configuredProvider !== "openweathermap" ? t("settings.weatherProviderActive", { provider: "Open-Meteo" })
    : keyStatus === "auth" ? t("settings.weatherKeyRejected")
    : keyStatus === "unavailable" ? t("settings.weatherOwmUnavailable")
    : keyStatus === "ok" ? t("settings.weatherProviderActive", { provider: "OpenWeatherMap" })
    : !hasLocation ? t("settings.weatherProviderActive", { provider: "OpenWeatherMap" })
    : fetchStatus === "error" && !checking ? t("settings.weatherKeyUnchecked")
    : t("settings.weatherKeyChecking");

  return (
    <div className="pb-8">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.autosave")}
        actions={
          <p
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-1.5 text-sm font-medium text-positive transition-opacity duration-300 ${savedFlash ? "opacity-100" : "opacity-0"}`}
          >
            <Check size={16} aria-hidden="true" />
            {savedFlash ? t("settings.saved") : ""}
          </p>
        }
      />

      <div className="max-w-5xl space-y-8">
        <Section id="settings-appearance" title={t("settings.appearance")} description={t("settings.appearanceDesc")}>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.language")}</p>
              <SegmentedControl label={t("settings.language")} value={store.locale} onChange={handleLocaleChange} options={LANGUAGES} className="max-w-full overflow-x-auto" />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("settings.theme")}</p>
              <SegmentedControl
                label={t("settings.theme")}
                value={store.theme}
                onChange={handleThemeChange}
                options={[
                  { value: "light", label: t("settings.themes.light"), icon: Sun },
                  { value: "dark", label: t("settings.themes.dark"), icon: Moon },
                  { value: "system", label: t("settings.themes.system"), icon: Monitor },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section id="settings-location" title={t("settings.locationClimate")} description={t("settings.locationClimateDesc")}>
          <div className="space-y-5">
            <LocationPicker
              value={{ name: store.locationName, region: store.locationRegion, lat: store.locationLat, lon: store.locationLon, elevation }}
              onChange={handleLocation}
            />
            <div className="grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 dark:border-white/10">
              <div>
                <DatePicker
                  label={t("settings.lastFrostDate")}
                  value={store.lastFrostDate}
                  onChange={(e) => e.target.value && store.setLastFrostDate(e.target.value)}
                  hint={frostEstimate ? t("settings.frostEstimate", { date: formatDate(frostEstimate, "short") }) : t("settings.frostHint")}
                />
                {frostEstimate && frostEstimate !== store.lastFrostDate && (
                  <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => store.setLastFrostDate(frostEstimate)}>
                    <Sparkles size={14} aria-hidden="true" />
                    {t("settings.useEstimate")}
                  </Button>
                )}
              </div>
              <Input
                label={t("settings.gridSize")}
                type="number"
                min={10}
                max={100}
                value={store.gridCellSizeCm}
                onChange={(e) => store.setGridCellSizeCm(Math.max(10, Math.min(100, Number(e.target.value))))}
                hint={t("settings.gridHint")}
              />
            </div>
          </div>
        </Section>

        <Section id="settings-weather" title={t("settings.weather")} description={t("settings.weatherDesc")}>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  weatherState === "ok" ? "bg-positive/10 text-positive" : weatherState === "error" ? "bg-warning/10 text-warning" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                }`}
                aria-hidden="true"
              >
                {weatherState === "ok" ? <Check size={16} /> : weatherState === "error" ? <CloudOff size={16} /> : weatherState === "checking" ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p role="status" className="font-medium text-gray-900 dark:text-gray-100">
                  {weatherState === "ok" ? t("settings.weatherReady", { place })
                    : weatherState === "error" ? t("settings.weatherUnavailable", { place })
                    : weatherState === "checking" ? t("settings.weatherChecking", { place })
                    : t("settings.weatherNeedsLocation")}
                </p>
                {weatherState === "error" && (
                  <>
                    <p className="mt-0.5 text-gray-600 dark:text-gray-300">{t("settings.weatherUnavailableHint")}</p>
                    <Button variant="secondary" size="sm" className="my-2" onClick={() => setRetry((n) => n + 1)}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {t("weather.retry")}
                    </Button>
                  </>
                )}
                <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                  {t("settings.weatherSource")}{" "}
                  {provider === "openweathermap" ? (
                    "OpenWeatherMap"
                  ) : (
                    <>
                      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-garden-700 underline-offset-2 hover:underline dark:text-garden-300">
                        Open-Meteo.com <ExternalLink size={12} aria-hidden="true" />
                      </a>{" "}
                      (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">CC BY 4.0</a>)
                    </>
                  )}
                </p>
              </div>
            </div>
            <details className="group border-t border-gray-100 pt-3 dark:border-white/10" open={Boolean(store.weatherApiKey) || undefined}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
                <ChevronRight size={16} aria-hidden="true" className="text-gray-500 transition-transform group-open:rotate-90 dark:text-gray-400" />
                {t("settings.weatherAdvanced")}
              </summary>
              <div className="space-y-3 pt-2 pl-6">
                <p role="status" className={`text-sm ${keyStatus === "auth" ? "font-medium text-warning-strong" : "text-gray-600 dark:text-gray-300"}`}>
                  {providerStatus}
                </p>
                <Input
                  label={t("settings.apiKey")}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={store.weatherApiKey}
                  onChange={(e) => store.setWeatherApiKey(e.target.value.trim())}
                  hint={
                    <>
                      {t("settings.apiKeyHint")}{" "}
                      <a href="https://home.openweathermap.org/users/sign_up" target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center gap-0.5 font-medium text-garden-700 underline-offset-2 after:absolute after:-inset-y-3.5 after:inset-x-0 after:content-[''] hover:underline dark:text-garden-300">
                        openweathermap.org <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </>
                  }
                />
              </div>
            </details>
          </div>
        </Section>

        <Section id="settings-alerts" title={t("settings.alerts")} description={t("settings.alertsDesc")}>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {([
              { key: "frostAlertEnabled" as const, label: "settings.alertTypes.frost", desc: "settings.alertTypes.frostDesc" },
              { key: "wateringReminders" as const, label: "settings.alertTypes.watering", desc: "settings.alertTypes.wateringDesc" },
              { key: "greenhouseAlerts" as const, label: "settings.alertTypes.greenhouse", desc: "settings.alertTypes.greenhouseDesc" },
              { key: "weeklyDigest" as const, label: "settings.alertTypes.weekly", desc: "settings.alertTypes.weeklyDesc" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="py-1 first:pt-0 last:pb-0">
                <Checkbox
                  label={t(label)}
                  description={t(desc)}
                  checked={store.alerts[key]}
                  onChange={(e) => store.setAlerts({ [key]: e.target.checked })}
                />
                {key === "frostAlertEnabled" && store.alerts.frostAlertEnabled && (
                  <div className="mb-2 ml-7">
                    <Input
                      label={t("settings.alertTypes.frostThreshold")}
                      type="number"
                      min={-5}
                      max={10}
                      value={store.alerts.frostThresholdC}
                      onChange={(e) => store.setAlerts({ frostThresholdC: Number(e.target.value) })}
                      wrapperClassName="w-40"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section id="settings-sync" title={t("settings.backend")} description={t("settings.backendDesc")}>
          <Input
            label={t("settings.backendUrl")}
            type="url"
            inputMode="url"
            value={store.backendUrl ?? ""}
            onChange={(e) => store.setBackendUrl(e.target.value || null)}
            placeholder="http://localhost:3001"
            hint={t("settings.backendHint")}
          />
        </Section>

        <Section id="settings-data" title={t("dataManagement.title")} description={t("settings.dataDesc")}>
          <DataManagement />
        </Section>

        <Section id="settings-support" title={t("settings.coffeeTitle")} description={t("settings.coffeeDesc")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("settings.coffeeText")}</p>
            <a
              href="https://buymeacoffee.com/mniedermaier"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 shadow-xs hover:bg-gray-50 sm:min-h-10 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10"
            >
              <Coffee size={16} aria-hidden="true" className="text-earth-600 dark:text-earth-300" />
              {t("settings.coffeeButton")}
              <ExternalLink size={14} aria-hidden="true" className="text-gray-500" />
            </a>
          </div>
        </Section>

        <Section id="settings-danger" title={t("settings.danger.title")} description={t("settings.danger.desc")} tone="danger">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("settings.danger.action")}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("settings.danger.actionDesc")}</p>
            </div>
            <Button variant="danger" onClick={() => void handleClearAll()}>
              <Trash2 size={16} aria-hidden="true" />
              {t("settings.danger.action")}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
