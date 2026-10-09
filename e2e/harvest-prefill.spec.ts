import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * "Ernte erfassen: Tomate" must open the harvest dialog with the plant (and
 * its bed, when the plant grows in exactly one) filled in — from the ripe list
 * on "Heute" as well as from the plant detail page. The delete confirmation is
 * a real dialog: it names the object, starts on "Abbrechen" and Esc cancels.
 */

const demoState = JSON.parse(readFileSync(new URL("./fixtures/demo-state.json", import.meta.url), "utf8")) as Record<string, unknown>;

async function seed(page: Page) {
  // Mid-August: the fixture's May plantings are ripe, independent of the test date.
  await page.clock.setFixedTime(new Date("2026-08-20T10:00:00"));
  await page.route(/open-meteo\.com|openweathermap\.org/, (r) => r.abort());
  await page.addInitScript((state) => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    localStorage.setItem("gardener-storage", JSON.stringify({ state, version: 4 }));
  }, demoState);
}

test.describe("harvest prefill", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Heute → Ernte erfassen: <Pflanze> opens a prefilled dialog", async ({ page }) => {
    await seed(page);
    await page.goto("/#/");
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });

    const tab = page.getByRole("tab", { name: /Ernten/ });
    if (await tab.count()) await tab.first().click();
    const row = page.getByRole("button", { name: /^Ernte erfassen: / }).first();
    await expect(row).toBeVisible();
    const plant = ((await row.getAttribute("aria-label")) ?? (await row.innerText())).replace(/^Ernte erfassen: /, "").trim();
    expect(plant).not.toBe("");
    await row.click();

    await expect(page).toHaveURL(/#\/harvest/);
    const dialog = page.getByRole("dialog", { name: "Ernte erfassen" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Was hast du geerntet?" })).toHaveValue(new RegExp(plant));
    await expect(dialog.locator("select")).not.toHaveValue("");
  });

  test("Pflanzendetail → Ernte erfassen opens a prefilled dialog with its only bed", async ({ page }) => {
    await seed(page);
    await page.goto("/#/plants?plant=tomato");
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Ernte erfassen", exact: true }).first().click();

    const dialog = page.getByRole("dialog", { name: "Ernte erfassen" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Was hast du geerntet?" })).toHaveValue(/Tomate/);
    // Tomatoes grow only in the greenhouse, so that bed is preselected.
    await expect(dialog.locator("select")).toHaveValue("b-gh");
  });

  test("Pflanzendetail → Saatgut hinzufügen opens a prefilled dialog", async ({ page }) => {
    await seed(page);
    await page.goto("/#/plants?plant=tomato");
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Saatgut hinzufügen", exact: true }).first().click();

    const dialog = page.getByRole("dialog", { name: "Saatgut hinzufügen" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox").first()).toHaveValue(/Tomate/);
  });

  test("delete confirmation names the object, focuses Abbrechen and closes on Esc", async ({ page }) => {
    await seed(page);
    await page.goto("/#/harvest");
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });

    const trigger = page.locator('main [aria-haspopup="menu"]').first();
    await trigger.click();
    await page.getByRole("menu").getByRole("menuitem", { name: /löschen/i }).last().click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("heading")).toHaveText(/^Ernte „.+“ löschen\?$/);
    await expect(confirm.getByRole("button", { name: "Abbrechen" })).toBeFocused();

    // Focus stays inside the dialog.
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
    expect(await confirm.evaluate((d) => d.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(confirm).toHaveCount(0);
    await expect(page.getByText(/Ernte gelöscht/)).toHaveCount(0);
  });
});
