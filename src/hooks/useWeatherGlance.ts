import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";

export interface GlanceDay {
  date: string;
  tempMin: number;
  tempMax: number;
  icon: string;
  description: string;
  /** Max. probability of precipitation, 0–100. */
  precipitation: number;
}

export interface WeatherGlance {
  temp: number;
  description: string;
  icon: string;
  days: GlanceDay[];
}

export type GlanceState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: WeatherGlance };

const CACHE_KEY = "gardener-weather-glance";
// The weather page caches its own payload; reuse it when it is there.
const PAGE_CACHE_KEY = "gardener-weather";
const MAX_AGE_MS = 30 * 60 * 1000;

interface OwmForecastItem {
  dt_txt: string;
  main: { temp: number };
  weather: Array<{ description: string; icon: string }>;
  pop?: number;
}

function readCache(): WeatherGlance | null {
  try {
    const own = sessionStorage.getItem(CACHE_KEY);
    if (own) {
      const parsed = JSON.parse(own) as { at: number; data: WeatherGlance };
      if (Date.now() - parsed.at < MAX_AGE_MS && Array.isArray(parsed.data?.days)) return parsed.data;
    }
    const page = sessionStorage.getItem(PAGE_CACHE_KEY);
    if (page) {
      const p = JSON.parse(page) as { current?: { temp?: number; description?: string; icon?: string }; forecast?: GlanceDay[] };
      if (typeof p.current?.temp === "number" && Array.isArray(p.forecast)) {
        return { temp: p.current.temp, description: p.current.description ?? "", icon: p.current.icon ?? "", days: p.forecast };
      }
    }
  } catch {
    // Private mode or a payload in an older shape: just fetch again.
  }
  return null;
}

function summarise(current: { main: { temp: number }; weather: Array<{ description: string; icon: string }> }, list: OwmForecastItem[]): WeatherGlance {
  const byDay = new Map<string, OwmForecastItem[]>();
  for (const item of list) {
    const date = item.dt_txt.slice(0, 10);
    const arr = byDay.get(date) ?? [];
    arr.push(item);
    byDay.set(date, arr);
  }
  const days = Array.from(byDay.entries()).slice(0, 5).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const mid = items[Math.floor(items.length / 2)];
    return {
      date,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      icon: mid.weather[0]?.icon ?? "",
      description: mid.weather[0]?.description ?? "",
      precipitation: Math.round(Math.max(...items.map((i) => (i.pop ?? 0) * 100))),
    };
  });
  return {
    temp: Math.round(current.main.temp),
    description: current.weather[0]?.description ?? "",
    icon: current.weather[0]?.icon ?? "",
    days,
  };
}

/**
 * Current weather plus a short forecast for the dashboard. Uses the same
 * OpenWeatherMap key and location as the weather page and caches for 30 min
 * per session, so opening the dashboard does not hammer the API.
 */
export function useWeatherGlance(): GlanceState {
  const { apiKey, lat, lon, locale } = useStore(
    useShallow((s) => ({ apiKey: s.weatherApiKey, lat: s.locationLat, lon: s.locationLon, locale: s.locale })),
  );
  const configured = Boolean(apiKey) && lat !== null && lon !== null;
  const [state, setState] = useState<GlanceState>(() => {
    const cached = readCache();
    return cached ? { status: "ready", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (!configured || state.status !== "loading") return;
    const ctrl = new AbortController();
    const base = `lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric&lang=${locale}`;
    Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${base}`, { signal: ctrl.signal }),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${base}`, { signal: ctrl.signal }),
    ])
      .then(async ([cur, fc]) => {
        if (!cur.ok || !fc.ok) throw new Error("weather api");
        const data = summarise(await cur.json(), ((await fc.json()) as { list: OwmForecastItem[] }).list ?? []);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
        } catch {
          // Session storage full or blocked: the glance still renders.
        }
        setState({ status: "ready", data });
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      });
    return () => ctrl.abort();
  }, [configured, apiKey, lat, lon, locale, state.status]);

  if (!configured && state.status !== "ready") return { status: "unconfigured" };
  return state;
}
