import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Menu, Globe, Cloud, CloudOff, RefreshCw, Search, X } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useBackendSync } from "@/hooks/useBackendSync";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { locale, setLocale, backendUrl, journalEntries, tasks } = useStore(useShallow((s) => ({ locale: s.locale, setLocale: s.setLocale, backendUrl: s.backendUrl, journalEntries: s.journalEntries, tasks: s.tasks })));
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

  const locales = ["de", "en", "es", "fr"] as const;
  const toggleLocale = () => {
    const idx = locales.indexOf(locale as typeof locales[number]);
    const newLocale = locales[(idx + 1) % locales.length];
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Menu size={24} />
      </button>

      {/* Search */}
      <div className="relative mx-4 hidden flex-1 sm:block">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            aria-label={t("search.placeholder")}
            placeholder={`${t("search.placeholder")} (Ctrl+K)`}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:border-garden-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-garden-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:bg-gray-800"
          />
          {query && (
            <button onClick={() => { setQuery(""); setSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {searchOpen && results.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { navigate(r.path); setQuery(""); setSearchOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span>{r.icon}</span>
                <span className="flex-1 truncate">{r.label}</span>
                <span className="text-xs text-gray-400">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile search button */}
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 sm:hidden dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Search size={20} />
      </button>

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
        <button
          onClick={toggleLocale}
          aria-label="Toggle language"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Globe size={16} />
          {locale.toUpperCase()}
        </button>
      </div>
    </header>
  );
}
