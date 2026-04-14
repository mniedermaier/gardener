import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home, LayoutGrid, Sprout, Cloud, CalendarDays, ClipboardList, Settings, X,
  Apple, BookOpen, Scale, Wallet, Wheat, Beaker, Bug, UtensilsCrossed, ChevronRight, Bird,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
}

interface NavGroup {
  labelKey: string;
  icon: LucideIcon;
  color: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    labelKey: "nav.group.planning",
    icon: LayoutGrid,
    color: "text-garden-500",
    items: [
      { to: "/planner", icon: LayoutGrid, labelKey: "nav.planner" },
      { to: "/plants", icon: Sprout, labelKey: "nav.plants" },
      { to: "/calendar", icon: CalendarDays, labelKey: "nav.calendar" },
    ],
  },
  {
    labelKey: "nav.group.fieldwork",
    icon: ClipboardList,
    color: "text-amber-500",
    items: [
      { to: "/tasks", icon: ClipboardList, labelKey: "nav.tasks" },
      { to: "/seeds", icon: Wheat, labelKey: "nav.seeds" },
      { to: "/soil", icon: Beaker, labelKey: "nav.soil" },
      { to: "/pests", icon: Bug, labelKey: "nav.pests" },
      { to: "/livestock", icon: Bird, labelKey: "nav.livestock" },
    ],
  },
  {
    labelKey: "nav.group.records",
    icon: Apple,
    color: "text-rose-500",
    items: [
      { to: "/harvest", icon: Apple, labelKey: "nav.harvest" },
      { to: "/journal", icon: BookOpen, labelKey: "nav.journal" },
    ],
  },
  {
    labelKey: "nav.group.analysis",
    icon: Scale,
    color: "text-sky-500",
    items: [
      { to: "/foodplan", icon: UtensilsCrossed, labelKey: "nav.foodplan" },
      { to: "/sufficiency", icon: Scale, labelKey: "nav.sufficiency" },
      { to: "/expenses", icon: Wallet, labelKey: "nav.expenses" },
      { to: "/weather", icon: Cloud, labelKey: "nav.weather" },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavGroupSection({ group, onClose }: { group: NavGroup; onClose: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const isGroupActive = group.items.some((item) => location.pathname === item.to);
  const [expanded, setExpanded] = useState(isGroupActive);
  const GroupIcon = group.icon;

  return (
    <div className="rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
          isGroupActive && !expanded
            ? "bg-garden-50/50 dark:bg-garden-900/10"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
      >
        <GroupIcon size={16} className={group.color} />
        <span className={`flex-1 text-left text-xs font-semibold uppercase tracking-wider ${
          isGroupActive ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"
        }`}>
          {t(group.labelKey)}
        </span>
        <ChevronRight size={13} className={`text-gray-300 transition-transform dark:text-gray-600 ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2 dark:border-gray-800">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                }`
              }
            >
              <item.icon size={16} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      )}

      {/* Collapsed preview: show icons of items */}
      {!expanded && (
        <div className="ml-8 flex gap-1 pb-1">
          {group.items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                title={t(item.labelKey)}
                className={`rounded p-1 transition-colors ${
                  isActive
                    ? "bg-garden-100 text-garden-600 dark:bg-garden-900/40 dark:text-garden-400"
                    : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
                }`}
              >
                <item.icon size={14} />
              </NavLink>
            );
          })}
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
          {/* Dashboard */}
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`
            }
          >
            <Home size={18} />
            {t("nav.dashboard")}
          </NavLink>

          {/* Grouped sections */}
          <div className="space-y-1">
            {groups.map((group) => (
              <NavGroupSection key={group.labelKey} group={group} onClose={onClose} />
            ))}
          </div>

          {/* Settings at bottom */}
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`
              }
            >
              <Settings size={18} />
              {t("nav.settings")}
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs text-gray-400 dark:border-gray-700">
          {t("app.subtitle")}
        </div>
      </aside>
    </>
  );
}
