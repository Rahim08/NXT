"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export function QuickAdd() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd/Ctrl+N to open Quick Add
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setTitle("");
        setShowMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setTitle("");
      setIsOpen(false);
    } catch {
      // silent
    }
  };

  return (
    <>
      {/* ── Desktop inline input ── */}
      <div className="hidden lg:block w-full">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-border bg-surface hover:bg-surface-hover text-text-tertiary text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t.home.quickAddPlaceholder}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.home.quickAddPlaceholder}
              className="flex-1 px-4 py-3 rounded-[var(--radius-md)] border border-accent bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                  setTitle("");
                }
              }}
            />
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-3 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {t.common.done}
            </button>
          </form>
        )}
      </div>

      {/* ── Mobile floating action button ── */}
      {/* Positioned above tab bar: bottom = 49px (tab height) + safe-area-inset-bottom + 16px gap */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`lg:hidden fixed right-5 w-[52px] h-[52px] rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-all ${
          showMenu
            ? "bg-text-secondary text-text-inverse rotate-45"
            : "bg-accent text-text-inverse hover:bg-accent-hover shadow-accent/30"
        }`}
        style={{
          bottom: "calc(49px + env(safe-area-inset-bottom, 0px) + 14px)",
        }}
        aria-label={t.common.quickAdd}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* ── Mobile action menu ── */}
      {showMenu && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowMenu(false);
              setTitle("");
            }}
          />
          <div className="relative w-full bg-surface rounded-t-[var(--radius-lg)] safe-area-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-4 space-y-2">
              {/* New task */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  setIsOpen(true);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-hover transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-text-primary">{t.import.newTask}</p>
                  <p className="text-xs text-text-tertiary">{t.home.quickAddPlaceholder}</p>
                </div>
              </button>

              {/* New project */}
              <Link
                href="/projects"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-text-primary">{t.import.newProject}</p>
                  <p className="text-xs text-text-tertiary">{t.common.addProject}</p>
                </div>
              </Link>

              {/* Import project */}
              <Link
                href="/import"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-text-primary">{t.import.importProject}</p>
                  <p className="text-xs text-text-tertiary">{t.import.supportedFormats}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile quick task sheet ── */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setIsOpen(false);
              setTitle("");
            }}
          />
          <div className="relative w-full bg-surface rounded-t-[var(--radius-lg)] safe-area-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-9 h-1 rounded-full bg-border" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="px-4 pb-4"
            >
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.home.quickAddPlaceholder}
                className="w-full px-4 py-3.5 rounded-xl bg-elevated border border-border text-text-primary text-[15px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setTitle("");
                  }}
                  className="flex-1 py-3.5 rounded-xl border border-border text-text-secondary text-[15px] font-medium min-h-[44px]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-accent text-text-inverse text-[15px] font-medium hover:bg-accent-hover disabled:opacity-40 min-h-[44px]"
                >
                  {t.common.addTask}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
