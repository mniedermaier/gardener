import type { WeatherForecastItem } from "@/types/weather";
import type { Bed } from "@/types/garden";
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

export function detectGreenhouseAlerts(
  forecast: WeatherForecastItem[],
  beds: Bed[],
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const greenhouses = beds.filter((b) => b.environmentType === "greenhouse" && b.greenhouseConfig);

  for (const gh of greenhouses) {
    const config = gh.greenhouseConfig!;
    for (const day of forecast) {
      if (day.tempMax > config.maxTempC - 5) {
        alerts.push({
          id: `gh-hot-${gh.id}-${day.date}`,
          type: "greenhouse_hot",
          severity: day.tempMax > config.maxTempC ? "danger" : "warning",
          titleKey: "alerts.greenhouseHotTitle",
          descriptionKey: "alerts.greenhouseHotDesc",
          titleParams: { name: gh.name },
          descriptionParams: { name: gh.name, temp: day.tempMax, max: config.maxTempC, date: day.date },
          date: day.date,
        });
        break; // one alert per greenhouse
      }
      if (!config.heated && day.tempMin < config.minTempC + 3) {
        alerts.push({
          id: `gh-cold-${gh.id}-${day.date}`,
          type: "greenhouse_cold",
          severity: day.tempMin < config.minTempC ? "danger" : "warning",
          titleKey: "alerts.greenhouseColdTitle",
          descriptionKey: "alerts.greenhouseColdDesc",
          titleParams: { name: gh.name },
          descriptionParams: { name: gh.name, temp: day.tempMin, min: config.minTempC, date: day.date },
          date: day.date,
        });
        break;
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
