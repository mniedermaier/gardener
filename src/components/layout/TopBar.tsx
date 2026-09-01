import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Cloud, CloudOff, RefreshCw, Search, X } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useBackendSync } from "@/hooks/useBackendSync";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { backendUrl, journalEntries, tasks } = useStore(useShallow((s) => ({ backendUrl: s.backendUrl, journalEntries: s.journalEntries, tasks: s.tasks })));
  const { connected, syncing } = useBackendSync();
  const plants = usePlants();
  const getPlantName = usePlantName();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Leaving the page (bottom nav, back button) closes the mobile search panel.
  // Derived-state reset during render, as React recommends, instead of an effect.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setSearchOpen(false);
    setQuery("");
  }

  // Debounce search query by 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    const items: Array<{ type: string; label: string; icon: string; path: string }> = [];

    // Search plants
    for (const p of plants) {
      const name = getPlantName(p.id);
      if (name.toLowerCase().includes(q)) {
        items.push({ type: t("nav.plants"), label: name, icon: p.icon, path: "/plants" });
      }
      if (items.length >= 8) break;
    }

    // Search journal
    for (const j of journalEntries) {
      if (j.title.toLowerCase().includes(q) || j.text.toLowerCase().includes(q)) {
        items.push({ type: t("nav.journal"), label: j.title, icon: "\ud83d\udcd6", path: "/journal" });
      }
      if (items.length >= 10) break;
    }

    // Search tasks
    for (const task of tasks) {
      if (task.title.toLowerCase().includes(q)) {
        items.push({ type: t("nav.calendar"), label: task.title, icon: "\ud83d\udcc5", path: "/calendar" });
      }
      if (items.length >= 12) break;
    }

    return items.slice(0, 8);
  }, [debouncedQuery, plants, journalEntries, tasks, getPlantName, t]);

  const closeSearch = () => { setQuery(""); setSearchOpen(false); };

  const resultList = results.length > 0 && (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {results.map((r, i) => (
        <li key={i}>
          <button
            onClick={() => { navigate(r.path); closeSearch(); }}
            className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span>{r.icon}</span>
            <span className="flex-1 truncate">{r.label}</span>
            <span className="text-xs text-gray-400">{r.type}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="relative flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 pt-safe dark:border-gray-700 dark:bg-gray-900">
      <button
        onClick={onMenuClick}
        aria-label={t("nav.openMenu")}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Menu size={24} />
      </button>

      {/* Desktop search */}
      <div className="relative mx-4 hidden flex-1 sm:block">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            aria-label={t("search.placeholder")}
            placeholder={`${t("search.placeholder")} (Ctrl+K)`}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:border-garden-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:bg-gray-800"
          />
          {query && (
            <button aria-label={t("common.close")} onClick={closeSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {searchOpen && results.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {resultList}
          </div>
        )}
      </div>

      {/* Mobile search toggle */}
      <button
        aria-label={searchOpen ? t("common.close") : t("common.search")}
        aria-expanded={searchOpen}
        onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
        className="rounded-lg p-2.5 text-gray-600 hover:bg-gray-100 sm:hidden dark:text-gray-400 dark:hover:bg-gray-800"
      >
        {searchOpen ? <X size={22} /> : <Search size={22} />}
      </button>

      {/* Mobile search panel: drops down below the header, full width */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-gray-200 bg-white shadow-lg sm:hidden dark:border-gray-700 dark:bg-gray-900">
          <div className="relative p-3">
            <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("search.placeholder")}
              placeholder={t("search.placeholder")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-base focus:border-garden-500 focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          {resultList}
          {debouncedQuery.length >= 2 && results.length === 0 && (
            <p className="px-4 pb-3 text-sm text-gray-500">{t("search.noResults")}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {backendUrl && (
          <span className="flex items-center gap-1 text-xs text-gray-400" title={connected ? "Backend connected" : "Backend offline"}>
            {syncing ? (
              <RefreshCw size={14} className="animate-spin text-garden-500" />
            ) : connected ? (
              <Cloud size={14} className="text-garden-500" />
            ) : (
              <CloudOff size={14} className="text-gray-400" />
            )}
          </span>
        )}
      </div>
    </header>
  );
}
