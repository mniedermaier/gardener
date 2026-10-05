import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useScrollFade } from "@/components/ui/useScrollFade";
import { SECTIONS, activeTabPath, navEntry, sectionIdForPath } from "./navigation";

/**
 * Sub-navigation for sections that bundle several pages (Tiere: Übersicht /
 * Produktion / Futter / Gesundheit …). These are links, not ARIA tabs: each
 * one is its own route, so back/forward and deep links keep working.
 *
 * Two levels never look alike: section tabs are pills in the shell bar,
 * a page's own view switch (`ui/Tabs`) is an underlined row under the h1.
 * On phones the row scrolls horizontally, fades at the hidden edge and keeps
 * the active tab in view.
 */
export const SectionTabs = memo(function SectionTabs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const sectionId = sectionIdForPath(pathname);
  const tabs = sectionId ? SECTIONS[sectionId] : undefined;
  const active = sectionId ? activeTabPath(sectionId, pathname) : null;
  const { ref, fadeClass } = useScrollFade<HTMLUListElement>('[aria-current="page"]', active);
  if (!sectionId || !tabs) return null;
  const entry = navEntry(sectionId);

  return (
    <nav
      aria-label={entry ? t("shell.sectionNav", { section: t(entry.labelKey) }) : undefined}
      className="shrink-0 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900"
    >
      <ul ref={ref} className={`flex gap-1 overflow-x-auto px-2 [scrollbar-width:none] md:px-4 lg:px-6 ${fadeClass}`}>
        {tabs.map((tab) => {
          const selected = tab.to === active;
          return (
            <li key={tab.to} className="shrink-0">
              {/* 44 px touch target; the visible pill is smaller so this level reads as
                  "section switch", distinct from a page's own underlined <Tabs>. */}
              <Link
                to={tab.to}
                aria-current={selected ? "page" : undefined}
                className="group inline-flex min-h-11 items-center rounded-lg px-0.5 text-sm font-medium whitespace-nowrap focus-visible:outline-offset-[-2px]"
              >
                <span
                  className={`rounded-full px-3 py-1.5 transition-colors ${
                    selected
                      ? "bg-garden-50 text-garden-800 ring-1 ring-garden-600/20 ring-inset dark:bg-garden-400/15 dark:text-garden-200 dark:ring-garden-300/25"
                      : "text-gray-600 group-hover:bg-gray-100 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:bg-white/10 dark:group-hover:text-gray-50"
                  }`}
                >
                  {t(tab.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
