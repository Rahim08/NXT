"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { LayoutShell, useShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  target_date: string | null;
  task_count: number;
  completed_task_count: number;
  weighted_percentage: number;
  workstream_count: number;
}

export default function ProjectsPage() {
  const { t } = useI18n();
  const { openSearch } = useShell();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?status=${activeTab}`);
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName("");
        setNewDesc("");
        setShowNewForm(false);
        fetchProjects();
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      fetchProjects();
    } catch {
      // silent
    }
  };

  const tabs = [
    { key: "active" as const, label: t.projects.active },
    { key: "completed" as const, label: t.projects.completed },
    { key: "archived" as const, label: t.projects.archived },
  ];

  return (
    <LayoutShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
              {t.projects.title}
            </h1>
            <button
              onClick={openSearch}
              className="lg:hidden w-[44px] h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2">
            <Link
              href="/import"
              className="px-4 py-2.5 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors min-w-[44px] text-center"
            >
              {t.import.importProject}
            </Link>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-4 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover transition-colors min-w-[44px]"
            >
              {t.projects.newProject}
            </button>
          </div>
        </header>

        {/* New Project Form */}
        {showNewForm && (
          <form onSubmit={handleCreate} className="bg-surface rounded-[var(--radius-lg)] border border-border p-5 space-y-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.projects.newProject}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-elevated border border-border text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t.task.description}
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-elevated border border-border text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setNewName("");
                  setNewDesc("");
                }}
                className="px-4 py-2.5 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-4 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40"
              >
                {t.common.create}
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-surface rounded-[var(--radius-md)] border border-border p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-text-inverse"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-[var(--radius-lg)] border border-border p-5 animate-pulse">
                <div className="h-5 bg-skeleton rounded w-1/3 mb-3" />
                <div className="h-3 bg-skeleton rounded w-1/2 mb-4" />
                <div className="h-2 bg-skeleton rounded-full w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-12 text-center">
            <p className="text-text-primary font-medium mb-2">{t.projects.noProjects}</p>
            <p className="text-text-tertiary text-sm">{t.projects.createFirst}</p>
          </div>
        ) : (
          <div className="space-y-3">              {projects.map((project) => {
              const pct = project.weighted_percentage ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block bg-surface rounded-[var(--radius-lg)] border border-border p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-text-primary truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-text-secondary mt-0.5 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(project.id);
                      }}
                      className="ml-3 p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary">
                        {project.completed_task_count}/{project.task_count} {t.projects.tasks.toLowerCase()}
                      </span>
                      <span className="text-xs font-medium text-text-primary">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-skeleton rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
                    {project.workstream_count > 0 && (
                      <span>{project.workstream_count} {t.projects.workstreams.toLowerCase()}</span>
                    )}
                    {project.target_date && (
                      <span>{t.projects.targetDate}: {new Date(project.target_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
