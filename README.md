# Gardener

Self-sufficiency garden planner for vegetables, fruit, berries and herbs. Plan what to grow where, track harvests, get weather alerts, and calculate if your garden can feed your family.

## Features

**Garden Planner** - Drag-and-drop bed editor with 8 environment types (outdoor, raised bed, greenhouse, cold frame, polytunnel, container, windowsill, vertical). Companion/antagonist indicators, crop rotation planning, permaculture guild templates.

**Plant Database** - 40+ plants with sowing/harvest timing, spacing, sun/water requirements, companion planting data. Nutrition data, preservation methods, seed saving info. Add your own custom plants.

**Greenhouse Support** - Full configurator: material, heating, ventilation, temperature ranges. Automatic season extension adjusts all planting dates.

**Calendar & Tasks** - Auto-generated task timeline from your garden plan, adjusted for environment type. Succession planting scheduler. iCal export for Google Calendar/Apple Calendar.

**Season Timeline** - Visual month-by-month chart showing sow/transplant/harvest windows per plant, with frost date marker.

**Harvest Log** - Track yields by weight, count, and quality. Statistics dashboard with totals per plant.

**Garden Journal** - Date entries with text, tags, plant/bed links for documenting your garden journey.

**Self-Sufficiency Calculator** - Family size input, nutrition coverage analysis (calories, protein, vitamin C, fiber), gap analysis with plant suggestions.

**Weather Dashboard** - OpenWeatherMap integration with smart alerts: frost warnings, greenhouse overheating, watering recommendations, weekly garden digest. Sunlight simulation with yearly daylight chart.

**Costs & ROI** - Track expenses by category, calculate harvest value at market prices, see your garden's return on investment.

**Season Management** - Archive seasons, start fresh with crop rotation suggestions. Multi-year history.

**Sharing** - Export/import garden plans as JSON. Share via URL link. Permaculture guild one-click templates.

## Tech Stack

React 19 + Vite + TypeScript + Tailwind CSS, Zustand state management, react-i18next (DE/EN), @dnd-kit drag-and-drop, SunCalc for solar calculations, PWA with offline support.

Optional backend: Express + SQLite in Docker for persistent sync.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Docker

```bash
docker compose up --build   # http://localhost:8080
```

## Testing

```bash
npm run test       # 59 tests
```

## Build

```bash
npm run build      # Code-split production build
```

## Project Structure

```
src/
  components/      # React components by feature
    planner/       # Garden planner, crop rotation, guilds
    plants/        # Plant database, custom plants
    calendar/      # Tasks, season timeline, succession planting
    harvest/       # Harvest tracking
    journal/       # Garden journal
    sufficiency/   # Self-sufficiency calculator, preservation guide
    expenses/      # Cost tracking, ROI
    weather/       # Weather dashboard, alerts, sunlight
    settings/      # App settings
    layout/        # App shell, sidebar, top bar
    ui/            # Button, Card, Modal, Input
  store/           # Zustand slices
  types/           # TypeScript interfaces
  data/            # Plant catalog, plant families, guilds
  lib/             # Weather alerts, sufficiency calc, sunlight, succession, sharing, iCal
  hooks/           # usePlants, usePlantName, useBackendSync
  test/            # Vitest tests
```

See [ROADMAP.md](./ROADMAP.md) for the full vision and future plans.
