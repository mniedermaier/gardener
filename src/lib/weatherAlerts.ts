import type { WeatherForecastItem } from "@/types/weather";
import type { Bed, GreenhouseConfig } from "@/types/garden";
import type { Plant, WaterNeed } from "@/types/plant";
import type { AlertConfig } from "@/store/settingsSlice";

export type AlertSeverity = "info" | "warning" | "danger";

export interface WeatherAlert {
  id: string;
  type: "frost" | "heat" | "greenhouse_hot" | "greenhouse_cold" | "watering" | "weekly";
  severity: AlertSeverity;
  titleKey: string;
  descriptionKey: string;
  titleParams?: Record<string, string | number>;
  descriptionParams?: Record<string, string | number>;
  date?: string;
}

export function detectFrostAlerts(
  forecast: WeatherForecastItem[],
  threshold: number,
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  for (const day of forecast) {
    if (day.tempMin <= threshold) {
      alerts.push({
        id: `frost-${day.date}`,
        type: "frost",
        severity: day.tempMin <= 0 ? "danger" : "warning",
        titleKey: "alerts.frostTitle",
        descriptionKey: "alerts.frostDesc",
        titleParams: { temp: day.tempMin },
        descriptionParams: { date: day.date, temp: day.tempMin },
        date: day.date,
      });
    }
  }
  return alerts;
}

/**
 * How much warmer an **unheated** greenhouse stays than outside at the
 * coldest point of the night (°C). Deliberately conservative: on clear,
 * windless nights a single-skin house loses its heat almost completely
 * (glass and foil ≈ +1 °C); twin-wall polycarbonate insulates better (≈ +2 °C).
 * Shown as an assumption under "Wie berechnet?".
 */
export const GREENHOUSE_NIGHT_BUFFER_C: Record<GreenhouseConfig["material"], number> = {
  glass: 1,
  polycarbonate: 2,
  plastic: 1,
};

/**
 * On a sunny day a closed greenhouse gets far warmer than the air outside.
 * Warn when the outside maximum comes within this many degrees of the
 * configured maximum (manual vents need opening in time, automatic vents
 * cope with more).
 */
export const GREENHOUSE_HEAT_MARGIN_C: Record<GreenhouseConfig["ventilation"], number> = { manual: 10, automatic: 5 };

/** Night margin above the configured minimum at which a cold warning starts. */
const COLD_MARGIN_C = 3;

export function detectGreenhouseAlerts(
  forecast: WeatherForecastItem[],
  beds: Bed[],
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const greenhouses = beds.filter((b) => b.environmentType === "greenhouse" && b.greenhouseConfig);
  if (forecast.length === 0) return alerts;

  for (const gh of greenhouses) {
    const config = gh.greenhouseConfig!;

    // Heat: name the hottest day, not the first warm one.
    const margin = GREENHOUSE_HEAT_MARGIN_C[config.ventilation] ?? 10;
    const hottest = forecast.reduce((a, b) => (b.tempMax > a.tempMax ? b : a));
    const hotDays = forecast.filter((d) => d.tempMax >= config.maxTempC - margin);
    if (hotDays.length > 0) {
      alerts.push({
        id: `gh-hot-${gh.id}`,
        type: "greenhouse_hot",
        severity: hottest.tempMax >= config.maxTempC - margin / 2 ? "danger" : "warning",
        titleKey: "alerts.greenhouseHotTitle",
        descriptionKey: "alerts.greenhouseHotDesc",
        titleParams: { name: gh.name },
        descriptionParams: { name: gh.name, temp: hottest.tempMax, max: config.maxTempC, date: hottest.date, count: hotDays.length },
        date: hottest.date,
      });
    }

    // Cold (unheated only): estimate the inside minimum from the outside
    // minimum plus a conservative buffer and report the *coldest* night.
    if (!config.heated) {
      const buffer = GREENHOUSE_NIGHT_BUFFER_C[config.material] ?? 1;
      const coldest = forecast.reduce((a, b) => (b.tempMin < a.tempMin ? b : a));
      const inside = coldest.tempMin + buffer;
      const coldNights = forecast.filter((d) => d.tempMin + buffer < config.minTempC + COLD_MARGIN_C);
      if (coldNights.length > 0) {
        alerts.push({
          id: `gh-cold-${gh.id}`,
          type: "greenhouse_cold",
          severity: inside <= 0 || inside < config.minTempC ? "danger" : "warning",
          titleKey: "alerts.greenhouseColdTitle",
          descriptionKey: inside <= 0 ? "alerts.greenhouseFrostDesc" : "alerts.greenhouseColdDesc",
          titleParams: { name: gh.name },
          descriptionParams: { name: gh.name, temp: inside, outside: coldest.tempMin, min: config.minTempC, date: coldest.date, count: coldNights.length, buffer },
          date: coldest.date,
        });
      }
    }
  }
  return alerts;
}

