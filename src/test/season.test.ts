import { describe, it, expect } from "vitest";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";
import type { Bed, Garden } from "@/types/garden";
import { getPhaseWindows, getHarvestReady, seasonFrost, suitsEnvironment } from "@/lib/season";
import { agendaRowsByPlant, getGardenSowingAgenda, getPlantableNow, getPlantingTaskDates, getSowingAgenda, groupAgendaBedsByDate } from "@/lib/advisor";
import { recommendBedPlanting } from "@/lib/bedRecommendation";
import { groupTasksByDue, nextDue, taskGroup } from "@/lib/tasks";
import type { Task } from "@/types/task";

const plants = plantsData as Plant[];
const plantMap = new Map(plants.map((p) => [p.id, p]));
const P = (id: string) => plantMap.get(id)!;
const OCT_5 = new Date(2026, 9, 5);

function garden(bed: Partial<Bed>): Garden {
  return {
    id: "g", name: "G", season: "2026",
    beds: [{ id: "b", name: "Bed", x: 0, y: 0, width: 4, height: 4, environmentType: "outdoor_bed", cells: [], ...bed } as Bed],
  } as Garden;
}

describe("season windows", () => {
  it("uses this year's frost day for a stored date from an earlier year", () => {
    expect(seasonFrost("2023-05-15", OCT_5)).toEqual(new Date(2026, 4, 15));
  });

  it("keeps continuous croppers harvestable until the autumn frost, later under glass", () => {
    const frost = new Date(2026, 4, 15);
    const open = getPhaseWindows(P("tomato"), frost).find((w) => w.phase === "harvest")!;
    const glass = getPhaseWindows(P("tomato"), frost, { frostProtectionWeeks: 4 }).find((w) => w.phase === "harvest")!;
    expect(open.end.getMonth()).toBe(9); // mid October
    expect(glass.end > open.end).toBe(true);
    expect(glass.start < open.start).toBe(true);
  });

  it("does not stretch one-off harvests like carrots", () => {
    const harvest = getPhaseWindows(P("carrot"), new Date(2026, 4, 15)).find((w) => w.phase === "harvest")!;
    expect(harvest.end < new Date(2026, 9, 1)).toBe(true);
  });
});

