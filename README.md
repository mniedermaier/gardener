<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="Gardener">
</p>

<h1 align="center">Gardener</h1>

<p align="center">
  <strong>The open-source toolkit for self-sufficient living</strong><br>
  <em>Plan beds. Raise animals. Preserve harvests. Feed your family.</em>
</p>

<p align="center">
  <a href="https://github.com/mniedermaier/gardener/actions/workflows/ci.yml"><img src="https://github.com/mniedermaier/gardener/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml"><img src="https://github.com/mniedermaier/gardener/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/plants-45+-228B22" alt="45+ plants">
  <img src="https://img.shields.io/badge/tests-311-brightgreen" alt="311 tests">
  <img src="https://img.shields.io/badge/i18n-DE%20%7C%20EN%20%7C%20ES%20%7C%20FR-blue" alt="4 languages">
  <a href="https://buymeacoffee.com/mniedermaier"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"></a>
</p>

<p align="center">
  <a href="https://mniedermaier.github.io/gardener/"><strong>Try the Live Demo</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick Start</a>
  &nbsp;&middot;&nbsp;
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

---

## What is Gardener?

Gardener is a **complete self-sufficiency planner** — not just for your garden, but for your entire homestead. It answers the question every self-sufficiency beginner asks: **"Can my garden feed my family?"**

Works **offline as a PWA**, runs as a **static site** (GitHub Pages), or as a **Docker container** with backend sync. Available in **Deutsch, English, Español, Français**.

## Features at a Glance

**Garden Planning**
- Drag & drop bed planner with 8 environments (outdoor, greenhouse, polytunnel, raised bed, ...)
- 45 plants with hand-drawn SVG icons, companion/antagonist validation
- 6 auto-fill strategies (calories, yield, beginner, ...) with 4 planting directions
- Companion planting matrix — see all relationships at a glance
- Crop rotation warnings, permaculture guild templates, walkway drawing

**Livestock Management**
- 7 animal types: chickens, ducks, rabbits, bees, goats, sheep, quail
- Production tracking with quick-log (tap +5 eggs), trends chart, per-animal analytics
- Feed cost management with monthly comparison and per-animal ROI
- Health records: vaccinations, deworming, illness — with overdue warnings

**Self-Sufficiency Calculator**
- Monthly nutrition coverage (calories, protein, vitamin C, fiber)
- Uses **real production data** when available, falls back to estimates
- Winter gap analysis with preservation recommendations
- Annual food plan with crop targets and animal product yields

**Preservation & Pantry**
- Track stored food: jars, frozen bags, dried herbs — with expiry warnings
- 5 methods: canning, freezing, fermenting, drying, root cellar
- Per-plant preservation guides and practical tips

**Everything Else**
- Task calendar, harvest log, garden journal (with photos), seed inventory
- Soil tests (pH, N-P-K), pest tracker, irrigation logging, expense tracking with ROI
- Weather dashboard with frost alerts and sunlight simulation
- Full data backup/restore (17 data types), CSV export
- Print-friendly bed layouts

## Quick Start

```bash
git clone https://github.com/mniedermaier/gardener.git
cd gardener && npm install && npm run dev
```

Docker:

```bash
docker compose up --build    # http://localhost:8080
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (localhost:5173) |
| `npm run build` | TypeScript check + production build |
| `npm run test` | 311 unit tests (Vitest) |
| `npm run test:e2e` | 8 E2E tests (Playwright) |

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS · Zustand · @dnd-kit · react-i18next · date-fns · SunCalc · Vitest · Playwright · PWA (Workbox)

Optional backend: Express + SQLite + rate limiting (Docker only)

## Data Safety

All data stays in your browser. No account needed, no data sent anywhere.

- **Full JSON backup** — 17 data types (gardens, animals, pantry, ...)
- **CSV export** for harvests and expenses
- **Backend sync** optional via Docker (SQLite)
- Dashboard reminds you if no backup in 7+ days

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome!

## License

[MIT](LICENSE)
