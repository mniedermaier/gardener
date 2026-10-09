import type { Plant } from "@/types/plant";
import type { EnvironmentType } from "@/types/garden";
import { addDays, addWeeks } from "date-fns";
import { seasonFrost, suitsEnvironment } from "@/lib/season";

// --- "Jetzt säen & pflanzen": one source for palette, dashboard and calendar ---

export type PlantableAction = "sow_indoors" | "sow_outdoors" | "transplant" | "plant_autumn" | "sow_autumn";

/** A bed an agenda row applies to (garden-level agenda). */
export interface AgendaBed {
  id: string;
  name: string;
  /**
   * Garden-level agenda: this bed's own date — last day of its window ("now")
   * or first day ("soon"). Beds under glass close later than open beds.
   */
  date?: Date;
}

export interface PlantableNow {
  plantId: string;
  action: PlantableAction;
  /**
   * Last day of the window (local date). Garden-level agenda: the earliest
   * close among its beds — a date that holds for every bed listed; the beds
   * that stay open longer carry their own `date`.
   */
  until: Date;
  /** Garden-level agenda: the beds where the window is open now (empty: no bed needed, e.g. sowing indoors). */
  beds?: AgendaBed[];
}

export interface PlantableSoon {
  plantId: string;
  action: PlantableAction;
  /** First day of the window (local date). Garden-level agenda: the earliest opening among its beds (each bed carries its own `date`). */
  from: Date;
  beds?: AgendaBed[];
}

type MonthDay = readonly [month: number, day: number];

interface AutumnWindow {
  action: PlantableAction;
  from: MonthDay;
  /** Last day in the open ground. Beds with a little frost protection (raised bed: 1 week) add it here. */
  to: MonthDay;
  /** Last day under glass/fleece (frost protection ≥ 3 weeks: greenhouse, polytunnel, cold frame). */
  protectedTo?: MonthDay;
  /** Overwinters in the open ground; under glass it would block the house until summer. */
  openOnly?: boolean;
}

/**
 * Autumn windows the frost-relative data cannot express — Central European
 * dates (last spring frost around mid-May), as given in the usual German
 * sowing calendars (e.g. Mein schöner Garten, Bayerische Gartenakademie):
 * - Winter spinach: sow mid-August to early October for a spring cut; under glass into November.
 * - Lamb's lettuce (Feldsalat): sow mid-July to early October; under glass until the end of October.
 * - Winter purslane (Winterportulak): sow August and September; under glass until the end of October.
 * - Winter lettuce: sow August to mid-September, plant out mid-September to mid-October; under glass until the end of October.
 * - Garlic cloves and winter onion sets: September to mid-November / mid-October, open ground only.
 * - Bare-root berry shrubs: October and November.
 */
const AUTUMN_WINDOWS: Record<string, AutumnWindow[]> = {
  garlic: [{ action: "plant_autumn", from: [9, 1], to: [11, 15], openOnly: true }],
  onion: [{ action: "plant_autumn", from: [9, 1], to: [10, 15], openOnly: true }],
  currant: [{ action: "plant_autumn", from: [10, 1], to: [11, 30], openOnly: true }],
  gooseberry: [{ action: "plant_autumn", from: [10, 1], to: [11, 30], openOnly: true }],
  raspberry: [{ action: "plant_autumn", from: [10, 1], to: [11, 30], openOnly: true }],
  blueberry: [{ action: "plant_autumn", from: [10, 1], to: [11, 30], openOnly: true }],
  strawberry: [{ action: "plant_autumn", from: [8, 1], to: [9, 30] }],
  spinach: [{ action: "sow_autumn", from: [8, 15], to: [10, 10], protectedTo: [11, 15] }],
  lambs_lettuce: [{ action: "sow_autumn", from: [7, 15], to: [10, 10], protectedTo: [10, 31] }],
  winter_purslane: [{ action: "sow_autumn", from: [8, 1], to: [9, 30], protectedTo: [10, 31] }],
  arugula: [{ action: "sow_autumn", from: [8, 1], to: [9, 30], protectedTo: [10, 31] }],
  radish: [{ action: "sow_autumn", from: [8, 1], to: [9, 30], protectedTo: [10, 31] }],
  lettuce: [
    { action: "sow_autumn", from: [8, 1], to: [9, 15], protectedTo: [10, 31] },
    { action: "plant_autumn", from: [9, 15], to: [10, 15], protectedTo: [10, 31] },
  ],
  pak_choi: [{ action: "sow_autumn", from: [8, 1], to: [8, 31], protectedTo: [10, 31] }],
  endive: [{ action: "sow_autumn", from: [7, 1], to: [7, 31], protectedTo: [9, 30] }],
};

