import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Droplets, Snowflake, Sprout, Sun, Thermometer, type LucideIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { useFormat } from "@/hooks/useFormat";
import { useToday } from "@/hooks/useToday";
import { toDate, toISODate } from "@/lib/format";
import { getAllAlerts, groupAlerts, type AlertGroup, type WeatherAlert } from "@/lib/weatherAlerts";
import type { WeatherForecastItem } from "@/types/weather";
import type { Plant } from "@/types/plant";
import type { Tone } from "@/components/ui/tone";

export const ALERT_ICON: Record<WeatherAlert["type"], LucideIcon> = {
  frost: Snowflake,
  heat: Sun,
  greenhouse_hot: Thermometer,
  greenhouse_cold: Snowflake,
  watering: Droplets,
  weekly: Sprout,
};

export const SEVERITY_TONE: Record<WeatherAlert["severity"], Tone> = { danger: "danger", warning: "warning", info: "info" };

/**
 * The weather alerts of a forecast (today onwards) for all beds and crops of
 * all gardens, with the user's alert settings: the one source for the weather
 * page and the weather card on "Heute".
 */
export function useWeatherAlerts(forecast: WeatherForecastItem[] | undefined): { alerts: WeatherAlert[]; groups: AlertGroup[] } {
  const { alertConfig, gardens } = useStore(useShallow((s) => ({ alertConfig: s.alerts, gardens: s.gardens })));
  const plantMap = usePlantMap();
  const today = toISODate(useToday());
  const beds = useMemo(() => gardens.flatMap((g) => g.beds), [gardens]);
  const plantedPlants = useMemo(() => {
    const ids = new Set<string>();
    for (const b of beds) for (const c of b.cells) ids.add(c.plantId);
    return Array.from(ids).map((id) => plantMap.get(id)).filter((p): p is Plant => !!p);
  }, [beds, plantMap]);
  return useMemo(() => {
    const alerts = forecast ? getAllAlerts(forecast.filter((d) => d.date >= today), beds, plantedPlants, alertConfig) : [];
    return { alerts, groups: groupAlerts(alerts) };
  }, [forecast, today, beds, plantedPlants, alertConfig]);
}

/** Title and text of an alert with its dates and temperatures formatted ("Mittwoch, 7. Okt.", "−1 °C"). */
export function useAlertText(): (alert: WeatherAlert) => { title: string; description: string } {
  const { t } = useTranslation();
  const f = useFormat();
  return useCallback((alert: WeatherAlert) => {
    const fmt = (p?: Record<string, string | number>) => {
      if (!p) return p;
      const out: Record<string, string | number> = { ...p };
      if (typeof p.date === "string") {
        const d = toDate(p.date);
        out.date = d ? new Intl.DateTimeFormat(f.locale, { weekday: "long", day: "numeric", month: "short" }).format(d) : p.date;
      }
      for (const k of ["temp", "max", "min", "outside", "buffer"] as const) if (typeof p[k] === "number") out[k] = f.formatTemperature(p[k] as number);
      return out;
    };
    return { title: t(alert.titleKey, fmt(alert.titleParams)), description: t(alert.descriptionKey, fmt(alert.descriptionParams)) };
  }, [t, f]);
}
