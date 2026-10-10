import type { Plant, PlantCategory } from "@/types/plant";

/** How a custom plant starts: sown straight into the bed, or raised indoors and planted out. */
export type SowMode = "direct" | "indoors";

export interface SowingDraft {
  mode: SowMode;
  /** Direct: weeks relative to the last frost (negative = before). */
  sowWeeks: number;
  /** Indoors: weeks relative to the last frost to start (negative, e.g. -6). */
  indoorsWeeks: number;
  /** Indoors: weeks relative to the last frost to plant out. */
  transplantWeeks: number;
}

export const DEFAULT_SOWING: SowingDraft = { mode: "direct", sowWeeks: 0, indoorsWeeks: -6, transplantWeeks: 2 };

/** The timing fields the calendar, advisor and succession planner read. */
export function sowingFields(s: SowingDraft): Pick<Plant, "sowIndoorsWeeks" | "sowOutdoorsWeeks" | "transplantWeeks"> {
  return s.mode === "direct"
    ? { sowIndoorsWeeks: null, sowOutdoorsWeeks: s.sowWeeks, transplantWeeks: null }
    : { sowIndoorsWeeks: s.indoorsWeeks, sowOutdoorsWeeks: null, transplantWeeks: s.transplantWeeks };
}

/** Back from a stored plant to the form (older custom plants without timing read as direct at the frost date). */
export function sowingDraftOf(p: Pick<Plant, "sowIndoorsWeeks" | "sowOutdoorsWeeks" | "transplantWeeks">): SowingDraft {
  if (p.sowIndoorsWeeks !== null && p.sowIndoorsWeeks !== undefined) {
    return { ...DEFAULT_SOWING, mode: "indoors", indoorsWeeks: p.sowIndoorsWeeks, transplantWeeks: p.transplantWeeks ?? 0 };
  }
  return { ...DEFAULT_SOWING, mode: "direct", sowWeeks: p.sowOutdoorsWeeks ?? 0 };
}

/** Symbol a new custom plant starts with, by category, until the user picks one. */
/** Shown until the user picks a symbol: a sprout says "a plant", not "a carrot". */
export const NEUTRAL_ICON = "🌱";

export const CATEGORY_ICON: Record<PlantCategory, string> = {
  vegetable: "carrot",
  fruit: "strawberry",
  berry: "raspberry",
  herb: "basil",
  flower: "sunflower",
};
