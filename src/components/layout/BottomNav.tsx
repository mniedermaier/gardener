import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ClipboardList, Apple, LayoutGrid, Menu } from "lucide-react";

interface Props {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

const tabs = [
  { to: "/", icon: Home, labelKey: "nav.dashboard", end: true },
  { to: "/tasks", icon: ClipboardList, labelKey: "nav.tasks" },
  // Short labels: five tabs share ~360 px, "Ernteprotokoll" would collide.
  { to: "/harvest", icon: Apple, labelKey: "nav.harvestShort" },
  { to: "/planner", icon: LayoutGrid, labelKey: "nav.plannerShort" },
];

// Every tab is at least 44 px tall (Apple HIG / WCAG 2.5.8 minimum target size).
const tabClass = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors touch-manipulation";

export function BottomNav({ onMenuClick, sidebarOpen }: Props) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.mobileNav")}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-safe sm:hidden dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${tabClass} ${isActive ? "text-garden-600 dark:text-garden-400" : "text-gray-400 dark:text-gray-500"}`
            }
          >
            <Icon size={22} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
        <button
          onClick={onMenuClick}
          aria-expanded={sidebarOpen}
          className={`${tabClass} ${sidebarOpen ? "text-garden-600 dark:text-garden-400" : "text-gray-400 dark:text-gray-500"}`}
        >
          <Menu size={22} />
          <span>{t("nav.more", { defaultValue: "More" })}</span>
        </button>
      </div>
    </nav>
  );
}