export function generateWateringAdvice(
  forecast: WeatherForecastItem[],
  plantedPlants: Plant[],
): WeatherAlert[] {
  const totalRainNext3Days = forecast
    .slice(0, 3)
    .reduce((sum, d) => sum + (d.precipitation > 50 ? 1 : 0), 0);
  const avgTempNext3Days = forecast.length > 0
    ? forecast.slice(0, 3).reduce((sum, d) => sum + d.tempMax, 0) / Math.min(forecast.length, 3)
    : 20;

  const highWaterPlants = plantedPlants.filter((p) => p.waterNeed === "high");
  const waterNeedMap: Record<WaterNeed, number> = { low: 1, medium: 2, high: 3 };
  const avgNeed = plantedPlants.length > 0
    ? plantedPlants.reduce((s, p) => s + waterNeedMap[p.waterNeed], 0) / plantedPlants.length
    : 0;

  const alerts: WeatherAlert[] = [];

  if (totalRainNext3Days === 0 && avgTempNext3Days > 25 && avgNeed > 1.5) {
    alerts.push({
      id: "watering-hot-dry",
      type: "watering",
      severity: "warning",
      titleKey: "alerts.wateringNeeded",
      descriptionKey: "alerts.wateringHotDry",
      descriptionParams: { temp: Math.round(avgTempNext3Days) },
    });
  } else if (totalRainNext3Days >= 2) {
    alerts.push({
      id: "watering-rain",
      type: "watering",
      severity: "info",
      titleKey: "alerts.wateringNotNeeded",
      descriptionKey: "alerts.wateringRainExpected",
    });
  } else if (highWaterPlants.length > 0 && totalRainNext3Days === 0) {
    alerts.push({
      id: "watering-high-need",
      type: "watering",
      severity: "info",
      titleKey: "alerts.wateringNeeded",
      descriptionKey: "alerts.wateringHighNeedPlants",
      descriptionParams: { count: highWaterPlants.length },
    });
  }

  return alerts;
}

export function generateWeeklySummary(
  forecast: WeatherForecastItem[],
  config: AlertConfig,
): WeatherAlert[] {
  if (!config.weeklyDigest || forecast.length === 0) return [];

  const minTemp = Math.min(...forecast.map((d) => d.tempMin));
  const maxTemp = Math.max(...forecast.map((d) => d.tempMax));
  const rainyDays = forecast.filter((d) => d.precipitation > 40).length;

  const hasFrost = minTemp <= config.frostThresholdC;
  const isWarm = maxTemp > 25;

  let descKey = "alerts.weeklySummaryNeutral";
  if (hasFrost) descKey = "alerts.weeklySummaryFrost";
  else if (isWarm && rainyDays === 0) descKey = "alerts.weeklySummaryHotDry";
  else if (rainyDays >= 3) descKey = "alerts.weeklySummaryWet";
  else if (isWarm) descKey = "alerts.weeklySummaryWarm";

  return [{
    id: "weekly-summary",
    type: "weekly",
    severity: hasFrost ? "warning" : "info",
    titleKey: "alerts.weeklySummaryTitle",
    descriptionKey: descKey,
    descriptionParams: { minTemp, maxTemp, rainyDays },
  }];
}

export function getAllAlerts(
  forecast: WeatherForecastItem[],
  beds: Bed[],
  plantedPlants: Plant[],
  config: AlertConfig,
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (config.weeklyDigest) {
    alerts.push(...generateWeeklySummary(forecast, config));
  }
  if (config.frostAlertEnabled) {
    alerts.push(...detectFrostAlerts(forecast, config.frostThresholdC));
  }
  if (config.greenhouseAlerts) {
    alerts.push(...detectGreenhouseAlerts(forecast, beds));
  }
  if (config.wateringReminders) {
    alerts.push(...generateWateringAdvice(forecast, plantedPlants));
  }

  return alerts;
}

// ---------------------------------------------------------------- grouping

const SEVERITY_RANK: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };
const TYPE_RANK: Record<WeatherAlert["type"], number> = {
  frost: 0, greenhouse_cold: 1, greenhouse_hot: 2, heat: 3, watering: 4, weekly: 5,
};

/** Several alerts of one kind shown as one card ("Frost in 4 Nächten"). */
export interface AlertGroup {
  id: string;
  type: WeatherAlert["type"];
  /** Highest severity among the members. */
  severity: AlertSeverity;
  /** Members sorted by date. */
  alerts: WeatherAlert[];
}

/**
 * Turns the flat alert list into prioritised groups: all frost nights become
 * one group, greenhouse alerts are grouped per kind, the weekly digest is left
 * out (the UI shows it as a quiet summary line). Sorted danger → info, then
 * frost before greenhouse before watering. Show the first one or two and fold
 * the rest away.
 */
export function groupAlerts(alerts: WeatherAlert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();
  for (const a of alerts) {
    if (a.type === "weekly") continue;
    const key = a.type === "watering" ? a.id : a.type;
    const g = groups.get(key);
    if (!g) groups.set(key, { id: key, type: a.type, severity: a.severity, alerts: [a] });
    else {
      g.alerts.push(a);
      if (SEVERITY_RANK[a.severity] < SEVERITY_RANK[g.severity]) g.severity = a.severity;
    }
  }
  for (const g of groups.values()) g.alerts.sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""));
  return [...groups.values()].sort(
    (x, y) => SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity] || TYPE_RANK[x.type] - TYPE_RANK[y.type],
  );
}
