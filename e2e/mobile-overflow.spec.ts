import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Guards against horizontal overflow on a phone. A single element wider than
 * the viewport (e.g. a visually hidden chart table) makes mobile browsers zoom
 * the whole page out, so every main route is checked at 390 px with the demo
 * garden (charts, lists and weather filled).
 */

const demoState = JSON.parse(readFileSync(new URL("./fixtures/demo-state.json", import.meta.url), "utf8")) as Record<string, unknown>;

const ROUTES = [
  "/", "/weather", "/planner", "/planner?bed=b-hochbeet", "/plants", "/plants?plant=tomato", "/companions",
  "/calendar", "/tasks", "/harvest", "/journal", "/pantry", "/seeds", "/soil", "/pests", "/water-log",
  "/livestock", "/livestock/a1", "/livestock/production", "/livestock/feed", "/livestock/health",
  "/sufficiency", "/foodplan", "/expenses", "/settings", "/import",
];

function forecast() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const list = [];
  for (let i = 0; i < 40; i++) {
    const t = new Date(start.getTime() + i * 3 * 3600 * 1000);
    const day = Math.floor(i / 8);
    list.push({
      dt_txt: `${t.toISOString().slice(0, 10)} ${String(t.getHours()).padStart(2, "0")}:00:00`,
      main: { temp: [9, 7, 4, -6, 6][day] ?? 6, humidity: 75 },
      weather: [{ description: "overcast", icon: "04d" }],
      pop: 0.3,
    });
  }
  return { list };
}

/** Open-Meteo (default provider) with a cold night, so the alert cards render. */
function openMeteo() {
  const time: string[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    time.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
  }
  return {
    current: { temperature_2m: 11, apparent_temperature: 9, relative_humidity_2m: 78, weather_code: 3, wind_speed_10m: 11, is_day: 1 },
    daily: {
      time,
      weather_code: [61, 3, 0, 0, 2, 80, 1],
      temperature_2m_max: [14, 12, 9, 4, 10, 13, 15],
      temperature_2m_min: [2, -1, -6, -5, 1, 3, 4],
      precipitation_probability_max: [70, 30, 5, 0, 20, 60, 10],
      precipitation_sum: [2, 0, 0, 0, 0, 3, 0],
    },
  };
}

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("no overflow beyond the shell on any main route at 390 px", async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/api\.open-meteo\.com\/v1\/forecast/, (r) => r.fulfill({ json: openMeteo() }));
  await page.route(/openweathermap\.org\/data\/2\.5\/weather/, (r) =>
    r.fulfill({ json: { name: "München", main: { temp: 11, feels_like: 9, temp_min: 6, temp_max: 13, humidity: 78 }, weather: [{ description: "overcast", icon: "04d" }], wind: { speed: 3 } } }),
  );
  await page.route(/openweathermap\.org\/data\/2\.5\/forecast/, (r) => r.fulfill({ json: forecast() }));
  // Seed before the app boots (once per tab, so in-app changes survive navigation).
  await page.addInitScript((state) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    localStorage.setItem("gardener-storage", JSON.stringify({ state, version: 4 }));
  }, demoState);

  const failures: string[] = [];
  for (const route of ROUTES) {
    await page.goto(`/#${route}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator("main h1").first()).toBeAttached({ timeout: 10_000 });
    const m = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      doc: document.documentElement.scrollWidth,
      height: document.documentElement.clientHeight,
      docHeight: document.documentElement.scrollHeight,
      main: document.querySelector("main")?.scrollWidth ?? 0,
    }));
    if (m.doc > m.viewport || m.main > m.viewport) failures.push(`${route}: document ${m.doc}px, main ${m.main}px (viewport ${m.viewport}px)`);
    // Only <main> scrolls. A taller document (e.g. an sr-only chart table
    // positioned against the page) lets the shell, bottom nav and FAB scroll away.
    if (m.docHeight > m.height) failures.push(`${route}: document ${m.docHeight}px tall (viewport ${m.height}px)`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
