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
  workstream_id: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
}

export default function TodayPage() {
  const { t } = useI18n();
  const { openSearch } = useShell();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"today" | "overdue" | "upcoming">("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch tasks based on active tab
        const [tasksRes, projectsRes] = await Promise.all([
          fetch(`/api/tasks?limit=200`),
          fetch("/api/projects"),
        ]);
        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();

        if (tasksData.success) setTasks(tasksData.data);
        if (projectsData.success) {
          const map: Record<string, string> = {};
          for (const p of projectsData.data as ProjectRow[]) {
            map[p.id] = p.name;
          }
          setProjects(map);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const todayTasks = tasks.filter(
    (task) => task.scheduled_at && task.scheduled_at.startsWith(today) && task.status !== "done"
  );
  const overdueTasks = tasks.filter(
    (task) => task.deadline_at && task.deadline_at < today && task.status !== "done"
  );
  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.scheduled_at || task.status === "done") return false;
      return task.scheduled_at > today;
    })
    .slice(0, 30);

  const displayTasks = activeTab === "today" ? todayTasks : activeTab === "overdue" ? overdueTasks : upcomingTasks;

  // Group tasks by project
  const groupedTasks = new Map<string, TaskRow[]>();
  for (const task of displayTasks) {
    const pid = task.project_id || "unassigned";
    if (!groupedTasks.has(pid)) groupedTasks.set(pid, []);
    groupedTasks.get(pid)!.push(task);
  }

  const handleDone = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "done" } : t)));
    } catch {
      // silent
    }
  };

  const handleUndone = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "todo" }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "todo" } : t)));
    } catch {
      // silent
    }
  };

  const renderTask = (task: TaskRow) => (
    <div
      key={task.id}
      className="bg-surface rounded-[var(--radius-md)] border border-border p-4 flex items-center gap-3"
    >
      <button
        onClick={() => (task.status === "done" ? handleUndone(task.id) : handleDone(task.id))}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
          task.status === "done"
            ? "bg-success border-success"
            : "border-border hover:border-accent"
        }`}
      >
        {task.status === "done" && (
          <svg className="w-3 h-3 text-white mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${task.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project_id && task.project_id !== "inbox" && projects[task.project_id] && (
            <span className="text-xs text-accent">{projects[task.project_id]}</span>
          )}
          {task.scheduled_at && activeTab !== "today" && (
            <span className="text-xs text-text-tertiary">
              {new Date(task.scheduled_at).toLocaleDateString()}
            </span>
          )}
          {task.deadline_at && (
            <span className="text-xs text-danger">
              {t.task.deadline}: {new Date(task.deadline_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {task.priority === "high" && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-danger-bg text-danger">
          {t.priority.high}
        </span>
      )}
      {task.size && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-hover text-text-secondary">
          {task.size}
        </span>
      )}
    </div>
  );

  return (
    <LayoutShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
            {t.today.title}
          </h1>
          <button
            onClick={openSearch}
            className="lg:hidden w-[44px] h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </header>

        {/* Segmented Control */}
        <div className="flex bg-surface rounded-[var(--radius-md)] border border-border p-1">
          {(["today", "overdue", "upcoming"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors ${
                activeTab === tab
                  ? "bg-accent text-text-inverse"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab === "today" ? t.today.title : tab === "overdue" ? t.today.overdue : t.today.upcoming}
              {tab === "overdue" && overdueTasks.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold">
                  {overdueTasks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-[var(--radius-md)] border border-border p-4 animate-pulse">
                <div className="h-4 bg-skeleton rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-12 text-center">
            <p className="text-text-tertiary text-sm">
              {activeTab === "today"
                ? t.home.noTasksToday
                : activeTab === "overdue"
                ? t.today.noOverdue
                : t.today.noUpcoming}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groupedTasks.entries()).map(([projectId, projectTasks]) => (
              <div key={projectId}>
                {projectId !== "unassigned" && projectId !== "inbox" && projects[projectId] && (
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/projects/${projectId}`}
                      className="text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-accent"
                    >
                      {projects[projectId]}
                    </Link>
                    <span className="text-xs text-text-tertiary">· {projectTasks.length} tasks</span>
                  </div>
                )}
                {projectId === "inbox" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Link href="/inbox" className="text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-accent">
                      {t.nav.inbox}
                    </Link>
                  </div>
                )}
                <div className="space-y-2">
                  {projectTasks.map(renderTask)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
