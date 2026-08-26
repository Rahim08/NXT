"use client";

import { useState, createContext, useContext } from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { QuickAdd } from "./quick-add";
import { CommandPalette } from "./command-palette";
import { MobileSearchOverlay } from "./mobile-search";
import { MobileProfileMenu } from "./mobile-profile-menu";

// Shared context so child components can open search / profile
interface ShellContextValue {
  openSearch: () => void;
  openProfile: () => void;
}

const ShellContext = createContext<ShellContextValue>({
  openSearch: () => {},
  openProfile: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <ShellContext.Provider value={{ openSearch: () => setSearchOpen(true), openProfile: () => setProfileOpen(true) }}>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Main content area */}
        {/* Mobile: pb-[calc(49px+env(safe-area-inset-bottom))] for tab bar */}
        <main className="lg:ml-[var(--sidebar-width)] min-h-screen pb-[calc(49px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />

        {/* Quick Add — desktop inline + mobile FAB */}
        <div className="lg:fixed lg:bottom-8 lg:right-8 lg:w-80 lg:z-40 pointer-events-none">
          <QuickAdd />
        </div>

        {/* Command palette (desktop) */}
        <CommandPalette />

        {/* Mobile search overlay */}
        <MobileSearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Mobile profile menu */}
        <MobileProfileMenu isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    </ShellContext.Provider>
  );
}