/** Covered structures where open-ground-only autumn windows do not apply. */
const COVERED: EnvironmentType[] = ["greenhouse", "polytunnel", "cold_frame", "windowsill"];

export interface SowingOptions {
  now?: Date;
  /** Greenhouse, cold frame …: spring dates earlier, autumn sowing longer. */
  frostProtectionWeeks?: number;
  /** Only crops that belong in this bed type (no shrubs in the greenhouse). */
  environmentType?: EnvironmentType;
  /** Include sowing indoors (not an in-bed action; the dashboard shows it, the palette does not). */
  includeIndoor?: boolean;
  /** How far "soon" reaches (weeks, default 4). */
  horizonWeeks?: number;
}

interface Window { action: PlantableAction; start: Date; end: Date }

const md = (year: number, [m, d]: MonthDay) => new Date(year, m - 1, d);

/** The autumn windows of a crop in one year for one bed (protection in weeks, bed type if known). */
function autumnWindows(plantId: string, year: number, protection: number, env?: EnvironmentType): Window[] {
  const result: Window[] = [];
  for (const w of AUTUMN_WINDOWS[plantId] ?? []) {
    if (w.openOnly && env && COVERED.includes(env)) continue;
    const end = w.openOnly ? md(year, w.to)
      : protection >= 3 && w.protectedTo ? md(year, w.protectedTo)
      : addWeeks(md(year, w.to), protection);
    result.push({ action: w.action, start: md(year, w.from), end });
  }
  return result;
}

/**
 * Autumn sowing/planting windows as season phases (autumn sowing = direct
 * sowing, autumn planting = planting out), so the season chart can draw them
 * next to the spring windows of the same phase.
 */
export function autumnPhaseWindows(
  plantId: string,
  year: number,
  protection: number,
  env?: EnvironmentType,
  plant?: Pick<Plant, "harvestDaysMin" | "harvestDaysMax">,
): Array<{ phase: "sowOutdoors" | "transplant" | "harvest"; start: Date; end: Date }> {
  const windows = autumnWindows(plantId, year, protection, env);
  const out: Array<{ phase: "sowOutdoors" | "transplant" | "harvest"; start: Date; end: Date }> = windows.map((w) => ({
    phase: w.action === "sow_autumn" ? "sowOutdoors" : "transplant",
    start: w.start,
    end: w.end,
  }));
  // The autumn sowing has its own harvest: days to maturity counted from that
  // window (wrapping into next year), so lamb's lettuce sown in September is
  // harvested in autumn/winter, not in the spring window's May–July.
  if (plant && windows.length > 0 && plant.harvestDaysMax < 200) {
    const first = Math.min(...windows.map((w) => w.start.getTime()));
    const last = Math.max(...windows.map((w) => w.end.getTime()));
    out.push({ phase: "harvest", start: addDays(new Date(first), plant.harvestDaysMin), end: addDays(new Date(last), plant.harvestDaysMax) });
  }
  return out;
}

function windowsFor(plant: Plant, frost: Date, year: number, protection: number, includeIndoor: boolean, env?: EnvironmentType): Window[] {
  const result: Window[] = [];
  // Frost-relative: [date − 1 week, date + 3 weeks].
  const rel = (action: PlantableAction, weeks: number | null) => {
    if (weeks === null) return;
    const date = addWeeks(frost, weeks - protection);
    result.push({ action, start: addDays(date, -7), end: addDays(date, 21) });
  };
  if (includeIndoor) rel("sow_indoors", plant.sowIndoorsWeeks);
  rel("sow_outdoors", plant.sowOutdoorsWeeks);
  rel("transplant", plant.transplantWeeks);
  result.push(...autumnWindows(plant.id, year, protection, env));
  return result;
}

/**
 * What can be sown or planted now, and what opens within the next weeks.
 * Frost-relative windows plus the autumn windows above; filtered by the bed
 * type. Sorted: now by closing date, soon by opening date.
 */
