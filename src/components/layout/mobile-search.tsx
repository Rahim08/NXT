"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

interface SearchResult {
  type: "project" | "task" | "milestone";
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  linkTo: string;
}

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to let the animation start
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/tasks?limit=500"),
      ]);
      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      const matches: SearchResult[] = [];
      const lower = q.toLowerCase();

      if (projectsData.success) {
        const projectMap = new Map<string, string>();
        for (const p of projectsData.data) {
          projectMap.set(p.id, p.name);
        }

        for (const p of projectsData.data) {
          if (
            p.name.toLowerCase().includes(lower) ||
            (p.description && p.description.toLowerCase().includes(lower))
          ) {
            matches.push({
              type: "project",
              id: p.id,
              title: p.name,
              subtitle: p.description,
              status: p.status,
              linkTo: `/projects/${p.id}`,
            });
          }
        }

        if (tasksData.success) {
          for (const task of tasksData.data) {
            if (task.title.toLowerCase().includes(lower)) {
              const projName = projectMap.get(task.project_id);
              const context = projName || task.project_id === "inbox" ? "Inbox" : undefined;
              matches.push({
                type: "task",
                id: task.id,
                title: task.title,
                subtitle: context,
                status: task.status,
                linkTo: projName ? `/projects/${task.project_id}` : "/inbox",
              });
            }
          }
        }
      }

      setResults(matches.slice(0, 30));
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Search panel */}
      <div className="relative bg-surface safe-area-top flex flex-col" style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="relative flex-1">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                search(e.target.value);
              }}
              placeholder={t.search.placeholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-elevated border border-border text-text-primary text-[15px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {query.length >= 2 ? (
            searching ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-text-tertiary animate-pulse">{t.common.loading}</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <p className="text-text-tertiary text-sm">{t.search.noResults}</p>
                <p className="text-text-tertiary text-xs mt-1">{t.search.tryDifferent}</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.linkTo}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 active:bg-surface-hover"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                        result.type === "project"
                          ? "bg-accent-light text-accent"
                          : "bg-surface-hover text-text-secondary"
                      }`}
                    >
                      {result.type === "task" ? "T" : "P"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-text-primary truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-text-tertiary truncate mt-0.5">{result.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-text-tertiary text-sm">{t.search.placeholder}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
