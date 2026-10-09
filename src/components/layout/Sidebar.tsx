import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sprout, X } from "lucide-react";
import { NAV_GROUPS, SETTINGS_ENTRY, sectionIdForPath, type NavEntry } from "./navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const itemBase =
  "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:min-h-9";

function NavItem({ item, active, onNavigate }: { item: NavEntry; active: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${itemBase} ${
        active
          ? "bg-garden-50 text-garden-800 dark:bg-garden-500/15 dark:text-garden-200"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-50"
      }`}
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={active ? "text-garden-600 dark:text-garden-300" : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200"}
      />
      <span className="truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

/**
 * Flat, always-labelled navigation (14 entries in 4 groups). Sub-pages are
 * tabs of their section (see SectionTabs), so nothing hides behind an icon.
 * Desktop: static column. Below lg: a drawer above every other layer.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const activeId = sectionIdForPath(pathname);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Drawer: Esc closes it, and focus moves into it when it opens.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div aria-hidden="true" className="fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-[1px] lg:hidden" onClick={onClose} />
      )}
      <aside
        aria-label={t("shell.navigation")}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-white pt-safe transition-transform duration-200 dark:border-white/10 dark:bg-gray-900 lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:pt-0 ${
          open ? "translate-x-0 shadow-lg" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 lg:h-16">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-garden-600 text-white" aria-hidden="true">
              <Sprout size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">{t("app.title")}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("shell.closeNavigation")}
            className="inline-flex size-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 lg:hidden dark:text-gray-400 dark:hover:bg-white/10"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={t("shell.mainNavigation")} className="scroll-shadow-y flex-1 overflow-y-auto px-3 pb-2 lg:pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className={group.labelKey ? "mt-3 lg:mt-4" : "mt-1"}>
              {group.labelKey && (
                <h2 className="mb-1 px-3 text-overline font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  {t(group.labelKey)}
                </h2>
              )}
              <ul className="lg:space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItem item={item} active={activeId === item.id} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Settings as a labelled row at the foot on every size (phones too: an
            unlabelled gear beside the close button was easy to mistake). */}
        <div className="shrink-0 border-t border-gray-200 px-3 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:pt-3 lg:pb-3 dark:border-white/10">
          <NavItem item={SETTINGS_ENTRY} active={activeId === "settings"} onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
