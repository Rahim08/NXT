"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { LayoutShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";

interface SearchResult {
  type: "project" | "task" | "workstream" | "milestone";
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  linkTo?: string;
}

export default function SearchPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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
        const projects = projectsData.data;
        // Build lookup maps
        const projectMap = new Map<string, { name: string; description: string }>();
        for (const p of projects) {
          projectMap.set(p.id, { name: p.name, description: p.description || "" });
        }

        for (const p of projects) {
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
              const proj = projectMap.get(task.project_id);
              const context = proj ? proj.name : task.project_id === "inbox" ? "Inbox" : undefined;
              matches.push({
                type: "task",
                id: task.id,
                title: task.title,
                subtitle: context || undefined,
                status: task.status,
                linkTo: proj ? `/projects/${task.project_id}` : "/inbox",
              });
            }
          }
        }
      }

      setResults(matches.slice(0, 50));
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
            {t.search.title}
          </h1>
        </header>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            placeholder={t.search.placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-[var(--radius-md)] border border-border bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            autoFocus
          />
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div>
            {searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface rounded-[var(--radius-md)] border border-border p-4 animate-pulse">
                    <div className="h-4 bg-skeleton rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-12 text-center">
                <p className="text-text-tertiary text-sm">{t.search.noResults}</p>
                <p className="text-text-tertiary text-xs mt-1">{t.search.tryDifferent}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary font-medium">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </p>
                {results.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.linkTo || "#"}
                    className="block bg-surface rounded-[var(--radius-md)] border border-border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                          result.type === "project"
                            ? "bg-accent-light text-accent"
                            : result.type === "task"
                            ? "bg-surface-hover text-text-secondary"
                            : "bg-info-bg text-info"
                        }`}
                      >
                        {result.type}
                      </span>
                      <span className="text-sm text-text-primary font-medium">{result.title}</span>
                      {result.status && result.status !== "active" && result.status !== "todo" && (
                        <span className="text-xs text-text-tertiary">({result.status})</span>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-text-tertiary mt-1 ml-12">{result.subtitle}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
