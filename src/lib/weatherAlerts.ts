import type { WeatherForecastItem } from "@/types/weather";
import type { Bed, GreenhouseConfig } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import { addDays } from "date-fns";
import { HARVEST_GRACE_DAYS, plantedHarvestWindow } from "@/lib/season";
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

/** The frost nights of a forecast, summarised once for every place that mentions them. */
export interface FrostSummary {
  /** Nights at or below the threshold, by date. */
  nights: { date: string; tempMin: number }[];
  /** The coldest of them (first one on a tie). */
  coldest: { date: string; tempMin: number };
  /** "danger" as soon as one night reaches 0 °C, else "warning". */
  severity: "danger" | "warning";
}

/**
 * Single source of the frost summary shown on "Heute" and on the weather page
 * ("3 Frostnächte, 2 weitere mit Frostgefahr – bis −6 °C (Mi)"): same days (today onwards),
 * same threshold, same coldest night. Returns null when no night qualifies.
 */
export function summarizeFrost(
  forecast: Pick<WeatherForecastItem, "date" | "tempMin">[],
  threshold: number,
  fromISO: string,
): FrostSummary | null {
  const nights = forecast
    .filter((d) => d.date >= fromISO && d.tempMin <= threshold)
    .map((d) => ({ date: d.date, tempMin: d.tempMin }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (nights.length === 0) return null;
  const coldest = nights.reduce((a, b) => (b.tempMin < a.tempMin ? b : a));
  return { nights, coldest, severity: coldest.tempMin <= 0 ? "danger" : "warning" };
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

/** Beds under cover: frost reaches them only as noted in `frostReachesBed`. */
export const PROTECTED_ENVIRONMENTS: Bed["environmentType"][] = ["greenhouse", "polytunnel", "cold_frame", "windowsill"];

/** Tender crops sown straight into the bed after the last frost. */
const TENDER_DIRECT_SOWN = new Set(["bean", "corn", "sunflower"]);

/**
 * Frost-tender = set out only *after* the last frost (transplantWeeks > 0) or a
 * tender direct sowing (bean, maize, sunflower). Hardy crops planted at the
 * frost date (chard, leek, celery: transplantWeeks 0), winter vegetables and
 * perennial herbs stand a few degrees below zero; rosemary is borderline
 * but survives a light frost.
 */
export function isFrostSensitive(plant: Pick<Plant, "id" | "harvestDaysMax" | "transplantWeeks">): boolean {
  return plant.harvestDaysMax < 365 && plant.id !== "rosemary" && ((plant.transplantWeeks ?? -1) > 0 || TENDER_DIRECT_SOWN.has(plant.id));
}

/**
 * Does the forecast frost reach into this bed? Open beds (incl. raised beds and
 * containers) at the frost threshold; an unheated greenhouse once the coldest
 * night stays at or below 0 °C inside (outside minimum + material buffer, as in
 * the greenhouse cold warning); other covered beds not.
 */
export function frostReachesBed(bed: Pick<Bed, "environmentType" | "greenhouseConfig">, frost: Pick<FrostSummary, "coldest"> | null): boolean {
  if (!frost) return false;
  if (!PROTECTED_ENVIRONMENTS.includes(bed.environmentType)) return true;
  const gh = bed.greenhouseConfig;
  if (bed.environmentType === "greenhouse" && gh && !gh.heated) return frost.coldest.tempMin + (GREENHOUSE_NIGHT_BUFFER_C[gh.material] ?? 1) <= 0;
  return false;
}

export interface BedFrostRisk {
  bedId: string;
  /** Frost-tender crops of the bed, unique, in bed order. */
  plantIds: string[];
}

/**
 * Single source of "which crops does this frost hurt": the frost pins on the
 * garden map, "Betroffen sind …" on the weather page and the frost hint on
 * "Heute" all read it. A bed is at risk when the frost reaches it **and** it
 * holds at least one frost-tender crop — winter-hardy beds get no pin.
 */
export function frostRiskByBed(
  beds: Bed[],
  plantMap: Map<string, Plant>,
  frost: Pick<FrostSummary, "coldest"> | null,
  /** With the season: crops whose harvest (plus the late grace) ended are gone, not at risk. */
  season?: { now: Date; lastFrostDate: string },
): BedFrostRisk[] {
  if (!frost) return [];
  const risks: BedFrostRisk[] = [];
  for (const bed of beds) {
    if (!frostReachesBed(bed, frost)) continue;
    const ids: string[] = [];
    for (const c of bed.cells) {
      const plant = plantMap.get(c.plantId);
      if (!plant || ids.includes(plant.id) || !isFrostSensitive(plant)) continue;
      if (season && c.plantedDate) {
        const w = plantedHarvestWindow(plant, [c.plantedDate], { ...season, protectionWeeks: getFrostProtectionWeeks(bed) });
        if (w && addDays(w.end, HARVEST_GRACE_DAYS) < season.now) continue;
      }
      ids.push(plant.id);
    }
    if (ids.length > 0) risks.push({ bedId: bed.id, plantIds: ids });
  }
  return risks;
}

/** The affected crops of all beds at risk, unique, in bed order. */
export function frostAffectedPlants(risks: BedFrostRisk[]): string[] {
  return [...new Set(risks.flatMap((r) => r.plantIds))];
}

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

/**
 * Watering advice for the next three days. Rain only waters open beds: with
 * `beds` given, planted beds under cover (greenhouse, polytunnel, cold frame,
 * windowsill) are left out of "no watering needed" — the advice then speaks of
 * the open beds and names the covered ones, or, when only covered beds are
 * planted, ignores the rain altogether.
 */
export function generateWateringAdvice(
  forecast: WeatherForecastItem[],
  plantedPlants: Plant[],
  beds: Pick<Bed, "name" | "environmentType" | "cells">[] = [],
): WeatherAlert[] {
  const planted = beds.filter((b) => b.cells.length > 0);
  const covered = planted.filter((b) => PROTECTED_ENVIRONMENTS.includes(b.environmentType));
  const rainReachesBeds = planted.length === 0 || covered.length < planted.length;
  const rainDays = forecast
    .slice(0, 3)
    .reduce((sum, d) => sum + (d.precipitation > 50 ? 1 : 0), 0);
  // Rain the beds actually get: none when every planted bed is under cover.
  const totalRainNext3Days = rainReachesBeds ? rainDays : 0;
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
    alerts.push(covered.length > 0
      ? {
        id: "watering-rain",
        type: "watering",
        severity: "info",
        titleKey: "alerts.wateringNotNeededOpen",
        descriptionKey: "alerts.wateringRainExpectedCovered",
        descriptionParams: { beds: covered.map((b) => b.name).join(", ") },
      }
      : {
        id: "watering-rain",
        type: "watering",
        severity: "info",
        titleKey: "alerts.wateringNotNeeded",
        descriptionKey: "alerts.wateringRainExpected",
      });
  } else if (highWaterPlants.length > 0 && rainDays === 0) {
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
    alerts.push(...generateWateringAdvice(forecast, plantedPlants, beds));
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
