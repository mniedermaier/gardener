/**
 * Place search and a last-frost estimate for onboarding and settings.
 *
 * Geocoding uses Open-Meteo (no API key, CORS enabled), so the user can find
 * their town before any weather key exists. The frost date is only a
 * starting point — the UI labels it as an estimate and keeps it editable.
 */

export interface Place {
  id: number;
  name: string;
  /** "Bayern, Deutschland" — for telling apart places with the same name. */
  region: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  admin1?: string;
  country?: string;
}

export async function searchPlaces(query: string, language: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(q)}&count=6&format=json&language=${encodeURIComponent(language.slice(0, 2))}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const json = (await res.json()) as { results?: GeocodingResult[] };
  return (json.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
    elevation: r.elevation,
  }));
}

/** Round coordinates for display and storage: ~100 m is plenty for weather and sun. */
export const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Rough average last spring frost for a location, as an ISO date in `year`.
 *
 * Linear in latitude and elevation, calibrated on European stations: about
 * three days later per degree north and two and a half days per 100 m. It
 * lands on mid-May for southern Germany (the "Eisheiligen" rule gardeners use
 * anyway), late April for Paris, mid-April for Madrid. Southern-hemisphere
 * locations are shifted by half a year.
 */
export function estimateLastFrost(latitude: number, elevation = 0, year = new Date().getFullYear()): string {
  const absLat = Math.abs(latitude);
  // Day of year (1 = 1 Jan) for the northern hemisphere.
  let doy = 75 + (absLat - 35) * 3 + (Math.max(0, elevation) / 100) * 2.5;
  doy = Math.min(165, Math.max(32, Math.round(doy)));
  const date = new Date(year, 0, doy);
  if (latitude < 0) date.setMonth(date.getMonth() + 6);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Fallback without a location: the traditional mid-May "Eisheiligen" date. */
export function defaultLastFrost(year = new Date().getFullYear()): string {
  return `${year}-05-15`;
}
