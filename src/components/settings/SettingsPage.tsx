import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Check } from "lucide-react";
import { useStore } from "@/store";
import { applyTheme } from "@/lib/theme";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const store = useStore();
  const [saved, setSaved] = useState(false);

  const handleLocaleChange = (locale: "de" | "en") => {
    store.setLocale(locale);
    i18n.changeLanguage(locale);
  };

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    store.setTheme(theme);
    applyTheme(theme);
  };

  const handleGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        store.setLocation(pos.coords.latitude, pos.coords.longitude, "");
      },
      () => {
        alert("Could not get location");
      }
    );
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("settings.title")}</h1>

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.language")}</h2>
          <div className="flex gap-2">
            {(["de", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLocaleChange(lang)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  store.locale === lang
                    ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {lang === "de" ? "Deutsch" : "English"}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.theme")}</h2>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  store.theme === theme
                    ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40 dark:text-garden-400"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {t(`settings.themes.${theme}`)}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.weather")}</h2>
          <div className="space-y-4">
            <Input
              label={t("settings.apiKey")}
              type="password"
              value={store.weatherApiKey}
              onChange={(e) => store.setWeatherApiKey(e.target.value)}
              placeholder="your-api-key"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={t("settings.latitude")}
                type="number"
                step="0.0001"
                value={store.locationLat ?? ""}
                onChange={(e) =>
                  store.setLocation(
                    Number(e.target.value),
                    store.locationLon ?? 0,
                    store.locationName
                  )
                }
              />
              <Input
                label={t("settings.longitude")}
                type="number"
                step="0.0001"
                value={store.locationLon ?? ""}
                onChange={(e) =>
                  store.setLocation(
                    store.locationLat ?? 0,
                    Number(e.target.value),
                    store.locationName
                  )
                }
              />
              <Input
                label={t("settings.locationName")}
                value={store.locationName}
                onChange={(e) =>
                  store.setLocation(
                    store.locationLat ?? 0,
                    store.locationLon ?? 0,
                    e.target.value
                  )
                }
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleGeolocation}>
              <MapPin size={16} />
              {t("settings.useGeolocation")}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.garden")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("settings.lastFrostDate")}
              type="date"
              value={store.lastFrostDate}
              onChange={(e) => store.setLastFrostDate(e.target.value)}
            />
            <Input
              label={t("settings.gridSize")}
              type="number"
              min={10}
              max={100}
              value={store.gridCellSizeCm}
              onChange={() => {}}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.alerts")}</h2>
          <div className="space-y-3">
            {([
              { key: "frostAlertEnabled" as const, label: "settings.alertTypes.frost" },
              { key: "wateringReminders" as const, label: "settings.alertTypes.watering" },
              { key: "greenhouseAlerts" as const, label: "settings.alertTypes.greenhouse" },
              { key: "weeklyDigest" as const, label: "settings.alertTypes.weekly" },
            ]).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={store.alerts[key]}
                  onChange={(e) => store.setAlerts({ [key]: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t(label)}</span>
              </label>
            ))}
            {store.alerts.frostAlertEnabled && (
              <div className="ml-7">
                <Input
                  label={t("settings.alertTypes.frostThreshold")}
                  type="number"
                  min={-5}
                  max={10}
                  value={store.alerts.frostThresholdC}
                  onChange={(e) => store.setAlerts({ frostThresholdC: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("settings.backend")}</h2>
          <Input
            label={t("settings.backendUrl")}
            value={store.backendUrl ?? ""}
            onChange={(e) => store.setBackendUrl(e.target.value || null)}
            placeholder="http://localhost:3001"
          />
          <p className="mt-2 text-xs text-gray-500">{t("settings.backendHint")}</p>
        </Card>

        <Button onClick={showSaved}>
          {saved ? <Check size={16} /> : null}
          {saved ? t("settings.saved") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
