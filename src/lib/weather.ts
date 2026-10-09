/**
 * Weather providers behind one normalised shape (`WeatherData`).
 *
 * - **Open-Meteo** (default): free, no API key, CORS enabled. Needs only the
 *   coordinates the onboarding already stores (see `lib/location.ts`).
 *   Data licence CC BY 4.0, so the UI shows "Wetterdaten: Open-Meteo".
 * - **OpenWeatherMap** (optional): used instead when the user has entered an
 *   API key in the settings.
 *
 * Both return the same structure. Icons are normalised to OpenWeatherMap-style
 * codes ("01d", "10n", …) because the weather page and the dashboard card map
 * those to Lucide icons; descriptions are localised here.
 */
import type { WeatherData, WeatherForecastItem } from "@/types/weather";
import { toISODate } from "@/lib/format";

export type WeatherProvider = "open-meteo" | "openweathermap";

/** Which provider is used for the given settings. A non-empty key selects OpenWeatherMap. */
export function getWeatherProvider(apiKey: string | null | undefined): WeatherProvider {
  return apiKey && apiKey.trim() !== "" ? "openweathermap" : "open-meteo";
}

/** The coordinates are the only hard requirement (Open-Meteo needs no key). */
export function isWeatherConfigured(lat: number | null, lon: number | null): boolean {
  return lat !== null && lon !== null;
}

/** Thrown when OpenWeatherMap rejects the key (HTTP 401). */
export class WeatherAuthError extends Error {
  constructor() {
    super("weather api key rejected");
    this.name = "WeatherAuthError";
  }
}

export interface WeatherHistoryPoint {
  date: string;
  tempMin: number;
  tempMax: number;
  /** mm */
  precipitation: number;
  humidity: number;
}

export interface WeatherResult {
  provider: WeatherProvider;
  /**
   * Set when OpenWeatherMap was configured but failed and the data came from
   * Open-Meteo instead: "auth" = key rejected (HTTP 401), "unavailable" = any
   * other error. The UI shows a quiet hint with a link to the settings.
   */
  fallback?: "auth" | "unavailable";
  data: WeatherData;
  /** Today's observation for the local weather history. */
  today: WeatherHistoryPoint;
}

type Translate = (key: string) => string;

export interface FetchWeatherOptions {
  lat: number;
  lon: number;
  apiKey?: string;
  /** UI language, e.g. "de". */
  locale: string;
  locationName?: string;
  t: Translate;
  signal?: AbortSignal;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

// ------------------------------------------------------------------ key status

/**
 * What the last request with an OpenWeatherMap key found out: "ok", "auth"
 * (key rejected, Open-Meteo used instead) or "unavailable" (OWM down, Open-Meteo
 * used). Kept per key for the session so Settings can name the provider that
 * actually delivers the weather.
 */
export type OwmKeyStatus = "ok" | "auth" | "unavailable";

const OWM_STATUS_KEY = "gardener-owm-status";
const owmListeners = new Set<() => void>();

function readOwmStatus(): Record<string, OwmKeyStatus> {
  try {
    return JSON.parse(sessionStorage.getItem(OWM_STATUS_KEY) ?? "{}") as Record<string, OwmKeyStatus>;
  } catch {
    return {};
  }
}

function setOwmKeyStatus(apiKey: string | null | undefined, status: OwmKeyStatus): void {
  const key = apiKey?.trim();
  if (!key) return;
  const all = readOwmStatus();
  if (all[key] === status) return;
  try {
    sessionStorage.setItem(OWM_STATUS_KEY, JSON.stringify({ ...all, [key]: status }));
  } catch {
    // Session storage blocked: the status is just not remembered.
  }
  owmListeners.forEach((l) => l());
}

/** Status of the given key, undefined while no request has used it yet. */
export function getOwmKeyStatus(apiKey: string | null | undefined): OwmKeyStatus | undefined {
  const key = apiKey?.trim();
  return key ? readOwmStatus()[key] : undefined;
}

/** For useSyncExternalStore: notifies when a key status changes. */
export function subscribeOwmKeyStatus(listener: () => void): () => void {
  owmListeners.add(listener);
  return () => owmListeners.delete(listener);
}

/**
 * Fetches from the configured provider. A failing OpenWeatherMap (rejected
 * key, outage) never leaves the user without weather: the call falls back to
 * Open-Meteo and reports why in `fallback`. Only when both fail the original
 * error is thrown (`WeatherAuthError` for a rejected key).
 */
export async function fetchWeather(opts: FetchWeatherOptions): Promise<WeatherResult> {
  if (getWeatherProvider(opts.apiKey) !== "openweathermap") return fetchOpenMeteo(opts);
  try {
    const result = await fetchOpenWeatherMap(opts);
    setOwmKeyStatus(opts.apiKey, "ok");
    return result;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    if (e instanceof WeatherAuthError) setOwmKeyStatus(opts.apiKey, "auth");
    try {
      const result = await fetchOpenMeteo(opts);
      const fallback = e instanceof WeatherAuthError ? "auth" : "unavailable";
      setOwmKeyStatus(opts.apiKey, fallback);
      return { ...result, fallback };
    } catch (e2) {
      if ((e2 as Error).name === "AbortError") throw e2;
      throw e;
    }
  }
}

// ------------------------------------------------------------------ Open-Meteo

export const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * WMO weather interpretation codes (Open-Meteo `weather_code`) → OpenWeatherMap
 * icon group. Unknown codes fall back to "cloudy".
 */
export function wmoToIcon(code: number, isDay = true): string {
  const n = isDay ? "d" : "n";
  let group: string;
  if (code === 0) group = "01";
  else if (code === 1 || code === 2) group = "02";
  else if (code === 3) group = "04";
  else if (code === 45 || code === 48) group = "50";
  else if (code >= 51 && code <= 57) group = "09";
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) group = "10";
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) group = "13";
  else if (code >= 95) group = "11";
  else group = "03";
  return group + n;
}

