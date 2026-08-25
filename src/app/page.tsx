"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutShell, useShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  size: string;
  scheduled_at: string | null;
  deadline_at: string | null;
  project_id: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: string;
  task_count: number;
  completed_task_count: number;
  weighted_percentage: number;
  workstream_count: number;
}

export default function Home() {
  const { t } = useI18n();
  const { openSearch, openProfile } = useShell();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch("/api/tasks?limit=50"),
          fetch("/api/projects?status=active"),
        ]);
        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        if (tasksData.success) setTasks(tasksData.data);
        if (projectsData.success) setProjects(projectsData.data);
      } catch {
        // silent
      }
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t.home.greeting : hour < 18 ? t.home.greetingAfternoon : t.home.greetingEvening;

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(
    (task) => task.scheduled_at && task.scheduled_at.startsWith(today) && task.status !== "done"
  );
  const overdueTasks = tasks.filter(
    (task) => task.deadline_at && task.deadline_at < today && task.status !== "done"
  );
  const dueThisWeekTasks = tasks.filter((task) => {
    if (!task.deadline_at || task.status === "done") return false;
    const dl = new Date(task.deadline_at);
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    return dl >= now && dl <= endOfWeek;
  });
  const blockedTasks = tasks.filter((task) => task.status === "blocked");
  const nextUp = tasks
    .filter((task) => task.status === "todo" || task.status === "in_progress")
    .slice(0, 5);

  const handleDone = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // silent
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        {/* Header with greeting + actions */}
        <header className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
              {greeting}
            </h1>
            <p className="text-xs text-text-tertiary mt-0.5">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Search icon — mobile only */}
            <button
              onClick={openSearch}
              className="lg:hidden w-[44px] h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors"
              aria-label={t.common.search}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
            {/* Profile / Settings button */}
            <button
              onClick={openProfile}
              className="w-[44px] h-[44px] flex items-center justify-center rounded-full bg-accent-light hover:bg-accent/20 transition-colors"
              aria-label={t.nav.settings}
            >
              <span className="text-sm font-bold text-accent">N</span>
            </button>
          </div>
        </header>

        {/* Today Summary — compact */}
        <section>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t.home.todaySummary}
          </h2>
          {todayTasks.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-tertiary">{t.home.noTasksToday}</p>
                <Link href="/inbox" className="text-xs font-medium text-accent hover:text-accent-hover shrink-0">
                  + {t.common.addTask}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3"
                >
                  <button
                    onClick={() => handleDone(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-border hover:border-accent shrink-0 transition-colors"
                  />
                  <span className="text-sm text-text-primary flex-1">{task.title}</span>
                  {task.priority === "high" && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-danger-bg text-danger">
                      {t.priority.high}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attention Cards */}
        {(overdueTasks.length > 0 || dueThisWeekTasks.length > 0 || blockedTasks.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              {t.home.attention}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {overdueTasks.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 text-center">
                  <div className="w-2 h-2 rounded-full bg-danger mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-danger">{overdueTasks.length}</p>
                  <p className="text-[10px] text-text-tertiary">{t.home.overdue}</p>
                </div>
              )}
              {dueThisWeekTasks.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 text-center">
                  <div className="w-2 h-2 rounded-full bg-warning mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-warning">{dueThisWeekTasks.length}</p>
                  <p className="text-[10px] text-text-tertiary">{t.home.dueThisWeek}</p>
                </div>
              )}
              {blockedTasks.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-3 text-center">
                  <div className="w-2 h-2 rounded-full bg-danger mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-danger">{blockedTasks.length}</p>
                  <p className="text-[10px] text-text-tertiary">{t.home.blocked}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Active Projects */}
        <section>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t.home.activeProjects}
          </h2>
          {projects.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-4">
              <p className="text-sm text-text-tertiary mb-3">{t.projects.noProjects}</p>
              <div className="flex gap-2">
                <Link
                  href="/projects"
                  className="px-4 py-2.5 rounded-xl bg-accent text-text-inverse text-xs font-medium hover:bg-accent-hover transition-colors min-h-[44px] flex items-center"
                >
                  {t.projects.newProject}
                </Link>
                <Link
                  href="/import"
                  className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-xs font-medium hover:bg-surface-hover transition-colors min-h-[44px] flex items-center"
                >
                  {t.import.importProject}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const pct = project.weighted_percentage ?? 0;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-surface rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-text-primary">{project.name}</h3>
                      <span className="text-xs font-medium text-text-secondary">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-skeleton rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Next Up */}
        {nextUp.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              {t.home.nextUp}
            </h2>
            <div className="space-y-2">
              {nextUp.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3"
                >
                  <button
                    onClick={() => handleDone(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-border hover:border-accent shrink-0 transition-colors"
                  />
                  <span className="text-sm text-text-primary flex-1">{task.title}</span>
                  {task.priority === "high" && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-danger-bg text-danger">
                      {t.priority.high}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </LayoutShell>
  );
}
