<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="Gardener">
</p>

<h1 align="center">Gardener</h1>

<p align="center">
  <strong>Open-source garden planner for self-sufficiency</strong>
</p>

<p align="center">
  <a href="https://github.com/mniedermaier/gardener/actions/workflows/ci.yml"><img src="https://github.com/mniedermaier/gardener/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml"><img src="https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/plants-45+-228B22" alt="45+ plants">
  <img src="https://img.shields.io/badge/tests-95-brightgreen" alt="95 tests">
  <img src="https://img.shields.io/badge/i18n-DE%20%7C%20EN%20%7C%20ES%20%7C%20FR-blue" alt="DE | EN | ES | FR">
  <a href="https://buymeacoffee.com/mniedermaier"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"></a>
</p>

<p align="center">
  <a href="https://mniedermaier.github.io/gardener/"><strong>Live Demo</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick Start</a>
</p>

---

Plan your beds. Track your harvests. Manage your livestock. Calculate if your garden can feed your family.

Available in **4 languages**: Deutsch, English, Español, Français. Works as a **static site** (GitHub Pages), **offline PWA**, or **Docker container** with backend sync.

## Highlights

| | |
|---|---|
| **Smart Planner** | Drag-and-drop beds with companion/antagonist validation, 6 auto-fill strategies, walkway drawing, permaculture guild templates |
| **45 Plants** | Custom SVG icons, full data: timing, spacing, nutrition, yield, companions, preservation, seed saving |
| **Livestock** | Track chickens, ducks, rabbits, bees — log animals, production (eggs, honey, meat), and feed costs |
| **Self-Sufficiency** | Nutrition calculator (kcal, protein, vitamin C, fiber) from plants + animals, gap analysis, preservation guide |
| **Food Planning** | Annual crop targets per person, animal product yields, deficit warnings with area recommendations |
| **Weather** | Frost alerts, greenhouse warnings, watering advice, sunlight simulation |
| **Tracking** | Harvest log, garden journal, seed inventory, soil tests, pest tracker, expense tracking with ROI |
| **Environments** | Outdoor, raised bed, greenhouse, cold frame, polytunnel, container, windowsill, vertical |
| **Mobile-First** | Responsive design with bottom navigation, compact planner palette, bottom sheet editing |

## Quick Start

```bash
git clone https://github.com/mniedermaier/gardener.git
cd gardener && npm install && npm run dev
```

Or with Docker:

```bash
docker compose up --build    # http://localhost:8080
```

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # TypeScript + production build
npm run test         # 87 unit tests (Vitest)
npm run test:e2e     # 8 E2E tests (Playwright)
```

## Tech

React 19 &middot; TypeScript &middot; Vite &middot; Tailwind CSS &middot; Zustand &middot; @dnd-kit &middot; react-i18next &middot; date-fns &middot; SunCalc &middot; Playwright &middot; PWA

Optional backend: Express + SQLite in Docker.

## Architecture

```
src/
  components/     15 feature modules (planner, plants, calendar, harvest,
                  journal, seeds, soil, pests, livestock, sufficiency,
                  foodplan, expenses, weather, dashboard, settings)
  store/          13 Zustand slices with persist + migration
  lib/            Pure engines: recommendation, validation, alerts, sufficiency,
                  sunlight, succession, sharing, iCal, data export/import
  data/           45 plants (JSON), plant families, permaculture guilds
  types/          TypeScript interfaces for all data models
  test/           14 test suites
e2e/              Playwright browser tests
backend/          Express + SQLite (Docker only)
```

## Features

### Garden Planning
- Drag-and-drop plant placement on grid beds
- 8 growing environments with frost protection offsets
- Companion/antagonist planting validation
- 6 auto-fill strategies (balanced, calories, beginner, companion, diverse, intensive)
- Permaculture guild templates (Three Sisters, Tomato & Basil, Salad Bed)
- Walkway/path drawing on beds
- Crop rotation warnings by plant family
- Zoom controls for large gardens

### Livestock Management
- Register animals: chickens, ducks, rabbits, bees
- Log production: eggs, honey, meat, wax with quick-log buttons
- Track feed: type, quantity, cost per animal
- Stats: weekly eggs, annual honey, monthly feed costs
- Integrates into self-sufficiency calculator and food plan

### Self-Sufficiency Calculator
- Monthly food availability chart (fresh + preserved)
- Nutrition coverage: calories, protein, vitamin C, fiber
- Plant yields + animal product yields combined
- Winter gap analysis with storage recommendations
- Preservation guide (freezing, canning, fermenting, drying, root cellar)

### Additional Modules
- **Calendar**: Season timeline + succession planting generator
- **Task Manager**: Central task management with due dates and categories
- **Harvest Log**: Weight, quality, notes per harvest
- **Seed Inventory**: Track seeds by source, viability, cost
- **Soil Management**: pH/N-P-K tests + amendment history
- **Pest Tracker**: Pest & disease incidents with severity and treatment
- **Expense Dashboard**: 9 categories, ROI calculation vs. market prices
- **Weather**: Alerts, frost warnings, sunlight hours (SunCalc)
- **Journal**: Garden diary with tags

## Data Safety

All data lives in your browser. Settings > Data Management lets you:
- **Full backup** as JSON — all 14 data types (gardens, tasks, harvests, journal, seeds, soil, pests, livestock, feed, expenses, settings, weather)
- **Restore** with merge or overwrite mode
- **CSV export** for harvests and expenses
- Dashboard reminds you if no backup in 7+ days

## Contributing

Fork, branch, code, `npm run test && npm run build`, PR. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
