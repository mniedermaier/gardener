import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ClipboardList, Apple, LayoutGrid, Menu } from "lucide-react";

interface Props {
  onMenuClick: () => void;
}

const tabs = [
  { to: "/", icon: Home, labelKey: "nav.dashboard", end: true },
  { to: "/tasks", icon: ClipboardList, labelKey: "nav.tasks" },
  { to: "/harvest", icon: Apple, labelKey: "nav.harvest" },
  { to: "/planner", icon: LayoutGrid, labelKey: "nav.planner" },
];

export function BottomNav({ onMenuClick }: Props) {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white sm:hidden dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-around">
        {tabs.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-garden-600 dark:text-garden-400"
                  : "text-gray-400 dark:text-gray-500"
              }`
            }
          >
            <Icon size={20} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
        <button
          onClick={onMenuClick}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-gray-400 dark:text-gray-500"
        >
          <Menu size={20} />
          <span>{t("nav.more", { defaultValue: "More" })}</span>
        </button>
      </div>
    </nav>
  );
}
