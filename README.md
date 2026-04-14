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
</p>

<p align="center">
  <a href="https://mniedermaier.github.io/gardener/"><strong>Live Demo</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="ROADMAP.md">Roadmap</a>
  &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick Start</a>
</p>

---

Plan your beds. Track your harvests. Get weather alerts. Calculate if your garden can feed your family.

Available in **4 languages**: Deutsch, English, Español, Français. Works as a **static site** (GitHub Pages), **offline PWA**, or **Docker container** with backend sync.

## Highlights

| | |
|---|---|
| **Smart Planner** | Drag-and-drop beds with companion/antagonist validation, 6 auto-fill strategies, walkway drawing, permaculture guild templates |
| **45 Plants** | Custom SVG icons, full data: timing, spacing, nutrition, yield, companions, preservation, seed saving |
| **Self-Sufficiency** | Nutrition calculator (kcal, protein, vitamin C, fiber), gap analysis, preservation guide |
| **Weather** | Frost alerts, greenhouse warnings, watering advice, sunlight simulation |
| **Tracking** | Harvest log, garden journal, expense tracking with ROI |
| **Environments** | Outdoor, raised bed, greenhouse, cold frame, polytunnel, container, windowsill, vertical |

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
  components/     11 feature modules (planner, plants, calendar, harvest,
                  journal, sufficiency, expenses, weather, dashboard, settings, ui)
  store/          9 Zustand slices with persist + migration
  lib/            Pure engines: recommendation, validation, alerts, sufficiency,
                  sunlight, succession, sharing, iCal, data export/import
  data/           45 plants (JSON), plant families, permaculture guilds
  test/           14 test suites
e2e/              Playwright browser tests
backend/          Express + SQLite (Docker only)
```

## Data Safety

All data lives in your browser. Settings > Data Management lets you:
- **Full backup** as JSON (gardens, harvests, journal, expenses, plants, settings)
- **Restore** with merge or overwrite
- **CSV export** for harvests and expenses
- Dashboard reminds you if no backup in 7+ days

## Contributing

Fork, branch, code, `npm run test && npm run build`, PR. See [ROADMAP.md](ROADMAP.md) for ideas.

## License

[MIT](LICENSE)
