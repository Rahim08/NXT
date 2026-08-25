"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTheme } from "@/lib/theme-provider";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  category: "navigation" | "action";
}

export function CommandPalette() {
  const { t } = useI18n();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigationCommands: CommandItem[] = [
    { id: "nav-home", label: t.nav.home, action: () => { router.push("/"); close(); }, category: "navigation" },
    { id: "nav-today", label: t.nav.today, action: () => { router.push("/today"); close(); }, category: "navigation" },
    { id: "nav-inbox", label: t.nav.inbox, action: () => { router.push("/inbox"); close(); }, category: "navigation" },
    { id: "nav-projects", label: t.nav.projects, action: () => { router.push("/projects"); close(); }, category: "navigation" },
    { id: "nav-import", label: t.nav.import, action: () => { router.push("/import"); close(); }, category: "navigation" },
    { id: "nav-search", label: t.nav.search, action: () => { router.push("/search"); close(); }, category: "navigation" },
    { id: "nav-settings", label: t.nav.settings, action: () => { router.push("/settings"); close(); }, category: "navigation" },
  ];

  const actionCommands: CommandItem[] = [
    { id: "action-create-task", label: t.common.addTask, description: "Quick create a new task", action: () => { router.push("/inbox"); close(); }, category: "action" },
    { id: "action-create-project", label: t.projects.newProject, description: "Create a new project", action: () => { router.push("/projects"); close(); }, category: "action" },
    { id: "action-import", label: t.import.importProject, description: "Import a project file", action: () => { router.push("/import"); close(); }, category: "action" },
    { id: "action-theme-light", label: `${t.settings.appearance}: ${t.settings.light}`, action: () => { setTheme("light"); close(); }, category: "action" },
    { id: "action-theme-dark", label: `${t.settings.appearance}: ${t.settings.dark}`, action: () => { setTheme("dark"); close(); }, category: "action" },
    { id: "action-theme-system", label: `${t.settings.appearance}: ${t.settings.system}`, action: () => { setTheme("system"); close(); }, category: "action" },
  ];

  const allCommands = [...navigationCommands, ...actionCommands];

  const filtered = query
    ? allCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-lg bg-surface rounded-[var(--radius-lg)] border border-border shadow-lg overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <svg className="w-5 h-5 text-text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.command.placeholder}
            className="flex-1 py-4 bg-transparent text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none"
          />
          <kbd className="text-[10px] text-text-tertiary bg-skeleton px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-tertiary text-center">{t.command.noResults}</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex ? "bg-accent-light" : "hover:bg-surface-hover"
                }`}
              >
                <span className={`text-sm ${i === selectedIndex ? "text-accent font-medium" : "text-text-primary"}`}>
                  {cmd.label}
                </span>
                {cmd.description && (
                  <span className="text-xs text-text-tertiary">{cmd.description}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-text-tertiary">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
