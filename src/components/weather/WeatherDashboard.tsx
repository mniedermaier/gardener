import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Thermometer, Droplets, Wind, AlertTriangle, RefreshCw, Snowflake, Sun, Umbrella, Sprout } from "lucide-react";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAllAlerts, type WeatherAlert } from "@/lib/weatherAlerts";
import type { WeatherData } from "@/types/weather";
import { SunlightWidget } from "./SunlightWidget";
import { format } from "date-fns";

const SEVERITY_STYLES = {
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
};

const ALERT_ICONS = {
  frost: Snowflake,
  heat: Sun,
  greenhouse_hot: Thermometer,
  greenhouse_cold: Snowflake,
  watering: Droplets,
  weekly: Sprout,
};

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const { t } = useTranslation();
  const Icon = ALERT_ICONS[alert.type];
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${SEVERITY_STYLES[alert.severity]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{t(alert.titleKey, alert.titleParams)}</p>
        <p className="text-xs opacity-80">{t(alert.descriptionKey, alert.descriptionParams)}</p>
      </div>
    </div>
  );
}

export function WeatherDashboard() {
  const { t } = useTranslation();
  const { weatherApiKey, locationLat, locationLon, locationName, alerts: alertConfig, gardens, addWeatherHistory } = useStore();
  const plantMap = usePlantMap();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allBeds = useMemo(() => gardens.flatMap((g) => g.beds), [gardens]);
  const plantedPlants = useMemo(() => {
    const ids = new Set<string>();
    for (const g of gardens) for (const b of g.beds) for (const c of b.cells) ids.add(c.plantId);
    return Array.from(ids).map((id) => plantMap.get(id)).filter(Boolean) as import("@/types/plant").Plant[];
  }, [gardens, plantMap]);

  const weatherAlerts = useMemo(() => {
    if (!weather) return [];
    return getAllAlerts(weather.forecast, allBeds, plantedPlants, alertConfig);
  }, [weather, allBeds, plantedPlants, alertConfig]);

  const fetchWeather = useCallback(async () => {
    if (!weatherApiKey || locationLat === null || locationLon === null) return;
    setLoading(true);
    setError(null);
    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${locationLat}&lon=${locationLon}&appid=${weatherApiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${locationLat}&lon=${locationLon}&appid=${weatherApiKey}&units=metric`),
      ]);

      if (!currentRes.ok || !forecastRes.ok) throw new Error("API error");

      const current = await currentRes.json();
      const forecast = await forecastRes.json();

      const dailyMap = new Map<string, { temps: number[]; descriptions: string[]; icons: string[]; precip: number[]; humidity: number[] }>();
      for (const item of forecast.list) {
        const date = item.dt_txt.split(" ")[0];
        if (!dailyMap.has(date)) dailyMap.set(date, { temps: [], descriptions: [], icons: [], precip: [], humidity: [] });
        const d = dailyMap.get(date)!;
        d.temps.push(item.main.temp);
        d.descriptions.push(item.weather[0].description);
        d.icons.push(item.weather[0].icon);
        d.precip.push(item.pop * 100);
        d.humidity.push(item.main.humidity);
      }

      const forecastItems = Array.from(dailyMap.entries()).slice(0, 5).map(([date, d]) => ({
        date,
        tempMin: Math.round(Math.min(...d.temps)),
        tempMax: Math.round(Math.max(...d.temps)),
        description: d.descriptions[Math.floor(d.descriptions.length / 2)],
        icon: d.icons[Math.floor(d.icons.length / 2)],
        precipitation: Math.round(Math.max(...d.precip)),
      }));

      // Store weather history
      const today = format(new Date(), "yyyy-MM-dd");
      addWeatherHistory({
        date: today,
        tempMin: Math.round(current.main.temp_min),
        tempMax: Math.round(current.main.temp_max),
        precipitation: current.rain?.["1h"] ?? 0,
        humidity: current.main.humidity,
      });

      setWeather({
        current: {
          temp: Math.round(current.main.temp),
          feelsLike: Math.round(current.main.feels_like),
          humidity: current.main.humidity,
          description: current.weather[0].description,
          icon: current.weather[0].icon,
          windSpeed: Math.round(current.wind.speed * 3.6),
        },
        forecast: forecastItems,
        locationName: locationName || current.name,
        fetchedAt: new Date().toISOString(),
      });
    } catch {
      setError("Failed to fetch weather data. Check your API key.");
    } finally {
      setLoading(false);
    }
  }, [weatherApiKey, locationLat, locationLon, locationName, addWeatherHistory]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  if (!weatherApiKey) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">{t("weather.title")}</h1>
        <Card><div className="flex flex-col items-center gap-4 py-8 text-center"><Cloud size={48} className="text-gray-300" /><p className="text-gray-500">{t("weather.noApiKey")}</p></div></Card>
      </div>
    );
  }

  if (locationLat === null || locationLon === null) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">{t("weather.title")}</h1>
        <Card><div className="flex flex-col items-center gap-4 py-8 text-center"><Cloud size={48} className="text-gray-300" /><p className="text-gray-500">{t("weather.noLocation")}</p></div></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("weather.title")}</h1>
        <Button variant="ghost" size="sm" onClick={fetchWeather} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {weatherAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {weatherAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {weather && (
        <>
          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-semibold">{t("weather.current")} - {weather.locationName}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <Thermometer size={24} className="text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{weather.current.temp}°C</p>
                  <p className="text-xs text-gray-500">{t("weather.feelsLike")} {weather.current.feelsLike}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Droplets size={24} className="text-sky-500" />
                <div>
                  <p className="text-lg font-semibold">{weather.current.humidity}%</p>
                  <p className="text-xs text-gray-500">{t("weather.humidity")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wind size={24} className="text-gray-500" />
                <div>
                  <p className="text-lg font-semibold">{weather.current.windSpeed} km/h</p>
                  <p className="text-xs text-gray-500">{t("weather.wind")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Cloud size={24} className="text-gray-400" />
                <p className="text-sm capitalize">{weather.current.description}</p>
              </div>
            </div>
          </Card>

          <h2 className="mb-4 text-lg font-semibold">{t("weather.forecast")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {weather.forecast.map((day) => (
              <Card key={day.date} className="text-center">
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <p className="text-sm capitalize text-gray-500">{day.description}</p>
                <p className="mt-2 text-lg font-bold">
                  <span className="text-red-500">{day.tempMax}°</span>{" / "}<span className="text-blue-500">{day.tempMin}°</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  <Umbrella size={10} className="mr-1 inline" />{day.precipitation}%
                </p>
                {day.tempMin <= 0 && (
                  <p className="mt-2 text-xs font-medium text-blue-600"><AlertTriangle size={10} className="mr-1 inline" />Frost</p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <SunlightWidget />

      {loading && !weather && (
        <Card><p className="text-center text-gray-500">{t("common.loading")}</p></Card>
      )}
    </div>
  );
}
