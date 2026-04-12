import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/dashboard/Dashboard";

const GardenPlanner = lazy(() => import("@/components/planner/GardenPlanner").then((m) => ({ default: m.GardenPlanner })));
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

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
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
