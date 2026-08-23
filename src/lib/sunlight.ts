import * as SunCalc from "suncalc";

export interface SunPosition {
  altitude: number; // radians above horizon
  azimuth: number;  // radians from south (clockwise)
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface DaylightInfo {
  sunrise: string;
  sunset: string;
  daylightHours: number;
  solarNoon: string;
  maxAltitudeDeg: number;
}

const DEG_TO_RAD = Math.PI / 180;

export function getSunPosition(
  date: Date,
  lat: number,
  lon: number,
): SunPosition {
  // SunCalc v2 returns degrees, azimuth north-based clockwise (0 = N, 180 = S)
  const pos = SunCalc.getPosition(date, lat, lon);
  return {
    altitude: pos.altitude * DEG_TO_RAD,
    azimuth: (pos.azimuth - 180) * DEG_TO_RAD, // radians from south
    altitudeDeg: pos.altitude,
    azimuthDeg: pos.azimuth,
  };
}

export function getDaylightInfo(
  date: Date,
  lat: number,
  lon: number,
): DaylightInfo {
  const times = SunCalc.getTimes(date, lat, lon);
  const noonPos = SunCalc.getPosition(times.solarNoon, lat, lon);

  // At high latitudes the sun may never rise or set — sunrise/sunset are then null
  const hasRiseAndSet = times.sunrise !== null && times.sunset !== null;
  const daylightHours = hasRiseAndSet
    ? Math.round(
        ((times.sunset!.getTime() - times.sunrise!.getTime()) /
          (1000 * 60 * 60)) *
          10,
      ) / 10
    : times.alwaysUp
      ? 24
      : 0;

  return {
    sunrise: formatTime(times.sunrise),
    sunset: formatTime(times.sunset),
    daylightHours,
    solarNoon: formatTime(times.solarNoon),
    maxAltitudeDeg: Math.round(noonPos.altitude),
  };
}

export function getMonthlyDaylight(
  lat: number,
  lon: number,
  year: number,
): Array<{ month: number; daylightHours: number; maxAltitude: number }> {
  const results = [];
  for (let month = 0; month < 12; month++) {
    // Use the 15th of each month as representative
    const date = new Date(year, month, 15, 12, 0, 0);
    const info = getDaylightInfo(date, lat, lon);
    results.push({
      month: month + 1,
      daylightHours: info.daylightHours,
      maxAltitude: info.maxAltitudeDeg,
    });
  }
  return results;
}

function formatTime(date: Date | null): string {
  if (!date) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