/** Codes that have their own translation under `weather.wmo.*`. */
export const WMO_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99] as const;

export function wmoDescription(code: number, t: Translate): string {
  return (WMO_CODES as readonly number[]).includes(code) ? t(`weather.wmo.${code}`) : t("weather.wmo.unknown");
}

export interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    weather_code: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
}

export function openMeteoUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

export function parseOpenMeteo(json: OpenMeteoResponse, t: Translate, locationName = "", fetchedAt = new Date()): Omit<WeatherResult, "provider"> {
  const cur = json.current;
  const daily = json.daily;
  if (!cur || !daily || !Array.isArray(daily.time)) throw new Error("open-meteo: unexpected response");
  const forecast: WeatherForecastItem[] = daily.time.map((date, i) => ({
    date,
    tempMin: Math.round(daily.temperature_2m_min[i]),
    tempMax: Math.round(daily.temperature_2m_max[i]),
    description: wmoDescription(daily.weather_code[i], t),
    icon: wmoToIcon(daily.weather_code[i], true),
    precipitation: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
  }));
  const humidity = Math.round(cur.relative_humidity_2m ?? 0);
  const data: WeatherData = {
    current: {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
      humidity,
      description: wmoDescription(cur.weather_code, t),
      icon: wmoToIcon(cur.weather_code, cur.is_day !== 0),
      windSpeed: Math.round(cur.wind_speed_10m ?? 0),
    },
    forecast,
    locationName,
    fetchedAt: fetchedAt.toISOString(),
  };
  const first = forecast[0];
  const today: WeatherHistoryPoint = {
    date: daily.time[0] ?? toISODate(fetchedAt),
    tempMin: first?.tempMin ?? data.current.temp,
    tempMax: first?.tempMax ?? data.current.temp,
    precipitation: daily.precipitation_sum?.[0] ?? 0,
    humidity,
  };
  return { data, today };
}

async function fetchOpenMeteo(opts: FetchWeatherOptions): Promise<WeatherResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(openMeteoUrl(opts.lat, opts.lon), { signal: opts.signal });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const parsed = parseOpenMeteo((await res.json()) as OpenMeteoResponse, opts.t, opts.locationName ?? "");
  return { provider: "open-meteo", ...parsed };
}

// ------------------------------------------------------------------ OpenWeatherMap

interface OwmCurrent {
  name?: string;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
  weather: Array<{ description: string; icon: string }>;
  wind: { speed: number };
  rain?: { "1h"?: number };
}

interface OwmForecastItem {
  dt_txt: string;
  main: { temp: number };
  weather: Array<{ description: string; icon: string }>;
  pop?: number;
}

export function parseOpenWeatherMap(current: OwmCurrent, list: OwmForecastItem[], locationName = "", fetchedAt = new Date()): Omit<WeatherResult, "provider"> {
  const byDay = new Map<string, OwmForecastItem[]>();
  for (const item of list) {
    const date = item.dt_txt.slice(0, 10);
    const arr = byDay.get(date) ?? [];
    arr.push(item);
    byDay.set(date, arr);
  }
  const forecast: WeatherForecastItem[] = Array.from(byDay.entries()).slice(0, 5).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const mid = items[Math.floor(items.length / 2)];
    return {
      date,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      description: mid.weather[0]?.description ?? "",
      icon: mid.weather[0]?.icon ?? "",
      precipitation: Math.round(Math.max(...items.map((i) => (i.pop ?? 0) * 100))),
    };
  });
  const data: WeatherData = {
    current: {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0]?.description ?? "",
      icon: current.weather[0]?.icon ?? "",
      windSpeed: Math.round(current.wind.speed * 3.6),
    },
    forecast,
    locationName: locationName || current.name || "",
    fetchedAt: fetchedAt.toISOString(),
  };
  return {
    data,
    today: {
      date: toISODate(fetchedAt),
      tempMin: Math.round(current.main.temp_min),
      tempMax: Math.round(current.main.temp_max),
      precipitation: current.rain?.["1h"] ?? 0,
      humidity: current.main.humidity,
    },
  };
}

async function fetchOpenWeatherMap(opts: FetchWeatherOptions): Promise<WeatherResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const base = `lat=${opts.lat}&lon=${opts.lon}&appid=${encodeURIComponent(opts.apiKey ?? "")}&units=metric&lang=${encodeURIComponent(opts.locale.slice(0, 2))}`;
  const [cur, fc] = await Promise.all([
    doFetch(`https://api.openweathermap.org/data/2.5/weather?${base}`, { signal: opts.signal }),
    doFetch(`https://api.openweathermap.org/data/2.5/forecast?${base}`, { signal: opts.signal }),
  ]);
  if (cur.status === 401 || fc.status === 401) throw new WeatherAuthError();
  if (!cur.ok || !fc.ok) throw new Error("openweathermap error");
  const current = (await cur.json()) as OwmCurrent;
  const list = ((await fc.json()) as { list?: OwmForecastItem[] }).list ?? [];
  return { provider: "openweathermap", ...parseOpenWeatherMap(current, list, opts.locationName ?? "") };
}
