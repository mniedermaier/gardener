import type { LucideIcon } from "lucide-react";
import {
  Sun, LayoutGrid, Sprout, CalendarDays, Apple, BookOpen, Archive, Bird,
  Bean, FlaskConical, Bug, Droplets, Scale, Wallet, Settings,
} from "lucide-react";

/**
 * Single source for the app's information architecture: the sidebar, the
 * mobile TopBar title, the section tabs and the command palette all read
 * from here, so a page can never be reachable in one place and missing in
 * another.
 *
 * 14 labelled entries. Related pages that used to be separate sidebar items
 * (companions, tasks, livestock sub-pages, food plan, weather) are now tabs
 * of their section (`SECTIONS`); their URLs stay unchanged.
 */

export interface NavEntry {
  /** Stable id, also used for the section tabs. */
  id: string;
  to: string;
  icon: LucideIcon;
  /** Short label for the sidebar ("Planer"). */
  labelKey: string;
}

export interface NavGroup {
  id: string;
  /** Overline heading; the first group has none. */
  labelKey?: string;
  items: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "today",
    items: [{ id: "today", to: "/", icon: Sun, labelKey: "shell.nav.today" }],
  },
  {
    id: "garden",
    labelKey: "shell.group.garden",
    items: [
      { id: "planner", to: "/planner", icon: LayoutGrid, labelKey: "shell.nav.planner" },
      { id: "plants", to: "/plants", icon: Sprout, labelKey: "shell.nav.plants" },
      { id: "calendar", to: "/calendar", icon: CalendarDays, labelKey: "shell.nav.calendar" },
      { id: "seeds", to: "/seeds", icon: Bean, labelKey: "shell.nav.seeds" },
    ],
  },
  {
    id: "record",
    labelKey: "shell.group.record",
    items: [
      { id: "harvest", to: "/harvest", icon: Apple, labelKey: "shell.nav.harvest" },
      { id: "pantry", to: "/pantry", icon: Archive, labelKey: "shell.nav.pantry" },
      { id: "livestock", to: "/livestock", icon: Bird, labelKey: "shell.nav.livestock" },
    ],
  },
  {
    id: "care",
    labelKey: "shell.group.care",
    items: [
      { id: "soil", to: "/soil", icon: FlaskConical, labelKey: "shell.nav.soil" },
      { id: "pests", to: "/pests", icon: Bug, labelKey: "shell.nav.pests" },
      { id: "water", to: "/water-log", icon: Droplets, labelKey: "shell.nav.water" },
      { id: "journal", to: "/journal", icon: BookOpen, labelKey: "shell.nav.journal" },
    ],
  },
  {
    id: "analysis",
    labelKey: "shell.group.analysis",
    items: [
      { id: "sufficiency", to: "/sufficiency", icon: Scale, labelKey: "shell.nav.sufficiency" },
      { id: "expenses", to: "/expenses", icon: Wallet, labelKey: "shell.nav.expenses" },
    ],
  },
];

export const SETTINGS_ENTRY: NavEntry = { id: "settings", to: "/settings", icon: Settings, labelKey: "shell.nav.settings" };

export interface SectionTab {
  to: string;
  labelKey: string;
}

/**
 * Pages that belong together and are switched with tabs above the content.
 * The first tab is the section's home (the sidebar entry).
 */
export const SECTIONS: Record<string, SectionTab[]> = {
  today: [
    { to: "/", labelKey: "shell.tabs.overview" },
    { to: "/weather", labelKey: "shell.tabs.weather" },
  ],
  plants: [
    { to: "/plants", labelKey: "shell.tabs.catalog" },
    { to: "/companions", labelKey: "shell.tabs.companions" },
  ],
  calendar: [
    { to: "/calendar", labelKey: "shell.tabs.season" },
    { to: "/tasks", labelKey: "shell.tabs.tasks" },
  ],
  livestock: [
    { to: "/livestock", labelKey: "shell.tabs.animals" },
    { to: "/livestock/production", labelKey: "shell.tabs.production" },
    { to: "/livestock/feed", labelKey: "shell.tabs.feed" },
    { to: "/livestock/health", labelKey: "shell.tabs.health" },
  ],
  sufficiency: [
    { to: "/sufficiency", labelKey: "shell.tabs.balance" },
    { to: "/foodplan", labelKey: "shell.tabs.foodplan" },
  ],
};

/** Which sidebar entry a path belongs to. */
export function sectionIdForPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/weather") return "today";
  if (p.startsWith("/planner")) return "planner";
  // A shared-garden link is not the planner: no sidebar entry is highlighted.
  if (p.startsWith("/import")) return null;
  if (p.startsWith("/plants") || p === "/companions") return "plants";
  if (p === "/calendar" || p === "/tasks") return "calendar";
  if (p.startsWith("/livestock")) return "livestock";
  if (p === "/sufficiency" || p === "/foodplan") return "sufficiency";
  if (p === "/settings") return "settings";
  for (const g of NAV_GROUPS) for (const item of g.items) if (item.to === p) return item.id;
  return null;
}

/** The active tab within a section; animal detail pages count as "Tiere". */
export function activeTabPath(sectionId: string, pathname: string): string | null {
  const tabs = SECTIONS[sectionId];
  if (!tabs) return null;
  const p = pathname.replace(/\/+$/, "") || "/";
  const exact = tabs.find((tab) => tab.to === p);
  if (exact) return exact.to;
  if (sectionId === "livestock") return "/livestock";
  return null;
}

export const ALL_NAV_ENTRIES: NavEntry[] = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ENTRY];

export function navEntry(id: string | null): NavEntry | undefined {
  return ALL_NAV_ENTRIES.find((e) => e.id === id);
}
