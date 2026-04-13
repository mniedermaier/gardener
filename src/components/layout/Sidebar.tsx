import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, LayoutGrid, Sprout, Cloud, CalendarDays, ClipboardList, Settings, X, Apple, BookOpen, Scale, Wallet, Wheat } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, labelKey: "nav.dashboard" },
  { to: "/planner", icon: LayoutGrid, labelKey: "nav.planner" },
  { to: "/plants", icon: Sprout, labelKey: "nav.plants" },
  { to: "/calendar", icon: CalendarDays, labelKey: "nav.calendar" },
  { to: "/tasks", icon: ClipboardList, labelKey: "nav.tasks" },
  { to: "/seeds", icon: Wheat, labelKey: "nav.seeds" },
  { to: "/harvest", icon: Apple, labelKey: "nav.harvest" },
  { to: "/journal", icon: BookOpen, labelKey: "nav.journal" },
  { to: "/sufficiency", icon: Scale, labelKey: "nav.sufficiency" },
  { to: "/expenses", icon: Wallet, labelKey: "nav.expenses" },
  { to: "/weather", icon: Cloud, labelKey: "nav.weather" },
  { to: "/settings", icon: Settings, labelKey: "nav.settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
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
          <button onClick={onClose} aria-label="Close sidebar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-garden-50 text-garden-700 dark:bg-garden-900/30 dark:text-garden-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`
              }
            >
              <Icon size={20} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4 text-xs text-gray-400 dark:border-gray-700">
          {t("app.subtitle")}
        </div>
      </aside>
    </>
  );
}
