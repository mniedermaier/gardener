import SunCalc from "suncalc";

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

export function getSunPosition(
  date: Date,
  lat: number,
  lon: number,
): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lon);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
    altitudeDeg: (pos.altitude * 180) / Math.PI,
    azimuthDeg: ((pos.azimuth * 180) / Math.PI + 180) % 360, // convert to degrees from north
  };
}

export function getDaylightInfo(
  date: Date,
  lat: number,
  lon: number,
): DaylightInfo {
  const times = SunCalc.getTimes(date, lat, lon);
  const daylightMs = times.sunset.getTime() - times.sunrise.getTime();
  const daylightHours = Math.round((daylightMs / (1000 * 60 * 60)) * 10) / 10;

  const noonPos = SunCalc.getPosition(times.solarNoon, lat, lon);

  return {
    sunrise: formatTime(times.sunrise),
    sunset: formatTime(times.sunset),
    daylightHours,
    solarNoon: formatTime(times.solarNoon),
    maxAltitudeDeg: Math.round((noonPos.altitude * 180) / Math.PI),
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

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
