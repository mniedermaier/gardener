import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  fetchWeather, getWeatherFetchStatus, WEATHER_TIMEOUT_MS, getWeatherProvider, isWeatherConfigured, openMeteoUrl, parseOpenMeteo, WeatherAuthError, WMO_CODES, wmoToIcon,
} from "@/lib/weather";

const LOCALES = ["de", "en", "es", "fr"] as const;
const translations = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(`public/locales/${l}/translation.json`, "utf8")) as { weather: { wmo: Record<string, string> } }]),
);
const tFor = (l: (typeof LOCALES)[number]) => (key: string) => {
  const code = key.replace("weather.wmo.", "");
  return translations[l].weather.wmo[code] ?? key;
};

const sample = {
  current: { temperature_2m: 11.4, apparent_temperature: 9.6, relative_humidity_2m: 78, weather_code: 61, wind_speed_10m: 12.3, is_day: 1 },
  daily: {
    time: ["2026-10-05", "2026-10-06", "2026-10-07"],
    weather_code: [61, 3, 0],
    temperature_2m_max: [14.2, 12.4, 9.1],
    temperature_2m_min: [1.6, -1.2, -6.4],
    precipitation_probability_max: [70, 30, null],
    precipitation_sum: [2.4, 0.2, 0],
  },
};

describe("weather provider", () => {
  it("defaults to Open-Meteo and switches to OpenWeatherMap only with a key", () => {
    expect(getWeatherProvider("")).toBe("open-meteo");
    expect(getWeatherProvider("   ")).toBe("open-meteo");
    expect(getWeatherProvider(undefined)).toBe("open-meteo");
    expect(getWeatherProvider("abc123")).toBe("openweathermap");
  });

  it("only needs coordinates", () => {
    expect(isWeatherConfigured(48.1, 11.6)).toBe(true);
    expect(isWeatherConfigured(null, 11.6)).toBe(false);
  });

  it("builds a keyless Open-Meteo request", () => {
    const url = new URL(openMeteoUrl(48.14, 11.58));
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("48.14");
    expect(url.searchParams.get("daily")).toContain("temperature_2m_min");
    expect(url.search).not.toContain("appid");
  });
});

describe("Open-Meteo parser", () => {
  it("normalises to the shared WeatherData shape", () => {
    const { data, today } = parseOpenMeteo(sample, tFor("de"), "München", new Date(2026, 9, 5, 12));
    expect(data.current).toEqual({ temp: 11, feelsLike: 10, humidity: 78, description: "Leichter Regen", icon: "10d", windSpeed: 12 });
    expect(data.forecast).toHaveLength(3);
    expect(data.forecast[2]).toMatchObject({ date: "2026-10-07", tempMin: -6, tempMax: 9, icon: "01d", description: "Klar", precipitation: 0 });
    expect(data.locationName).toBe("München");
    expect(today).toEqual({ date: "2026-10-05", tempMin: 2, tempMax: 14, precipitation: 2.4, humidity: 78 });
  });

  it("maps WMO codes to icon groups", () => {
    expect(wmoToIcon(0)).toBe("01d");
    expect(wmoToIcon(0, false)).toBe("01n");
    expect(wmoToIcon(2)).toBe("02d");
    expect(wmoToIcon(3)).toBe("04d");
    expect(wmoToIcon(45)).toBe("50d");
    expect(wmoToIcon(53)).toBe("09d");
    expect(wmoToIcon(81)).toBe("10d");
    expect(wmoToIcon(75)).toBe("13d");
    expect(wmoToIcon(96)).toBe("11d");
    expect(wmoToIcon(42)).toBe("03d");
  });

  it.each(LOCALES)("has a %s description for every WMO code", (l) => {
    for (const code of [...WMO_CODES, "unknown"]) {
      expect(translations[l].weather.wmo[String(code)], `${l} weather.wmo.${code}`).toBeTruthy();
    }
  });

  it("falls back for unknown codes", () => {
    const { data } = parseOpenMeteo({ ...sample, current: { ...sample.current, weather_code: 42 } }, tFor("en"));
    expect(data.current.description).toBe("No description");
  });

  it("rejects an unexpected payload", () => {
    expect(() => parseOpenMeteo({}, tFor("en"))).toThrow();
  });
});

