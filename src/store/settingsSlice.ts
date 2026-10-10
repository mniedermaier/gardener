import type { StateCreator } from "zustand";
import { deviceLocale } from "@/lib/deviceLocale";

export interface AlertConfig {
  frostAlertEnabled: boolean;
  frostThresholdC: number;
  wateringReminders: boolean;
  greenhouseAlerts: boolean;
  weeklyDigest: boolean;
}

export interface SettingsSlice {
  locale: "de" | "en" | "es" | "fr";
  weatherApiKey: string;
  locationLat: number | null;
  locationLon: number | null;
  locationName: string;
  /** "Bayern, Deutschland" from the place search; empty for device position or typed coordinates. */
  locationRegion: string;
  lastFrostDate: string;
  gridCellSizeCm: number;
  backendUrl: string | null;
  theme: "light" | "dark" | "system";
  alerts: AlertConfig;
  lastBackupDate: string | null;
  /** savedAt of the backend snapshot this device last agreed with. */
  lastSyncedAt: string | null;
  setLocale: (locale: "de" | "en" | "es" | "fr") => void;
  setWeatherApiKey: (key: string) => void;
  setLocation: (lat: number, lon: number, name: string, region?: string) => void;
  setLastFrostDate: (date: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setBackendUrl: (url: string | null) => void;
  setGridCellSizeCm: (size: number) => void;
  setAlerts: (alerts: Partial<AlertConfig>) => void;
  setLastBackupDate: (date: string) => void;
  setLastSyncedAt: (savedAt: string | null) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  locale: deviceLocale(),
  weatherApiKey: "",
  locationLat: null,
  locationLon: null,
  locationName: "",
  locationRegion: "",
  lastFrostDate: "2026-05-15",
  gridCellSizeCm: 30,
  backendUrl: null,
  theme: "system",
  lastSyncedAt: null,
  alerts: {
    frostAlertEnabled: true,
    frostThresholdC: 2,
    wateringReminders: true,
    greenhouseAlerts: true,
    weeklyDigest: true,
  },
  lastBackupDate: null,
  setLocale: (locale) => set({ locale }),
  setWeatherApiKey: (weatherApiKey) => set({ weatherApiKey }),
  setLocation: (locationLat, locationLon, locationName, locationRegion = "") =>
    set({ locationLat, locationLon, locationName, locationRegion }),
  setLastFrostDate: (lastFrostDate) => set({ lastFrostDate }),
  setTheme: (theme) => set({ theme }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
  setGridCellSizeCm: (gridCellSizeCm) => set({ gridCellSizeCm }),
  setAlerts: (updates) =>
    set((state) => ({ alerts: { ...state.alerts, ...updates } })),
  setLastBackupDate: (lastBackupDate) => set({ lastBackupDate }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
});
