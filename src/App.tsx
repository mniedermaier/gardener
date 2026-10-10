import { lazy, Suspense, useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { migrateLegacyPhotos } from "@/lib/migratePhotos";
import { useStorageHealth } from "@/hooks/useStorageHealth";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { useStore } from "@/store";
import { PageSkeleton } from "@/components/ui/Skeleton";

// Retry wrapper: if a chunk fails to load (stale cache after deploy), clear cache and reload
function lazyRetry<T extends Record<string, unknown>>(
  fn: () => Promise<T>,
): Promise<T> {
  return fn().catch(async () => {
    try {
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
    } catch {
      // sessionStorage may be unavailable in Safari Private Browsing
    }
    throw new Error("Chunk load failed");
  });
}

const GardenPlanner = lazy(() => lazyRetry(() => import("@/components/planner/GardenPlanner")).then((m) => ({ default: m.GardenPlanner })));
const PlantList = lazy(() => lazyRetry(() => import("@/components/plants/PlantList")).then((m) => ({ default: m.PlantList })));
const CalendarPage = lazy(() => lazyRetry(() => import("@/components/calendar/CalendarPage")).then((m) => ({ default: m.CalendarPage })));
const TaskCalendar = lazy(() => lazyRetry(() => import("@/components/calendar/TaskCalendar")).then((m) => ({ default: m.TaskCalendar })));
const HarvestLog = lazy(() => lazyRetry(() => import("@/components/harvest/HarvestLog")).then((m) => ({ default: m.HarvestLog })));
const GardenJournal = lazy(() => lazyRetry(() => import("@/components/journal/GardenJournal")).then((m) => ({ default: m.GardenJournal })));
const SufficiencyDashboard = lazy(() => lazyRetry(() => import("@/components/sufficiency/SufficiencyDashboard")).then((m) => ({ default: m.SufficiencyDashboard })));
const SeedInventory = lazy(() => lazyRetry(() => import("@/components/seeds/SeedInventory")).then((m) => ({ default: m.SeedInventory })));
const SoilManagement = lazy(() => lazyRetry(() => import("@/components/soil/SoilManagement")).then((m) => ({ default: m.SoilManagement })));
const PestTracker = lazy(() => lazyRetry(() => import("@/components/pests/PestTracker")).then((m) => ({ default: m.PestTracker })));
const WaterTracker = lazy(() => lazyRetry(() => import("@/components/water/WaterTracker")).then((m) => ({ default: m.WaterTracker })));
const FoodPlan = lazy(() => lazyRetry(() => import("@/components/foodplan/FoodPlan")).then((m) => ({ default: m.FoodPlan })));
const LivestockPage = lazy(() => lazyRetry(() => import("@/components/livestock/LivestockPage")).then((m) => ({ default: m.LivestockPage })));
const AnimalDetail = lazy(() => lazyRetry(() => import("@/components/livestock/AnimalDetail")).then((m) => ({ default: m.AnimalDetail })));
const ProductionPage = lazy(() => lazyRetry(() => import("@/components/livestock/ProductionPage")).then((m) => ({ default: m.ProductionPage })));
const FeedPage = lazy(() => lazyRetry(() => import("@/components/livestock/FeedPage")).then((m) => ({ default: m.FeedPage })));
const HealthPage = lazy(() => lazyRetry(() => import("@/components/livestock/HealthPage")).then((m) => ({ default: m.HealthPage })));
const PantryPage = lazy(() => lazyRetry(() => import("@/components/pantry/PantryPage")).then((m) => ({ default: m.PantryPage })));
const ExpenseDashboard = lazy(() => lazyRetry(() => import("@/components/expenses/ExpenseDashboard")).then((m) => ({ default: m.ExpenseDashboard })));
const WeatherDashboard = lazy(() => lazyRetry(() => import("@/components/weather/WeatherDashboard")).then((m) => ({ default: m.WeatherDashboard })));
const ImportPage = lazy(() => lazyRetry(() => import("@/components/planner/ImportPage")).then((m) => ({ default: m.ImportPage })));
const CompanionMatrix = lazy(() => lazyRetry(() => import("@/components/plants/CompanionMatrix")).then((m) => ({ default: m.CompanionMatrix })));
const SettingsPage = lazy(() => lazyRetry(() => import("@/components/settings/SettingsPage")).then((m) => ({ default: m.SettingsPage })));

function PageLoader() {
  return <PageSkeleton />;
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/** "/plants/tomato" reads like a detail link; the detail lives at "/plants?plant=tomato". */
function PlantRedirect() {
  const { id = "" } = useParams();
  return <Navigate to={`/plants?plant=${encodeURIComponent(id)}`} replace />;
}

export default function App() {
  const gardens = useStore((s) => s.gardens);
  const [onboardingDone, setOnboardingDone] = useState(gardens.length > 0);
  useStorageHealth();

  // Photos written before v4 still sit in localStorage; move them once.
  useEffect(() => {
    void migrateLegacyPhotos();
  }, []);

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
          <Route path="plants/:id" element={<PlantRedirect />} />
          <Route path="companions" element={<L><CompanionMatrix /></L>} />
          <Route path="calendar" element={<L><CalendarPage /></L>} />
          <Route path="tasks" element={<L><TaskCalendar /></L>} />
          <Route path="harvest" element={<L><HarvestLog /></L>} />
          <Route path="journal" element={<L><GardenJournal /></L>} />
          <Route path="pantry" element={<L><PantryPage /></L>} />
          <Route path="seeds" element={<L><SeedInventory /></L>} />
          <Route path="soil" element={<L><SoilManagement /></L>} />
          <Route path="pests" element={<L><PestTracker /></L>} />
          <Route path="water-log" element={<L><WaterTracker /></L>} />
          <Route path="livestock" element={<L><LivestockPage /></L>} />
          <Route path="livestock/:id" element={<L><AnimalDetail /></L>} />
          <Route path="livestock/production" element={<L><ProductionPage /></L>} />
          <Route path="livestock/feed" element={<L><FeedPage /></L>} />
          <Route path="livestock/health" element={<L><HealthPage /></L>} />
          <Route path="foodplan" element={<L><FoodPlan /></L>} />
          <Route path="sufficiency" element={<L><SufficiencyDashboard /></L>} />
          <Route path="expenses" element={<L><ExpenseDashboard /></L>} />
          <Route path="import" element={<L><ImportPage /></L>} />
          <Route path="weather" element={<L><WeatherDashboard /></L>} />
          <Route path="settings" element={<L><SettingsPage /></L>} />
          {/* Unknown hash (old bookmark, typo): back to "Heute" instead of a blank page. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
