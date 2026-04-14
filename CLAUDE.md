# CLAUDE.md

## Project Overview

Gardener is a self-sufficiency garden planning application. Plan vegetables, fruit, berries, and herbs. Runs as a static GitHub Pages site and as a Docker container with an optional backend.

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 3
- **State:** Zustand with useShallow selectors + localStorage persistence (12 slices)
- **Routing:** HashRouter (GitHub Pages compatible)
- **i18n:** react-i18next with HTTP backend — German, English, Spanish, French
- **DnD:** @dnd-kit/core for garden planner drag-and-drop
- **Icons:** Lucide React + 45 custom plant SVGs (memoized with cache)
- **Dates:** date-fns
- **Solar:** SunCalc
- **Backend (Docker only):** Express 5 + better-sqlite3 + Zod
- **PWA:** vite-plugin-pwa with Workbox (CacheFirst for assets/translations)

## Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run test         # Unit tests (Vitest, 87 tests)
npm run test:e2e     # E2E tests (Playwright, 8 tests)
npm run preview      # Preview production build

docker compose up --build  # Docker (localhost:8080)
```

## Project Structure

```
src/
  components/
    layout/        AppShell, Sidebar, TopBar, BottomNav (mobile)
    planner/       GardenPlanner (accordion+zoom), PlantPalette, PlantInfoPanel,
                   BedStats, CropRotation, GuildPicker, cell editing
    plants/        PlantList, PlantDetail, PlantCard, CustomPlantForm
    calendar/      CalendarPage (timeline + succession), SeasonTimeline,
                   SuccessionPlanner, TaskCalendar
    harvest/       HarvestLog with statistics
    journal/       Garden journal with tags
    seeds/         Seed inventory with viability tracking
    soil/          Soil tests (pH, N-P-K) + amendment tracking
    pests/         Pest & disease tracker
    sufficiency/   Self-sufficiency calculator (monthly), PreservationGuide
    foodplan/      Annual food plan with crop targets
    expenses/      Cost tracking, ROI dashboard
    weather/       Weather dashboard, alerts, SunlightWidget
    dashboard/     Dashboard, PlantingAdvisor, OnboardingWizard
    settings/      SettingsPage, DataManagement (backup/restore)
    ui/            Button, Card, Modal, Input, Toast, ErrorBoundary,
                   PlantIcon (45 SVGs, cached), PlantIconDisplay (memo)
  store/           12 Zustand slices: garden, task, harvest, journal, settings,
                   weather, customPlants, expense, seed, soil, pest + seasonArchives
  types/           TypeScript interfaces: plant, garden, task, harvest, journal,
                   weather, expense, seed, soil, pest
  data/            plants.json (45 plants), plantFamilies.ts, guilds.ts
  lib/             bedRecommendation (6 strategies), placementValidation,
                   weatherAlerts, sufficiency (monthly), sunlight, succession,
                   sharing, iCal, dataExport/Import, advisor, theme
  hooks/           usePlants, usePlantName, useBackendSync, useUndo
  test/            14 test suites, 87 tests
public/locales/    Translation JSON files (de/, en/, es/, fr/)
e2e/               8 Playwright E2E tests
backend/           Express + SQLite (Docker only)
```

## Key Patterns

- **Path aliases:** `@/` maps to `src/`
- **Plant data:** Static JSON at `src/data/plants.json`, accessed via `usePlants()` hook
- **Plant names:** i18n keys `plants.catalog.${id}.name`. Custom plants use `displayName`.
- **Store persistence:** Zustand persist with version 3, migration for schema changes
- **Store selectors:** ALL components use `useShallow()` — never bare `useStore()`
- **Plant icons:** SVG strings in PlantIcon.tsx, cached in Map, rendered via memo components
- **Lazy loading:** All routes lazy-loaded with retry wrapper for stale PWA cache
- **Environment-aware:** Greenhouse frost protection offsets shift all planting dates
- **Bottom nav:** 5-tab mobile bar (sm:hidden), sidebar for full navigation

## Adding a New Plant

1. Add plant data to `src/data/plants.json`
2. Add translations to all 4 locale files under `plants.catalog.{id}`
3. Add plant family mapping in `src/data/plantFamilies.ts`
4. Add SVG icon in `src/components/ui/PlantIcon.tsx` (PLANT_SVGS record)
5. Run `npm run test` to verify data integrity

## Adding a New Page

1. Create component in `src/components/{feature}/`
2. Add lazy import + route in `src/App.tsx`
3. Add nav entry in `src/components/layout/Sidebar.tsx`
4. Add translations in all 4 locale files
5. Use `useStore(useShallow(...))` — never bare `useStore()`

## Performance Rules

- Always use `useShallow()` selectors with Zustand
- Wrap frequently-rendered components in `React.memo()`
- Use `useMemo()` for expensive calculations
- Debounce search/filter inputs (200ms)
- SVG icons are cached — don't bypass the cache

## Conventions

- Named exports (not default) for all components
- UI primitives in `src/components/ui/`
- Tailwind custom colors: `garden-*` (greens), `earth-*` (browns), `sky-*` (blues)
- Dark mode via `dark:` prefix, class strategy
- German is the default locale
- All destructive actions require confirmation dialog
