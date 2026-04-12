# CLAUDE.md

## Project Overview

Gardener is a self-sufficiency garden planning application for planning vegetables, fruit, berries, and herbs. It runs as a static GitHub Pages site and as a Docker container with an optional backend.

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 3
- **State:** Zustand with `persist` middleware (localStorage)
- **Routing:** HashRouter (GitHub Pages compatible)
- **i18n:** react-i18next with HTTP backend, German (de) and English (en)
- **DnD:** @dnd-kit/core for garden planner drag-and-drop
- **Icons:** lucide-react
- **Dates:** date-fns
- **Backend (Docker only):** Express 5 + better-sqlite3 + Zod
- **PWA:** vite-plugin-pwa with service worker

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # TypeScript check + Vite production build
npm run test       # Run Vitest tests
npm run test:watch # Vitest watch mode
npm run preview    # Preview production build

# Docker
docker compose up --build  # Build and run (localhost:8080)

# Backend (standalone)
cd backend && npm install && npm run dev
```

## Project Structure

```
src/
  components/
    layout/       # AppShell, Sidebar, TopBar
    planner/      # GardenPlanner (DnD), CropRotation
    plants/       # PlantList, PlantDetail, PlantCard
    weather/      # WeatherDashboard
    calendar/     # TaskCalendar, SeasonTimeline
    settings/     # SettingsPage
    ui/           # Button, Card, Modal, Input
  store/          # Zustand slices: garden, task, settings
  types/          # TypeScript interfaces: plant, garden, task, weather
  data/           # plants.json (40 plants), plantFamilies.ts
  hooks/          # usePlants, useBackendSync
  lib/            # i18n.ts, theme.ts
  test/           # Vitest tests
public/locales/   # Translation JSON files (de/, en/)
backend/          # Express + SQLite (only used in Docker)
```

## Key Architectural Patterns

- **Path aliases:** `@/` maps to `src/` (configured in vite.config.ts and tsconfig.app.json)
- **Plant data:** Static JSON at `src/data/plants.json`, accessed via `usePlants()` hook
- **Plant names:** Stored as i18n keys, not in plants.json. Access via `t('plants.catalog.${id}.name')`
- **Store persistence:** Zustand persist middleware writes to localStorage key `gardener-storage`
- **Backend detection:** Frontend checks `GET /api/health` to detect if backend is available
- **Translations:** Files in `public/locales/{lang}/translation.json`, loaded at runtime by i18next HTTP backend

## Adding a New Plant

1. Add plant data to `src/data/plants.json`
2. Add translations to both `public/locales/en/translation.json` and `public/locales/de/translation.json` under `plants.catalog.{id}`
3. Add plant family mapping in `src/data/plantFamilies.ts`
4. Run `npm run test` to verify data integrity

## Conventions

- All components use named exports (not default)
- UI components are in `src/components/ui/`
- Tailwind custom colors: `garden-*` (greens), `earth-*` (browns), `sky-*` (blues)
- Dark mode via Tailwind `dark:` prefix, toggled by `dark` class on `<html>`
- German is the default locale

## Current Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full 8-phase plan. Next up: Phase 1 (Greenhouse & Growing Environments).
