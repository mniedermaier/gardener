import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { QuickAdd } from "./QuickAdd";
import { SectionTabs } from "./SectionTabs";
import { CommandPalette } from "./CommandPalette";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Ctrl+K / ⌘K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSidebarOpen(false);
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A new page starts at the top (main is the scroll container, not window).
  useEffect(() => {
    if (pathname) mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    // h-dvh instead of h-screen: on mobile browsers the address bar shrinks
    // the visible viewport, and h-screen would leave the bottom nav off-screen.
    <div className="flex h-dvh overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} onSearchClick={() => setPaletteOpen(true)} />
        <SectionTabs />
        <main ref={mainRef} id="main" className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-safe-nav sm:pb-6 md:p-6 lg:px-8 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
      <QuickAdd hidden={sidebarOpen} />
      <BottomNav onMenuClick={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
