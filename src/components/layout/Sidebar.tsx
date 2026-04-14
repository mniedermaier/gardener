import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home, LayoutGrid, Sprout, Cloud, CalendarDays, ClipboardList, Settings, X,
  Apple, BookOpen, Scale, Wallet, Wheat, Beaker, Bug, UtensilsCrossed, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const standalone: NavItem[] = [
  { to: "/", icon: Home, labelKey: "nav.dashboard" },
];

const groups: NavGroup[] = [
  {
    labelKey: "nav.group.planning",
    items: [
      { to: "/planner", icon: LayoutGrid, labelKey: "nav.planner" },
      { to: "/plants", icon: Sprout, labelKey: "nav.plants" },
      { to: "/calendar", icon: CalendarDays, labelKey: "nav.calendar" },
    ],
  },
  {
    labelKey: "nav.group.fieldwork",
    items: [
      { to: "/tasks", icon: ClipboardList, labelKey: "nav.tasks" },
      { to: "/seeds", icon: Wheat, labelKey: "nav.seeds" },
      { to: "/soil", icon: Beaker, labelKey: "nav.soil" },
      { to: "/pests", icon: Bug, labelKey: "nav.pests" },
    ],
  },
  {
    labelKey: "nav.group.records",
    items: [
      { to: "/harvest", icon: Apple, labelKey: "nav.harvest" },
      { to: "/journal", icon: BookOpen, labelKey: "nav.journal" },
    ],
  },
  {
    labelKey: "nav.group.analysis",
    items: [
      { to: "/foodplan", icon: UtensilsCrossed, labelKey: "nav.foodplan" },
      { to: "/sufficiency", icon: Scale, labelKey: "nav.sufficiency" },
      { to: "/expenses", icon: Wallet, labelKey: "nav.expenses" },
    ],
  },
];

const bottomItems: NavItem[] = [
  { to: "/weather", icon: Cloud, labelKey: "nav.weather" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavItemLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        }`
      }
    >
      <item.icon size={18} />
      {t(item.labelKey)}
    </NavLink>
  );
}

function NavGroupSection({ group, onClose }: { group: NavGroup; onClose: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const isGroupActive = group.items.some((item) => location.pathname === item.to);
  const [expanded, setExpanded] = useState(isGroupActive);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {t(group.labelKey)}
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <NavItemLink key={item.to} item={item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-700 dark:bg-gray-900 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sprout className="h-7 w-7 text-garden-600" />
            <span className="text-xl font-bold text-garden-800 dark:text-garden-400">
              {t("app.title")}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close sidebar" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
          {/* Dashboard - always visible */}
          {standalone.map((item) => (
            <NavItemLink key={item.to} item={item} onClose={onClose} />
          ))}

          {/* Grouped sections */}
          <div className="mt-3 space-y-2">
            {groups.map((group) => (
              <NavGroupSection key={group.labelKey} group={group} onClose={onClose} />
            ))}
          </div>

          {/* Bottom items */}
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            {bottomItems.map((item) => (
              <NavItemLink key={item.to} item={item} onClose={onClose} />
            ))}
          </div>
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs text-gray-400 dark:border-gray-700">
          {t("app.subtitle")}
        </div>
      </aside>
    </>
  );
}
