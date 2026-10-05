import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sun, ClipboardList, Apple, LayoutGrid, Menu } from "lucide-react";

interface Props {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const tabs = [
  { to: "/", icon: Sun, labelKey: "shell.nav.today", end: true },
  { to: "/tasks", icon: ClipboardList, labelKey: "shell.tabs.tasks" },
  { to: "/harvest", icon: Apple, labelKey: "shell.nav.harvest" },
  { to: "/planner", icon: LayoutGrid, labelKey: "shell.nav.planner" },
];

// Every tab is at least 44 px tall (Apple HIG / WCAG 2.5.8 minimum target size).
const tabClass = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors touch-manipulation";
const activeClass = "text-garden-700 dark:text-garden-300";
const idleClass = "text-gray-500 dark:text-gray-400";

export function BottomNav({ onMenuClick, sidebarOpen }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur sm:hidden dark:border-white/10 dark:bg-gray-900/95"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `${tabClass} ${isActive ? activeClass : idleClass}`}>
            {({ isActive }) => (
              <>
                <span className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? "bg-garden-50 dark:bg-garden-500/15" : ""}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          aria-expanded={sidebarOpen}
          className={`${tabClass} ${sidebarOpen ? activeClass : idleClass}`}
        >
          <span className={`inline-flex h-7 w-12 items-center justify-center rounded-full ${sidebarOpen ? "bg-garden-50 dark:bg-garden-500/15" : ""}`}>
            <Menu size={20} aria-hidden="true" />
          </span>
          <span>{t("nav.more")}</span>
        </button>
      </div>
    </nav>
  );
}