describe("harvest ready", () => {
  const tomatoes = [{ cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-05-08" }];

  it("lists greenhouse tomatoes in early October", () => {
    const g = garden({ environmentType: "greenhouse", cells: tomatoes,
      greenhouseConfig: { material: "polycarbonate", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 } });
    expect(getHarvestReady([g], plantMap, OCT_5, "2026-05-15").map((r) => r.plantId)).toContain("tomato");
  });

  it("ends the outdoor tomato season after the autumn frost but not the greenhouse one", () => {
    const nov = new Date(2026, 10, 1);
    const outdoor = garden({ cells: tomatoes });
    const glass = garden({ environmentType: "greenhouse", cells: tomatoes,
      greenhouseConfig: { material: "glass", heated: false, ventilation: "manual", minTempC: 5, maxTempC: 35, frostProtectionWeeks: 4 } });
    expect(getHarvestReady([outdoor], plantMap, nov, "2026-05-15")).toHaveLength(0);
    expect(getHarvestReady([glass], plantMap, nov, "2026-05-15")).toHaveLength(1);
  });

  it("still flags a forgotten one-off crop as late, then drops it", () => {
    const g = garden({ cells: [{ cellX: 0, cellY: 0, plantId: "radish", plantedDate: "2026-08-20" }] });
    const late = getHarvestReady([g], plantMap, new Date(2026, 9, 1), "2026-05-15");
    expect(late[0]?.late).toBe(true);
    expect(getHarvestReady([g], plantMap, new Date(2026, 10, 15), "2026-05-15")).toHaveLength(0);
  });
});

describe("plantable now by bed type", () => {
  it("suggests no shrubs or garlic for the greenhouse in October, but winter salads", () => {
    const ids = getPlantableNow(plants, "2026-05-15", { now: new Date(2026, 9, 20), frostProtectionWeeks: 4, environmentType: "greenhouse" }).map((r) => r.plantId);
    for (const shrub of ["raspberry", "blueberry", "currant", "gooseberry", "garlic"]) expect(ids).not.toContain(shrub);
    expect(ids).toContain("spinach");
  });

  it("keeps berry shrubs and garlic for an outdoor bed", () => {
    const ids = getPlantableNow(plants, "2026-05-15", { now: OCT_5, environmentType: "outdoor_bed" }).map((r) => r.plantId);
    expect(ids).toEqual(expect.arrayContaining(["garlic", "currant"]));
  });

  it("knows which crops suit which bed", () => {
    expect(suitsEnvironment(P("currant"), "greenhouse")).toBe(false);
    expect(suitsEnvironment(P("tomato"), "greenhouse")).toBe(true);
    expect(suitsEnvironment(P("pumpkin"), "container")).toBe(false);
    expect(suitsEnvironment(P("basil"), "windowsill")).toBe(true);
    expect(suitsEnvironment(P("cabbage"), "windowsill")).toBe(false);
  });

  it("auto-fill never puts perennials into a greenhouse", () => {
    const bed = garden({ environmentType: "greenhouse" }).beds[0];
    const cells = recommendBedPlanting(bed, plants, { gridCellSizeCm: 30, lastFrostDate: "2026-05-15" });
    expect(cells.every((c) => suitsEnvironment(P(c.plantId), "greenhouse"))).toBe(true);
  });
});

describe("sowing agenda (calendar, dashboard, palette share it)", () => {
  it("never says 'nothing' while the palette has plantable crops", () => {
    const agenda = getSowingAgenda(plants, "2026-05-15", { now: OCT_5, includeIndoor: true });
    const palette = getPlantableNow(plants, "2026-05-15", { now: OCT_5 });
    expect(agenda.now.length).toBeGreaterThan(0);
    for (const p of palette) expect(agenda.now.map((a) => a.plantId)).toContain(p.plantId);
  });

  it("lists windows that open within the horizon as soon, not now", () => {
    const agenda = getSowingAgenda(plants, "2026-05-15", { now: new Date(2026, 1, 1), includeIndoor: true });
    expect(agenda.soon.some((s) => s.action === "sow_indoors")).toBe(true);
    expect(agenda.soon.every((s) => s.from > new Date(2026, 1, 1))).toBe(true);
  });
});

describe("task groups (dashboard and task page)", () => {
  const task = (id: string, dueDate: string, extra: Partial<Task> = {}): Task => ({ id, gardenId: "g", type: "custom", title: id, dueDate, ...extra });
  const monday = new Date(2026, 9, 5);

  it("files a task one week ahead under the same rolling group everywhere", () => {
    expect(taskGroup(task("a", "2026-10-12"), monday)).toBe("next7");
    expect(taskGroup(task("b", "2026-10-13"), monday)).toBe("later");
    expect(taskGroup(task("c", "2026-10-03"), monday)).toBe("overdue");
    expect(taskGroup(task("d", "2026-10-06"), monday)).toBe("tomorrow");
  });

  it("orders groups and sorts by due date", () => {
    const groups = groupTasksByDue([task("x", "2026-10-09"), task("y", "2026-10-05"), task("z", "2026-10-07")], monday);
    expect(groups.map((g) => g.group)).toEqual(["today", "next7"]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["z", "x"]);
  });

  it("rolls recurring tasks forward, never into the past", () => {
    expect(nextDue(task("w", "2026-10-05", { recurring: { interval: "weekly" } }), monday)).toBe("2026-10-12");
    expect(nextDue(task("d", "2026-09-20", { recurring: { interval: "daily" } }), monday)).toBe("2026-10-06");
    expect(nextDue(task("u", "2026-10-05", { recurring: { interval: "weekly", until: "2026-10-10" } }), monday)).toBeNull();
  });
});

describe("autumn season: tasks, palette, garden agenda agree", () => {
  const OCT_9 = new Date(2026, 9, 9);
  const FROST = "2026-05-15";
  const ids = (items: { plantId: string }[]) => items.map((i) => i.plantId);
  const raised = { environmentType: "raised_bed" as const, frostProtectionWeeks: 1 };
  const glass = { environmentType: "greenhouse" as const, frostProtectionWeeks: 4 };

  it("offers winter spinach, lamb's lettuce, winter lettuce, garlic and onion sets for a raised bed in early October", () => {
    const palette = ids(getPlantableNow(plants, FROST, { now: OCT_9, ...raised }));
    expect(palette).toEqual(expect.arrayContaining(["spinach", "lambs_lettuce", "lettuce", "garlic", "onion"]));
    for (const shrub of ["currant", "raspberry"]) expect(palette).not.toContain(shrub);
  });

  it("keeps winter salads going under glass, but no garlic or onion sets there", () => {
    const palette = ids(getPlantableNow(plants, FROST, { now: new Date(2026, 9, 25), ...glass }));
    expect(palette).toEqual(expect.arrayContaining(["spinach", "lambs_lettuce", "lettuce", "winter_purslane"]));
    expect(palette).not.toContain("garlic");
    expect(palette).not.toContain("onion");
  });

  it("closes the open-ground autumn sowing in mid-October; frost protection extends it", () => {
    const late = new Date(2026, 9, 14);
    expect(ids(getPlantableNow(plants, FROST, { now: late, environmentType: "outdoor_bed" }))).not.toContain("spinach");
    expect(ids(getPlantableNow(plants, FROST, { now: late, ...raised }))).toContain("spinach");
    expect(ids(getPlantableNow(plants, FROST, { now: new Date(2026, 10, 10), ...glass }))).toContain("spinach");
    // Winter purslane: open ground until the end of September, under glass until the end of October.
    expect(ids(getPlantableNow(plants, FROST, { now: OCT_9, ...raised }))).not.toContain("winter_purslane");
    expect(ids(getPlantableNow(plants, FROST, { now: OCT_9, ...glass }))).toContain("winter_purslane");
  });

  it("garden agenda is exactly the union of the bed palettes, with the beds named", () => {
    const beds = [
      { id: "hb", name: "Hochbeet", ...raised },
      { id: "gh", name: "Gewächshaus", ...glass },
      { id: "kk", name: "Kübel", environmentType: "container" as const, frostProtectionWeeks: 0 },
    ];
    const agenda = getGardenSowingAgenda(plants, FROST, beds, { now: OCT_9 });
    for (const bed of beds) {
      for (const p of getPlantableNow(plants, FROST, { now: OCT_9, ...bed })) {
        const row = agenda.now.find((r) => r.plantId === p.plantId && r.action === p.action);
        expect(row, `${p.plantId} in ${bed.name}`).toBeDefined();
        expect(row!.beds!.map((b) => b.id)).toContain(bed.id);
      }
    }
    for (const row of agenda.now) {
      if (row.action === "sow_indoors") continue;
      for (const b of row.beds!) {
        const bed = beds.find((x) => x.id === b.id)!;
        expect(ids(getPlantableNow(plants, FROST, { now: OCT_9, ...bed }))).toContain(row.plantId);
      }
    }
    expect(agenda.now.find((r) => r.plantId === "spinach")!.beds!.map((b) => b.id)).toEqual(["hb", "gh", "kk"]);
    expect(agenda.now.find((r) => r.plantId === "garlic")!.beds!.map((b) => b.id)).toEqual(["hb", "kk"]);
  });

  it("garden agenda never promises a date that is wrong for a bed it names", () => {
    const beds = [
      { id: "hb", name: "Hochbeet", ...raised },
      { id: "gh", name: "Gewächshaus", ...glass },
      { id: "kk", name: "Kübel", environmentType: "container" as const, frostProtectionWeeks: 0 },
    ];
    const agenda = getGardenSowingAgenda(plants, FROST, beds, { now: OCT_9 });
    // Every row's date holds for every bed it names: the earliest close.
    for (const row of agenda.now) {
      for (const b of row.beds!) {
        const bed = beds.find((x) => x.id === b.id)!;
        const own = getPlantableNow(plants, FROST, { now: OCT_9, ...bed }).find((p) => p.plantId === row.plantId && p.action === row.action)!;
        expect(b.date, `${row.plantId} ${b.name}`).toEqual(own.until);
        expect(row.until <= own.until, `${row.plantId} ${b.name}`).toBe(true);
      }
    }
    // Lamb's lettuce: open beds until Oct 10/17, the greenhouse until Oct 31.
    const lambs = agenda.now.find((r) => r.plantId === "lambs_lettuce")!;
    expect(lambs.until).toEqual(new Date(2026, 9, 10));
    const [row] = agendaRowsByPlant("now", agenda.now.filter((r) => r.plantId === "lambs_lettuce"));
    // One group per date, earliest first: each bed is named with its own date.
    expect(groupAgendaBedsByDate(row).map((g) => [g.date.getDate(), g.beds.map((b) => b.id)])).toEqual([[10, ["kk"]], [17, ["hb"]], [31, ["gh"]]]);
  });

  it("one row per plant keeps each bed's latest close over its actions", () => {
    const beds = [
      { id: "hb", name: "Hochbeet", ...raised },
      { id: "gh", name: "Gewächshaus", ...glass },
      { id: "kk", name: "Kübel", environmentType: "container" as const, frostProtectionWeeks: 0 },
    ];
    const agenda = getGardenSowingAgenda(plants, FROST, beds, { now: OCT_9 });
    // Lettuce: planted out until Oct 22 (raised bed) / Oct 15 (container), sown and planted under glass until Oct 31.
    const [lettuce] = agendaRowsByPlant("now", agenda.now.filter((r) => r.plantId === "lettuce"));
    expect(lettuce.date).toEqual(new Date(2026, 9, 15));
    expect(Object.fromEntries(lettuce.beds.map((b) => [b.id, b.date!.getDate()]))).toEqual({ hb: 22, gh: 31, kk: 15 });
    expect(groupAgendaBedsByDate(lettuce).map((g) => [g.date.getDate(), g.beds.map((b) => b.id)])).toEqual([[15, ["kk"]], [22, ["hb"]], [31, ["gh"]]]);
  });

  it("groups beds by their own date, also for soon rows and indoor sowing", () => {
    const d = (day: number) => new Date(2026, 10, day);
    const groups = groupAgendaBedsByDate({
      date: d(1),
      beds: [{ id: "hb", name: "Hochbeet", date: d(8) }, { id: "gh", name: "Gewächshaus", date: d(1) }, { id: "kk", name: "Kübel", date: d(8) }],
    });
    expect(groups.map((g) => [g.date.getDate(), g.beds.map((b) => b.id)])).toEqual([[1, ["gh"]], [8, ["hb", "kk"]]]);
    // Indoor sowing: no beds, the row's own date.
    expect(groupAgendaBedsByDate({ date: d(3), beds: [] })).toEqual([{ date: d(3), beds: [] }]);
    // Soon rows open at the earliest opening.
    const soon = agendaRowsByPlant("soon", [
      { plantId: "x", action: "sow_outdoors", from: d(5), beds: [{ id: "a", name: "A", date: d(9) }, { id: "b", name: "B", date: d(5) }] },
    ]);
    expect(soon[0].date).toEqual(d(5));
  });

  it("a sowing task the bed is due for is offered by that bed's palette on its due date", () => {
    // "Wintersalat & Spinat säen · Hochbeet" due on Oct 10.
    const due = new Date(2026, 9, 10);
    expect(ids(getPlantableNow(plants, FROST, { now: due, ...raised }))).toEqual(expect.arrayContaining(["spinach", "lettuce"]));
  });

  it("generated planting tasks fall inside a window the bed's palette offers", () => {
    const frost = new Date(2026, 4, 15);
    const cases: Array<[string, typeof raised | typeof glass]> = [
      ["spinach", raised], ["lambs_lettuce", raised], ["garlic", raised], ["onion", raised], ["carrot", raised],
      ["tomato", glass], ["lettuce", glass], ["spinach", glass],
    ];
    for (const [id, bed] of cases) {
      const dates = getPlantingTaskDates(P(id), frost, bed);
      expect(dates.length, id).toBeGreaterThan(0);
      for (const d of dates) {
        if (d.type === "sow_indoors") continue; // not an in-bed action
        expect(ids(getPlantableNow(plants, FROST, { now: d.date, ...bed })), `${id} ${d.action} ${d.date.toDateString()}`).toContain(id);
      }
    }
    expect(getPlantingTaskDates(P("garlic"), frost, glass)).toHaveLength(0);
    expect(getPlantingTaskDates(P("spinach"), frost, raised).some((d) => d.action === "sow_autumn")).toBe(true);
  });
});
