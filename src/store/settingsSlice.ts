import type { StateCreator } from "zustand";

export interface AlertConfig {
  frostAlertEnabled: boolean;
  frostThresholdC: number;
  wateringReminders: boolean;
  greenhouseAlerts: boolean;
  weeklyDigest: boolean;
}

export interface SettingsSlice {
  locale: "de" | "en";
  weatherApiKey: string;
  locationLat: number | null;
  locationLon: number | null;
  locationName: string;
  lastFrostDate: string;
  gridCellSizeCm: number;
  backendUrl: string | null;
  theme: "light" | "dark" | "system";
  alerts: AlertConfig;
  setLocale: (locale: "de" | "en") => void;
  setWeatherApiKey: (key: string) => void;
  setLocation: (lat: number, lon: number, name: string) => void;
  setLastFrostDate: (date: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setBackendUrl: (url: string | null) => void;
  setAlerts: (alerts: Partial<AlertConfig>) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  locale: "de",
  weatherApiKey: "",
  locationLat: null,
  locationLon: null,
  locationName: "",
  lastFrostDate: "2026-05-15",
  gridCellSizeCm: 30,
  backendUrl: null,
  theme: "system",
  alerts: {
    frostAlertEnabled: true,
    frostThresholdC: 2,
    wateringReminders: true,
    greenhouseAlerts: true,
    weeklyDigest: true,
  },
  setLocale: (locale) => set({ locale }),
  setWeatherApiKey: (weatherApiKey) => set({ weatherApiKey }),
  setLocation: (locationLat, locationLon, locationName) =>
    set({ locationLat, locationLon, locationName }),
  setLastFrostDate: (lastFrostDate) => set({ lastFrostDate }),
  setTheme: (theme) => set({ theme }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
  setAlerts: (updates) =>
    set((state) => ({ alerts: { ...state.alerts, ...updates } })),
});
