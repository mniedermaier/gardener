import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { fetchWeather, isWeatherConfigured } from "@/lib/weather";

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

/**
 * Current weather plus a short forecast for the dashboard. Uses the same
 * provider and location as the weather page (Open-Meteo by default, no key;
 * OpenWeatherMap when a key is set, see `lib/weather.ts`) and caches for
 * 30 min per session, so opening the dashboard does not hammer the API.
 */
export function useWeatherGlance(): GlanceState {
  const { t } = useTranslation();
  const { apiKey, lat, lon, locale, locationName } = useStore(
    useShallow((s) => ({ apiKey: s.weatherApiKey, lat: s.locationLat, lon: s.locationLon, locale: s.locale, locationName: s.locationName })),
  );
  const configured = isWeatherConfigured(lat, lon);
  const [state, setState] = useState<GlanceState>(() => {
    const cached = readCache();
    return cached ? { status: "ready", data: cached } : { status: "loading" };
  });

  useEffect(() => {
    if (!configured || lat === null || lon === null || state.status !== "loading") return;
    const ctrl = new AbortController();
    fetchWeather({ lat, lon, apiKey, locale, locationName, t, signal: ctrl.signal })
      .then(({ data: w }) => {
        const data: WeatherGlance = { temp: w.current.temp, description: w.current.description, icon: w.current.icon, days: w.forecast };
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
  }, [configured, apiKey, lat, lon, locale, locationName, t, state.status]);

  if (!configured && state.status !== "ready") return { status: "unconfigured" };
  return state;
}
