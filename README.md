# Gardener

[![CI](https://github.com/mniedermaier/gardener/actions/workflows/ci.yml/badge.svg)](https://github.com/mniedermaier/gardener/actions/workflows/ci.yml)
[![Deploy](https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml/badge.svg)](https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Plants](https://img.shields.io/badge/Plants-45+-228B22.svg)](#plant-database)
[![Tests](https://img.shields.io/badge/Tests-87_unit_+_8_e2e-brightgreen.svg)](#testing)

**The open-source garden planner for self-sufficiency.** Plan your beds, track your harvests, get smart weather alerts, and find out if your garden can feed your family.

**[Live Demo](https://mniedermaier.github.io/gardener/)** | Bilingual (DE/EN) | PWA | Docker

---

## Why Gardener?

Most garden planners let you drag icons onto a grid. Gardener goes further:

- **Knows your climate** - set your frost date and location; every recommendation, task, and timeline adjusts automatically
- **Understands companion planting** - green/red highlights show good and bad neighbors as you place them, with warnings you can act on
- **Thinks in nutrition** - not just "what fits", but "can this garden feed a family of four?" with calorie, protein, vitamin C, and fiber coverage
- **Supports every growing environment** - outdoor beds, raised beds, greenhouses (with full config), cold frames, polytunnels, containers, windowsills, vertical gardens
- **Tracks the whole year** - from seed to harvest to preserved jar

---

## Features

### Garden Planner
- Drag-and-drop or click-to-place (touch-friendly, 48px cells)
- Bed dimensions in meters with automatic grid calculation
- 8 environment types with dedicated configuration panels
- **Smart auto-fill** with 6 strategies: Balanced, Max Calories, Self-Sufficiency, Max Yield, Beginner, Quick Harvest
- **Placement validation**: real-time warnings for antagonists, spacing, environment mismatches
- Companion/antagonist cell highlighting
- Bed compatibility score and conflict counter
- **Draw walkways/paths** on beds
- Permaculture guild templates (Three Sisters, Mediterranean, Salad Bed, etc.)
- Crop rotation planner with next-year recommendations
- Inline cell editing (variety, planted date, notes)
- Duplicate gardens and beds
- Season archive with multi-year history
- Export/import as JSON, share via URL

### Plant Database
- **45 plants**: vegetables, fruit, berries, herbs - each with custom SVG icon
- Complete data per plant: timing, spacing, sun, water, companions, antagonists, yield, nutrition, preservation, seed saving
- Searchable and filterable by category
- **"Currently planted in"** shows where each plant is used across all gardens
- Add your own custom plants

### Self-Sufficiency Calculator
- Family size input with nutrition coverage bars (calories, protein, vitamin C, fiber)
- Gap analysis with concrete plant suggestions
- Estimated seasonal yield per plant
- Preservation guide and seed saving reference

### Calendar & Tasks
- Auto-generated tasks adjusted for each bed's environment type
- Succession planting scheduler
- Season timeline with hover tooltips showing exact dates
- **iCal export** for Google Calendar / Apple Calendar

### Weather & Sunlight
- OpenWeatherMap integration with **smart alerts**: frost, greenhouse overheating, watering, weekly digest
- Sunlight simulation with yearly daylight chart (SunCalc)
- Weather history storage

### Harvest Log, Journal, Costs
- Harvest tracking with weight, count, quality stars, statistics per plant
- Garden journal with tags, plant/bed links
- Expense tracking by category with **ROI dashboard** (harvest value vs costs)

### Dashboard
- Stats overview, "What to plant now?" advisor, backup reminders
- Global search across plants, tasks, journal (Ctrl+K)

---

## Quick Start

```bash
git clone https://github.com/mniedermaier/gardener.git
cd gardener
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). A guided onboarding wizard helps you set up.

### Docker

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Includes Express + SQLite backend for persistent data sync.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run 87 unit tests (Vitest) |
| `npm run test:e2e` | Run 8 E2E tests (Playwright) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 with SWC |
| Styling | Tailwind CSS 3 |
| State | Zustand with shallow selectors + localStorage persistence |
| Routing | React Router 7 (HashRouter) |
| Drag & Drop | @dnd-kit |
| i18n | react-i18next (German, English) |
| Dates | date-fns |
| Solar | SunCalc |
| Icons | Lucide React + 45 custom plant SVGs |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Express 5 + better-sqlite3 (optional, Docker) |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions (lint, test, e2e, deploy) |

---

## Architecture

```
src/
  components/
    dashboard/     Dashboard, planting advisor, onboarding wizard
    planner/       Garden planner, bed grid, plant palette, info panel,
                   bed stats, crop rotation, guild picker, cell editing
    plants/        Plant database, detail with planted-in overview,
                   custom plant form
    calendar/      Task calendar, season timeline, succession planner
    harvest/       Harvest log with statistics
    journal/       Garden journal with tags
    sufficiency/   Self-sufficiency calculator, preservation guide
    expenses/      Cost tracking, ROI dashboard
    weather/       Weather dashboard, alerts, sunlight widget
    settings/      App config, data management (backup/restore)
    layout/        App shell, responsive sidebar, global search
    ui/            Button, Card, Modal, Input, Toast, ErrorBoundary,
                   PlantIcon (45 SVGs), PlantIconDisplay
  store/           9 Zustand slices with persist + migration
  types/           TypeScript interfaces (plant, garden, task, harvest,
                   journal, weather, expense)
  data/            Plant catalog (45 plants JSON), plant families, guilds
  lib/             Engines: bed recommendation (6 strategies), placement
                   validation, weather alerts, sufficiency calc, sunlight,
                   succession, sharing, iCal, data export/import
  hooks/           usePlants, usePlantName, useBackendSync, useUndo
  test/            14 test files, 87 tests
e2e/               8 Playwright E2E tests
backend/           Express + SQLite (Docker only)
```

### Key Design Decisions

- **Offline-first**: all data in localStorage via Zustand persist. Optional backend sync in Docker.
- **Code splitting**: lazy-loaded routes keep initial bundle at ~390KB. Garden planner loads as separate ~90KB chunk.
- **Pure logic engines**: recommendation, validation, sufficiency, and alert systems are pure functions in `src/lib/`, fully testable.
- **Environment-aware**: greenhouse frost protection offsets automatically shift all planting dates and task generation.
- **Auto-recovery**: stale PWA cache after deploys triggers automatic cache-clear and reload.

---

## Data Management

All data is stored in the browser (localStorage). Use the **Data Management** section in Settings to:

- **Download full backup** (JSON with all gardens, tasks, harvests, journal, expenses, custom plants, settings)
- **Restore from backup** with merge or overwrite mode
- **Export harvests/expenses as CSV** for Excel/Google Sheets
- **Delete all data** with confirmation

A backup reminder appears on the dashboard if no backup has been made in 7+ days.

---

## Deployment

### GitHub Pages (automatic)

Every push to `main` triggers:
1. **CI workflow**: TypeScript check, unit tests, E2E tests
2. **Deploy workflow**: build with `--base=/gardener/` and deploy to Pages

### Docker

Multi-stage `Dockerfile`: nginx (frontend) + Express/SQLite (backend) in one container.

```yaml
services:
  gardener:
    build: .
    ports: ["8080:80"]
    volumes: [gardener-data:/app/data]
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run test` and `npm run build`
5. Open a pull request

See [ROADMAP.md](./ROADMAP.md) for planned features and the long-term vision.

---

## License

MIT
