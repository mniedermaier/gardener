import { useTranslation } from "react-i18next";
import { Menu, Globe, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useStore } from "@/store";
import { useBackendSync } from "@/hooks/useBackendSync";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { i18n } = useTranslation();
  const { locale, setLocale, backendUrl } = useStore();
  const { connected, syncing } = useBackendSync();

  const toggleLocale = () => {
    const newLocale = locale === "de" ? "en" : "de";
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Menu size={24} />
      </button>
      <div className="flex-1" />
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
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Globe size={16} />
          {locale.toUpperCase()}
        </button>
      </div>
    </header>
  );
}
