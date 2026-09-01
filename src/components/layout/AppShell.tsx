import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { QuickAdd } from "./QuickAdd";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // h-dvh instead of h-screen: on mobile browsers the address bar shrinks
    // the visible viewport, and h-screen would leave the bottom nav off-screen.
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-safe-nav sm:pb-4 dark:bg-gray-950 md:p-6">
          <Outlet />
        </main>
      </div>
      <QuickAdd />
      <BottomNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
    </div>
  );
}
