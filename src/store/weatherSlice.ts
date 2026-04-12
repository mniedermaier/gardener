import type { StateCreator } from "zustand";

export interface WeatherHistoryEntry {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  humidity: number;
}

export interface WeatherSlice {
  weatherHistory: WeatherHistoryEntry[];
  addWeatherHistory: (entry: WeatherHistoryEntry) => void;
}

export const createWeatherSlice: StateCreator<WeatherSlice> = (set) => ({
  weatherHistory: [],

  addWeatherHistory: (entry) =>
    set((state) => {
      // Deduplicate by date, keep last 365 days
      const existing = state.weatherHistory.filter((h) => h.date !== entry.date);
      const updated = [...existing, entry]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 365);
      return { weatherHistory: updated };
    }),
});