export function getSowingAgenda(plants: Plant[], lastFrostDate: string, opts: SowingOptions = {}): { now: PlantableNow[]; soon: PlantableSoon[] } {
  const now = opts.now ?? new Date();
  const protection = opts.frostProtectionWeeks ?? 0;
  const frost = seasonFrost(lastFrostDate, now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = addWeeks(today, opts.horizonWeeks ?? 4);
  const current: PlantableNow[] = [];
  const soon: PlantableSoon[] = [];

  for (const plant of plants) {
    if (opts.environmentType && !suitsEnvironment(plant, opts.environmentType)) continue;
    const windows = windowsFor(plant, frost, now.getFullYear(), protection, !!opts.includeIndoor, opts.environmentType);
    let best: PlantableNow | null = null;
    let next: PlantableSoon | null = null;
    for (const w of windows) {
      if (today >= w.start && today <= w.end) {
        if (!best || w.end > best.until) best = { plantId: plant.id, action: w.action, until: w.end };
      } else if (w.start > today && w.start <= horizon) {
        if (!next || w.start < next.from) next = { plantId: plant.id, action: w.action, from: w.start };
      }
    }
    if (best) current.push(best);
    else if (next) soon.push(next);
  }
  current.sort((a, b) => a.until.getTime() - b.until.getTime());
  soon.sort((a, b) => a.from.getTime() - b.from.getTime());
  return { now: current, soon };
}

/**
 * Plants that can go into a bed right now (no indoor sowing). Used by the
 * planner palette; the calendar and the dashboard read the same agenda.
 */
export function getPlantableNow(plants: Plant[], lastFrostDate: string, opts: Omit<SowingOptions, "includeIndoor" | "horizonWeeks"> = {}): PlantableNow[] {
  return getSowingAgenda(plants, lastFrostDate, { ...opts, includeIndoor: false }).now;
}

/** A bed as the garden-level agenda sees it. */
export interface AgendaBedContext extends AgendaBed {
  environmentType: EnvironmentType;
  frostProtectionWeeks: number;
}

/**
 * The garden-level agenda ("Jetzt säen & pflanzen" on Heute and in the
 * calendar): the union of every bed's palette (`getPlantableNow` with that
 * bed's type and frost protection), each row naming its beds, plus sowing
 * indoors, which needs no bed. So a crop is suggested for the garden exactly
 * when some bed's palette offers it. Without beds: the outdoor agenda.
 */
export function getGardenSowingAgenda(
  plants: Plant[],
  lastFrostDate: string,
  beds: AgendaBedContext[],
  opts: Pick<SowingOptions, "now" | "horizonWeeks"> = {},
): { now: PlantableNow[]; soon: PlantableSoon[] } {
  if (beds.length === 0) return getSowingAgenda(plants, lastFrostDate, { ...opts, includeIndoor: true });
  const now = new Map<string, PlantableNow>();
  const soon = new Map<string, PlantableSoon>();
  for (const bed of beds) {
    const agenda = getSowingAgenda(plants, lastFrostDate, { ...opts, frostProtectionWeeks: bed.frostProtectionWeeks, environmentType: bed.environmentType });
    for (const item of agenda.now) {
      const key = `${item.plantId}|${item.action}`;
      const ref = { id: bed.id, name: bed.name, date: item.until };
      const hit = now.get(key);
      if (!hit) now.set(key, { ...item, beds: [ref] });
      else {
        hit.beds!.push(ref);
        // The row's date must hold for every bed it names: the earliest close.
        if (item.until < hit.until) hit.until = item.until;
      }
    }
    for (const item of agenda.soon) {
      const key = `${item.plantId}|${item.action}`;
      const ref = { id: bed.id, name: bed.name, date: item.from };
      const hit = soon.get(key);
      if (!hit) soon.set(key, { ...item, beds: [ref] });
      else {
        hit.beds!.push(ref);
        if (item.from < hit.from) hit.from = item.from;
      }
    }
  }
  // Sowing indoors needs no bed: the open-ground dates, once for the garden.
  const indoor = getSowingAgenda(plants, lastFrostDate, { ...opts, includeIndoor: true });
  for (const item of indoor.now) if (item.action === "sow_indoors") now.set(`${item.plantId}|sow_indoors`, { ...item, beds: [] });
  for (const item of indoor.soon) if (item.action === "sow_indoors") soon.set(`${item.plantId}|sow_indoors`, { ...item, beds: [] });
  // Plantable now somewhere: not also "soon".
  const nowIds = new Set([...now.values()].map((i) => i.plantId));
  return {
    now: [...now.values()].sort((a, b) => a.until.getTime() - b.until.getTime()),
    soon: [...soon.values()].filter((i) => !nowIds.has(i.plantId)).sort((a, b) => a.from.getTime() - b.from.getTime()),
  };
}

/** One row per plant as the agenda lists show it: a crop can be due for different actions in different beds (lettuce: sow under glass, plant out in the raised bed). */
export interface AgendaPlantRow {
  kind: "now" | "soon";
  plantId: string;
  actions: PlantableAction[];
  /** Now: the earliest close among the beds; soon: the earliest opening. Without beds: the row's own date. */
  date: Date;
  /** Each bed with its own date (now: the latest close over the actions; soon: the earliest opening). */
  beds: AgendaBed[];
}

const time = (d: Date) => d.getTime();

/** Merges the garden agenda per plant (see `AgendaPlantRow`), sorted by date. */
export function agendaRowsByPlant(kind: AgendaPlantRow["kind"], rows: Array<PlantableNow | PlantableSoon>): AgendaPlantRow[] {
  const byPlant = new Map<string, AgendaPlantRow>();
  const later = (a: Date, b: Date) => (kind === "now" ? a > b : a < b);
  for (const row of rows) {
    const rowDate = kind === "now" ? (row as PlantableNow).until : (row as PlantableSoon).from;
    let hit = byPlant.get(row.plantId);
    if (!hit) {
      hit = { kind, plantId: row.plantId, actions: [], date: rowDate, beds: [] };
      byPlant.set(row.plantId, hit);
    } else if (later(rowDate, hit.date)) hit.date = rowDate; // only used without beds
    if (!hit.actions.includes(row.action)) hit.actions.push(row.action);
    for (const b of row.beds ?? []) {
      const date = b.date ?? rowDate;
      const known = hit.beds.find((x) => x.id === b.id);
      if (!known) hit.beds.push({ ...b, date });
      else if (later(date, known.date!)) known.date = date;
    }
  }
  for (const row of byPlant.values()) {
    if (row.beds.length > 0) row.date = new Date(Math.min(...row.beds.map((b) => time(b.date!))));
  }
  return [...byPlant.values()].sort((a, b) => time(a.date) - time(b.date));
}

/**
 * The beds of an agenda row grouped by their own date, earliest first, so the
 * meta line never promises a date that is wrong for a bed it names:
 * "Kartoffelacker, Kräuterkübel bis 10. Okt. · Hochbeet Süd bis 17. Okt. · Gewächshaus bis 31. Okt."
 * (soon: "ab …"). Without beds (sowing indoors) or with one date for all: one group.
 */
export function groupAgendaBedsByDate(row: Pick<AgendaPlantRow, "date" | "beds">): Array<{ date: Date; beds: AgendaBed[] }> {
  const groups = new Map<number, AgendaBed[]>();
  for (const b of row.beds) {
    const key = time(b.date ?? row.date);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  if (groups.size === 0) return [{ date: row.date, beds: [] }];
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([t, beds]) => ({ date: new Date(t), beds }));
}

/** Crops on an agenda list: one per plant, as the rows show them (lettuce sown under glass and planted out counts once). */
export function agendaPlantCount(items: Array<{ plantId: string }>): number {
  return new Set(items.map((i) => i.plantId)).size;
}

/** Task type of an agenda action (autumn sowing is a direct sowing, autumn planting a planting out). */
const ACTION_TASK: Record<PlantableAction, "sow_indoors" | "sow_outdoors" | "transplant"> = {
  sow_indoors: "sow_indoors", sow_outdoors: "sow_outdoors", transplant: "transplant", sow_autumn: "sow_outdoors", plant_autumn: "transplant",
};

/**
 * Due dates of the planting tasks for a crop in a bed ("Aufgaben aus Plan
 * erzeugen"): the same windows as the palette — frost-relative spring dates
 * shifted by the bed's protection, plus the autumn windows for this bed type
 * (due on the day the window opens). Every date lies inside a window in
 * which the bed's palette offers the crop.
 */
export function getPlantingTaskDates(
  plant: Plant,
  lastFrostDate: Date,
  bed: { environmentType: EnvironmentType; frostProtectionWeeks: number },
): Array<{ type: "sow_indoors" | "sow_outdoors" | "transplant"; action: PlantableAction; date: Date }> {
  const protection = bed.frostProtectionWeeks;
  const out: Array<{ type: "sow_indoors" | "sow_outdoors" | "transplant"; action: PlantableAction; date: Date }> = [];
  const rel = (action: PlantableAction, weeks: number | null) => {
    if (weeks !== null) out.push({ type: ACTION_TASK[action], action, date: addWeeks(lastFrostDate, weeks - protection) });
  };
  rel("sow_indoors", plant.sowIndoorsWeeks);
  rel("sow_outdoors", plant.sowOutdoorsWeeks);
  rel("transplant", plant.transplantWeeks);
  if (suitsEnvironment(plant, bed.environmentType)) {
    for (const w of autumnWindows(plant.id, lastFrostDate.getFullYear(), protection, bed.environmentType)) out.push({ type: ACTION_TASK[w.action], action: w.action, date: w.start });
  }
  return out;
}
