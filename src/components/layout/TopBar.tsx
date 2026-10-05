import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Menu, Cloud, CloudOff, RefreshCw, Search, Sprout } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { useBackendSync } from "@/hooks/useBackendSync";
import { IconButton } from "@/components/ui/IconButton";
import { navEntry, sectionIdForPath } from "./navigation";

interface TopBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Mobile/tablet: section title (the page is otherwise anonymous on a phone)
 * plus a search button. Desktop: a search field that opens the command palette.
 */
export function TopBar({ onMenuClick, onSearchClick }: TopBarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { backendUrl } = useStore(useShallow((s) => ({ backendUrl: s.backendUrl })));
  const { connected, syncing } = useBackendSync();
  const entry = navEntry(sectionIdForPath(pathname));

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white pt-safe dark:border-white/10 dark:bg-gray-900">
      <div className="flex h-14 items-center gap-2 px-2 sm:h-16 sm:px-4 lg:px-6">
        {/* Tablet only: phones have the bottom nav, desktop the static sidebar. */}
        <span className="hidden sm:contents lg:hidden">
          <IconButton icon={Menu} label={t("nav.openMenu")} onClick={onMenuClick} />
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-2 pl-2 sm:pl-0 lg:hidden">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-garden-600 text-white sm:hidden" aria-hidden="true">
            <Sprout size={16} />
          </span>
          <span className="truncate text-base font-semibold text-gray-900 dark:text-gray-50">
            {entry ? t(entry.labelKey) : t("app.title")}
          </span>
        </div>

        <button
          type="button"
          onClick={onSearchClick}
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          className="hidden h-10 w-full max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-left text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-white lg:flex dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-white/20"
        >
          <Search size={16} aria-hidden="true" />
          <span className="flex-1 truncate">{t("shell.command.trigger")}</span>
          <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-sans text-xs text-gray-500 dark:border-white/15 dark:bg-transparent dark:text-gray-400">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {backendUrl && (
            <span
              className="inline-flex size-9 items-center justify-center"
              title={syncing ? t("shell.sync.syncing") : connected ? t("shell.sync.connected") : t("shell.sync.offline")}
              role="status"
              aria-label={syncing ? t("shell.sync.syncing") : connected ? t("shell.sync.connected") : t("shell.sync.offline")}
            >
              {syncing ? (
                <RefreshCw size={16} aria-hidden="true" className="animate-spin text-garden-600 dark:text-garden-300" />
              ) : connected ? (
                <Cloud size={16} aria-hidden="true" className="text-garden-600 dark:text-garden-300" />
              ) : (
                <CloudOff size={16} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
              )}
            </span>
          )}
          <span className="contents lg:hidden">
            <IconButton icon={Search} label={t("common.search")} onClick={onSearchClick} />
          </span>
        </div>
      </div>
    </header>
  );
}
