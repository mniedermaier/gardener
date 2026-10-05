import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SECTIONS, activeTabPath, navEntry, sectionIdForPath } from "./navigation";

/**
 * Sub-navigation for sections that bundle several pages (Tiere: Übersicht /
 * Produktion / Futter / Gesundheit …). These are links, not ARIA tabs: each
 * one is its own route, so back/forward and deep links keep working.
 */
export const SectionTabs = memo(function SectionTabs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const sectionId = sectionIdForPath(pathname);
  const tabs = sectionId ? SECTIONS[sectionId] : undefined;
  if (!sectionId || !tabs) return null;
  const active = activeTabPath(sectionId, pathname);
  const entry = navEntry(sectionId);

  return (
    <nav
      aria-label={entry ? t("shell.sectionNav", { section: t(entry.labelKey) }) : undefined}
      className="shrink-0 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
    >
      <ul className="flex gap-1 overflow-x-auto px-2 md:px-4 [scrollbar-width:none]">
        {tabs.map((tab) => {
          const selected = tab.to === active;
          return (
            <li key={tab.to} className="shrink-0">
              <Link
                to={tab.to}
                aria-current={selected ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? "border-garden-600 text-garden-700 dark:border-garden-400 dark:text-garden-300"
                    : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-100"
                }`}
              >
                {t(tab.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
