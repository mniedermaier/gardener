import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Every list with a row menu ("…") must let a real pointer reach "Löschen":
 * the panel may not be covered by a later row (stacking contexts) and may not
 * open below the viewport. Each list is checked with its first and its last
 * row menu; the last one is scrolled to the bottom edge so the panel has to
 * flip above the trigger. The click must open the confirmation dialog, which
 * is then cancelled.
 */

const demoState = JSON.parse(readFileSync(new URL("./fixtures/demo-state.json", import.meta.url), "utf8")) as Record<string, unknown>;

const ROUTES = [
  "/harvest", "/journal", "/pantry", "/seeds", "/pests", "/soil", "/water-log", "/expenses",
  "/livestock", "/livestock/production", "/livestock/feed", "/livestock/health", "/tasks", "/planner",
];

const VIEWPORTS = [
  { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
];

async function seed(page: Page) {
  await page.route(/open-meteo\.com|openweathermap\.org/, (r) => r.abort());
  await page.addInitScript((state) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    localStorage.setItem("gardener-storage", JSON.stringify({ state, version: 4 }));
  }, demoState);
}

/** Null when a real pointer at the element's centre would hit it, else what it hits instead. */
async function blocker(el: Locator) {
  return el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && (hit === node || node.contains(hit))) return null;
    return `${hit?.tagName.toLowerCase()}.${hit?.getAttribute("class")?.slice(0, 60)} at y=${Math.round(r.top)}`;
  });
}

/**
 * Scroll <main> (the app's scroll container) so the trigger sits in the middle
 * or near the bottom edge, above a mobile bottom nav. Element.scrollIntoView is
 * avoided on purpose: it also scrolls the overflow-hidden shell.
 */
async function scrollTo(trigger: Locator, where: "center" | "bottom") {
  await trigger.evaluate((node, at) => {
    const main = document.querySelector("main");
    if (!main) return;
    const r = node.getBoundingClientRect();
    const target = at === "center" ? window.innerHeight / 2 : window.innerHeight - 110;
    main.scrollBy({ top: r.bottom - target, behavior: "instant" });
  }, where);
}

const flipped = { count: 0 };

/** Accessible name of a collapsed group row (livestock.showEntries). */
const EXPAND = /Einträge anzeigen/;

async function checkMenu(page: Page, trigger: Locator, label: string, problems: string[], expectFlip: boolean) {
  const covered = await blocker(trigger);
  if (covered) {
    problems.push(`${label}: trigger is covered by ${covered}`);
    return;
  }
  const box = await trigger.boundingBox();
  if (!box) return;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();

  const vh = page.viewportSize()!.height;
  const mb = (await menu.boundingBox())!;
  if (mb.y < 0 || mb.y + mb.height > vh + 1) problems.push(`${label}: menu outside viewport (${Math.round(mb.y)}–${Math.round(mb.y + mb.height)}, vh ${vh})`);
  // Near the bottom edge there is no room below, so the panel must sit above the trigger.
  const roomBelow = vh - (box.y + box.height);
  if (expectFlip && roomBelow < mb.height + 12 && mb.y + mb.height > box.y + 1) problems.push(`${label}: menu did not flip above the trigger`);
  if (expectFlip && roomBelow < mb.height + 12) flipped.count++;

  const del = menu.getByRole("menuitem", { name: /löschen/i }).last();
  if ((await del.count()) === 0) {
    await page.keyboard.press("Escape");
    return;
  }
  const delCovered = await blocker(del);
  if (delCovered) {
    problems.push(`${label}: "Löschen" is covered by ${delCovered}`);
    await page.keyboard.press("Escape");
    return;
  }
  const db = (await del.boundingBox())!;
  await page.mouse.click(db.x + db.width / 2, db.y + db.height / 2);
  const confirm = page.getByRole("alertdialog");
  try {
    await expect(confirm).toBeVisible({ timeout: 3000 });
  } catch {
    problems.push(`${label}: real click on "Löschen" did not open the confirmation`);
    return;
  }
  await confirm.getByRole("button", { name: "Abbrechen" }).click();
  await expect(confirm).toHaveCount(0);
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use(vp.use);

    test("row menus: Löschen reachable by a real click, panel flips into view", async ({ page }) => {
      test.setTimeout(180_000);
      await seed(page);
      const problems: string[] = [];
      let checked = 0;
      flipped.count = 0;
      for (const route of ROUTES) {
        await page.goto(`/#${route}`);
        await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 });
        const triggers = page.locator('main [aria-haspopup="menu"]');
        // Aggregated lists (production: one row per week) show their entries,
        // and with them the row menus, only when a group is expanded.
        if ((await triggers.count()) === 0) {
          const expanders = page.locator("main").getByRole("button", { name: EXPAND });
          for (let i = 0; i < Math.min(2, await expanders.count()); i++) await expanders.first().click();
        }
        const n = await triggers.count();
        if (n === 0) {
          problems.push(`${route}: no row menu found`);
          continue;
        }
        for (const [which, idx] of [["first", 0], ["last", n - 1]] as const) {
          if (which === "last" && idx === 0) continue;
          const trigger = triggers.nth(idx);
          await scrollTo(trigger, which === "last" ? "bottom" : "center");
          await checkMenu(page, trigger, `${route} (${which})`, problems, which === "last");
          checked++;
        }
      }
      expect(problems, problems.join("\n")).toEqual([]);
      expect(checked).toBeGreaterThan(ROUTES.length);
      // Most lists are long enough that the last menu sits at the bottom edge.
      expect(flipped.count, "no menu needed to flip — the flip path was not exercised").toBeGreaterThan(3);
    });
  });
}