describe("fetchWeather", () => {
  it("calls Open-Meteo without a key", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }));
    const r = await fetchWeather({ lat: 48.1, lon: 11.6, locale: "fr", t: tFor("fr"), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.provider).toBe("open-meteo");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain("api.open-meteo.com");
    expect(r.data.current.description).toBe("Pluie faible");
  });

  it("uses OpenWeatherMap when a key is set and reports a rejected key when Open-Meteo is down too", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    await expect(
      fetchWeather({ lat: 48.1, lon: 11.6, apiKey: "bad", locale: "de", t: tFor("de"), fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toBeInstanceOf(WeatherAuthError);
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain("api.openweathermap.org");
  });

  it("falls back to Open-Meteo when OpenWeatherMap rejects the key", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("openweathermap") ? new Response("{}", { status: 401 }) : new Response(JSON.stringify(sample), { status: 200 }));
    const r = await fetchWeather({ lat: 48.1, lon: 11.6, apiKey: "bad", locale: "de", t: tFor("de"), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.provider).toBe("open-meteo");
    expect(r.fallback).toBe("auth");
  });

  it("falls back to Open-Meteo when OpenWeatherMap is unavailable", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("openweathermap") ? new Response("", { status: 503 }) : new Response(JSON.stringify(sample), { status: 200 }));
    const r = await fetchWeather({ lat: 48.1, lon: 11.6, apiKey: "key", locale: "de", t: tFor("de"), fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(r.fallback).toBe("unavailable");
  });

  it("throws on a server error so the page can offer a retry", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 }));
    await expect(fetchWeather({ lat: 1, lon: 2, locale: "de", t: tFor("de"), fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow();
  });

  it("records the outcome per location, the status Settings shows", async () => {
    expect(getWeatherFetchStatus(3, 4)).toBeUndefined();
    const down = vi.fn(async () => new Response("", { status: 503 }));
    await expect(fetchWeather({ lat: 3, lon: 4, locale: "de", t: tFor("de"), fetchImpl: down as unknown as typeof fetch })).rejects.toThrow();
    expect(getWeatherFetchStatus(3, 4)).toBe("error");
    const up = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }));
    await fetchWeather({ lat: 3, lon: 4, locale: "de", t: tFor("de"), fetchImpl: up as unknown as typeof fetch });
    expect(getWeatherFetchStatus(3, 4)).toBe("ok");
    expect(getWeatherFetchStatus(5, 6)).toBeUndefined();
  });

  it("gives up on a hanging request instead of checking forever", async () => {
    vi.useFakeTimers();
    try {
      // Never answers; only the abort signal ends it.
      const hang = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
        if (init?.signal?.aborted) reject(init.signal.reason);
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      }));
      const p = fetchWeather({ lat: 7, lon: 8, apiKey: "key", locale: "de", t: tFor("de"), fetchImpl: hang as unknown as typeof fetch });
      const done = expect(p).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(WEATHER_TIMEOUT_MS + 10);
      await done;
      expect(getWeatherFetchStatus(7, 8)).toBe("error");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not count an abort by the caller as an error", async () => {
    const ctrl = new AbortController();
    const fetchImpl = vi.fn(async () => { throw new DOMException("aborted", "AbortError"); });
    ctrl.abort();
    await expect(fetchWeather({ lat: 9, lon: 10, locale: "de", t: tFor("de"), signal: ctrl.signal, fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow();
    expect(getWeatherFetchStatus(9, 10)).toBeUndefined();
  });
});
