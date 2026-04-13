import { lazy, Suspense, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { useStore } from "@/store";

// Retry wrapper: if a chunk fails to load (stale cache after deploy), clear cache and reload
function lazyRetry<T extends Record<string, unknown>>(
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch(async () => {
    const reloaded = sessionStorage.getItem("chunk-reload");
    if (!reloaded) {
      sessionStorage.setItem("chunk-reload", "1");
      // Clear SW caches before reload
      if ("caches" in window) {
        const names = await caches.keys();
        for (const name of names) await caches.delete(name);
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      window.location.reload();
    }
    sessionStorage.removeItem("chunk-reload");
    throw new Error("Chunk load failed");
  });
}

const GardenPlanner = lazy(() => lazyRetry(() => import("@/components/planner/GardenPlanner")).then((m) => ({ default: m.GardenPlanner })));
const PlantList = lazy(() => lazyRetry(() => import("@/components/plants/PlantList")).then((m) => ({ default: m.PlantList })));
const TaskCalendar = lazy(() => lazyRetry(() => import("@/components/calendar/TaskCalendar")).then((m) => ({ default: m.TaskCalendar })));
const HarvestLog = lazy(() => lazyRetry(() => import("@/components/harvest/HarvestLog")).then((m) => ({ default: m.HarvestLog })));
const GardenJournal = lazy(() => lazyRetry(() => import("@/components/journal/GardenJournal")).then((m) => ({ default: m.GardenJournal })));
const SufficiencyDashboard = lazy(() => lazyRetry(() => import("@/components/sufficiency/SufficiencyDashboard")).then((m) => ({ default: m.SufficiencyDashboard })));
const ExpenseDashboard = lazy(() => lazyRetry(() => import("@/components/expenses/ExpenseDashboard")).then((m) => ({ default: m.ExpenseDashboard })));
const WeatherDashboard = lazy(() => lazyRetry(() => import("@/components/weather/WeatherDashboard")).then((m) => ({ default: m.WeatherDashboard })));
const ImportPage = lazy(() => lazyRetry(() => import("@/components/planner/ImportPage")).then((m) => ({ default: m.ImportPage })));
const SettingsPage = lazy(() => lazyRetry(() => import("@/components/settings/SettingsPage")).then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return <div className="flex h-32 items-center justify-center text-gray-400">...</div>;
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  const gardens = useStore((s) => s.gardens);
  const [onboardingDone, setOnboardingDone] = useState(gardens.length > 0);

  if (!onboardingDone) {
    return <OnboardingWizard onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="planner" element={<L><GardenPlanner /></L>} />
          <Route path="plants" element={<L><PlantList /></L>} />
          <Route path="calendar" element={<L><TaskCalendar /></L>} />
          <Route path="harvest" element={<L><HarvestLog /></L>} />
          <Route path="journal" element={<L><GardenJournal /></L>} />
          <Route path="sufficiency" element={<L><SufficiencyDashboard /></L>} />
          <Route path="expenses" element={<L><ExpenseDashboard /></L>} />
          <Route path="import" element={<L><ImportPage /></L>} />
          <Route path="weather" element={<L><WeatherDashboard /></L>} />
          <Route path="settings" element={<L><SettingsPage /></L>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
