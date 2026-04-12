# Gardener

**The open-source garden planner for self-sufficiency.** Plan your beds, track your harvests, get smart weather alerts, and find out if your garden can feed your family.

Bilingual (German / English). Works as a static site (GitHub Pages), offline-capable PWA, or full-stack Docker container.

---

## Why Gardener?

Most garden planners let you drag icons onto a grid. Gardener goes further:

- **Knows your climate** -- set your last frost date and location; every recommendation, task, and timeline adjusts automatically.
- **Understands companion planting** -- green/red highlights show good and bad neighbors *as you place them*, with warnings you can act on.
- **Thinks in nutrition** -- not just "what fits", but "can this garden feed a family of four?" with calorie, protein, vitamin C, and fiber coverage.
- **Supports every growing environment** -- outdoor beds, raised beds, greenhouses with full configuration (heating, ventilation, material), cold frames, polytunnels, containers, windowsills, vertical gardens.
- **Tracks the whole year** -- from seed to harvest to preserved jar. Sowing calendar, harvest log, garden journal, cost tracking, ROI.

---

## Features

### Garden Planner
- Drag-and-drop *or* click-to-place (touch-friendly)
- Bed dimensions in meters, automatic grid calculation
- 8 environment types with dedicated configuration panels
- **Smart auto-fill**: one click generates an optimized planting plan considering companion planting, spacing, crop rotation, season, and nutritional diversity
- **Placement validation**: real-time warnings for antagonist neighbors, spacing violations, environment mismatches
- Companion/antagonist cell highlighting when a plant is selected
- Bed compatibility score and conflict counter
- Permaculture guild templates (Three Sisters, Mediterranean, Salad Bed, and more)
- Crop rotation planner by plant family with next-year recommendations
- Season archive: snapshot and start fresh for the new year
- Export/import as JSON, share via URL

### Plant Database
- 40+ plants: vegetables, fruit, berries, herbs
- Complete data per plant: sowing/transplant/harvest timing, spacing, sun, water, companions, antagonists, expected yield, calories, protein, vitamin C, fiber, preservation methods, seed saving info
- Searchable and filterable by category
- Add your own custom plants

### Self-Sufficiency Calculator
- Enter your family size
- See nutrition coverage bars: calories, protein, vitamin C, fiber
- Gap analysis with concrete suggestions ("add more beans for protein")
- Estimated seasonal yield in kg per plant
- Preservation guide: canning, freezing, fermenting, drying, root cellar
- Seed saving reference with difficulty and viability

### Calendar and Tasks
- Auto-generated tasks from your garden plan, adjusted for each bed's environment
- Succession planting scheduler with configurable intervals
- Season timeline: visual month-by-month sow/transplant/harvest chart
- iCal export for Google Calendar / Apple Calendar
- Overdue, this week, upcoming, completed views

### Weather and Sunlight
- OpenWeatherMap integration: current conditions + 5-day forecast
- **Smart alerts**: frost warnings, greenhouse overheating/cooling, watering recommendations, weekly garden digest
- Sunlight simulation: sunrise/sunset, daylight hours, max sun angle, yearly daylight chart (SunCalc)
- Weather history storage for climate profiling

### Harvest Log
- Log weight, count, quality (1-5 stars), notes per harvest
- Statistics: total yield, average quality, breakdown per plant
- Chronological entry list

### Garden Journal
- Dated entries with title, text, tags
- Link entries to specific plants or beds
- Chronological timeline

### Costs and ROI
- Track expenses by category: seeds, soil, tools, fertilizer, infrastructure, water
- Harvest value calculated at market prices
- Return on investment percentage

### Dashboard
- Overview with stats: beds, plant types, tasks this week, total harvest
- "What to plant now?" advisor based on current date and frost date
- Upcoming tasks, recent harvests, garden overview, quick stats

---

## Screenshots

*Start the dev server and explore -- the app is fully functional locally with no API keys required (weather features need an OpenWeatherMap key).*

---

## Quick Start

```bash
git clone https://github.com/mniedermaier/gardener.git
cd gardener
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

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
| `npm run test` | Run all 70 tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 with SWC |
| Styling | Tailwind CSS 3 |
| State | Zustand with localStorage persistence |
| Routing | React Router 7 (HashRouter for GitHub Pages) |
| Drag & Drop | @dnd-kit |
| i18n | react-i18next (German, English) |
| Dates | date-fns |
| Solar | SunCalc |
| Icons | Lucide React |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Express 5 + better-sqlite3 (optional, Docker) |
| Testing | Vitest + Testing Library |

---

## Architecture

```
src/
  components/
    dashboard/     Dashboard home, planting advisor
    planner/       Garden planner, bed grid, plant palette, info panel,
                   bed stats, crop rotation, guild picker, import
    plants/        Plant database, detail view, custom plant form
    calendar/      Task calendar, season timeline, succession planner
    harvest/       Harvest log with statistics
    journal/       Garden journal
    sufficiency/   Self-sufficiency calculator, preservation guide
    expenses/      Cost tracking, ROI dashboard
    weather/       Weather dashboard, alerts, sunlight widget
    settings/      App configuration
    layout/        App shell, responsive sidebar, top bar
    ui/            Button, Card, Modal, Input, ErrorBoundary
  store/           Zustand slices (garden, task, harvest, journal,
                   settings, weather, expenses, custom plants)
  types/           TypeScript interfaces (plant, garden, task,
                   harvest, journal, weather, expense)
  data/            Plant catalog (JSON), plant families, guilds
  lib/             Engines: bed recommendation, placement validation,
                   weather alerts, sufficiency calc, sunlight sim,
                   succession planning, garden sharing, iCal export,
                   theme management
  hooks/           usePlants, usePlantName, useBackendSync
  test/            70 tests across 12 test files
backend/
  src/             Express server with SQLite
    routes/        Gardens, tasks, sync endpoints
  migrations/      Database schema
```

### Key Design Decisions

- **Offline-first**: all data in localStorage via Zustand persist. Optional backend sync when Docker is used.
- **HashRouter**: ensures GitHub Pages compatibility without server-side routing.
- **Code splitting**: lazy-loaded routes keep the initial bundle at 384 KB; the garden planner loads as a separate 89 KB chunk.
- **Pure logic engines**: recommendation, validation, sufficiency, and alert systems are pure functions in `src/lib/`, fully testable without UI.
- **Environment-aware**: greenhouse frost protection offsets automatically shift all planting dates and task generation.

---

## Data Model

**Garden** contains **Beds**, each with an environment type and configuration. Beds contain a grid of **CellPlantings** referencing plants by ID.

**Plants** carry timing (sow/transplant/harvest relative to frost date), spacing, sun/water needs, companion/antagonist lists, nutrition data, yield estimates, preservation methods, and seed saving info.

**Tasks** are auto-generated from plantings or manually created. **Harvests** and **Journal entries** link back to gardens, beds, and plants. **Expenses** track costs by category.

Season archives snapshot a garden's beds for multi-year history and crop rotation planning.

---

## Deployment

### GitHub Pages

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds and deploys to GitHub Pages automatically.

### Docker

The multi-stage `Dockerfile` builds the frontend (served by nginx) and the Express + SQLite backend into a single container. Data persists in a Docker volume.

```yaml
# docker-compose.yml
services:
  gardener:
    build: .
    ports:
      - "8080:80"
    volumes:
      - gardener-data:/app/data
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
