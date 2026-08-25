"use client";

import { useState, useEffect } from "react";
import { LayoutShell, useShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  size: string;
  project_id: string;
  created_at: string;
}

export default function InboxPage() {
  const { t } = useI18n();
  const { openSearch } = useShell();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks?limit=200");
      const data = await res.json();
      if (data.success) {
        // Inbox = tasks with project_id "inbox" OR tasks with null/empty project
        setTasks(
          data.data.filter(
            (task: TaskRow) =>
              !task.project_id ||
              task.project_id === "inbox" ||
              task.project_id === ""
          )
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle("");
      fetchTasks();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      fetchTasks();
    } catch {
      // silent
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
    } catch {
      // silent
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
            {t.inbox.title}
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

        {/* Quick Capture */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.inbox.addTask}
            className="flex-1 px-4 py-3 rounded-[var(--radius-md)] border border-border bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || saving}
            className="px-5 py-3 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors min-w-[44px]"
          >
            {saving ? "..." : t.common.add}
          </button>
        </form>

        {/* Task List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-[var(--radius-md)] border border-border p-4 animate-pulse">
                <div className="h-4 bg-skeleton rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-12 text-center">
            <p className="text-text-primary font-medium mb-2">{t.inbox.empty}</p>
            <p className="text-text-tertiary text-sm max-w-sm mx-auto">{t.inbox.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface rounded-[var(--radius-md)] border border-border p-4 flex items-center gap-3 group"
              >
                <button
                  onClick={() => handleDone(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-border hover:border-accent flex-shrink-0 transition-colors"
                />
                <span className="text-sm text-text-primary flex-1">{task.title}</span>
                <span className="text-xs text-text-tertiary">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
