import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { GardenPlanner } from "@/components/planner/GardenPlanner";

// Lazy-load non-critical routes for smaller initial bundle
const PlantList = lazy(() => import("@/components/plants/PlantList").then((m) => ({ default: m.PlantList })));
const TaskCalendar = lazy(() => import("@/components/calendar/TaskCalendar").then((m) => ({ default: m.TaskCalendar })));
const HarvestLog = lazy(() => import("@/components/harvest/HarvestLog").then((m) => ({ default: m.HarvestLog })));
const GardenJournal = lazy(() => import("@/components/journal/GardenJournal").then((m) => ({ default: m.GardenJournal })));
const SufficiencyDashboard = lazy(() => import("@/components/sufficiency/SufficiencyDashboard").then((m) => ({ default: m.SufficiencyDashboard })));
const ExpenseDashboard = lazy(() => import("@/components/expenses/ExpenseDashboard").then((m) => ({ default: m.ExpenseDashboard })));
const WeatherDashboard = lazy(() => import("@/components/weather/WeatherDashboard").then((m) => ({ default: m.WeatherDashboard })));
const ImportPage = lazy(() => import("@/components/planner/ImportPage").then((m) => ({ default: m.ImportPage })));
const SettingsPage = lazy(() => import("@/components/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return <div className="flex h-32 items-center justify-center text-gray-400">...</div>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<GardenPlanner />} />
          <Route path="plants" element={<Suspense fallback={<PageLoader />}><PlantList /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={<PageLoader />}><TaskCalendar /></Suspense>} />
          <Route path="harvest" element={<Suspense fallback={<PageLoader />}><HarvestLog /></Suspense>} />
          <Route path="journal" element={<Suspense fallback={<PageLoader />}><GardenJournal /></Suspense>} />
          <Route path="sufficiency" element={<Suspense fallback={<PageLoader />}><SufficiencyDashboard /></Suspense>} />
          <Route path="expenses" element={<Suspense fallback={<PageLoader />}><ExpenseDashboard /></Suspense>} />
          <Route path="import" element={<Suspense fallback={<PageLoader />}><ImportPage /></Suspense>} />
          <Route path="weather" element={<Suspense fallback={<PageLoader />}><WeatherDashboard /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
