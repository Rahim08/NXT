"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { LayoutShell } from "@/components/layout/layout-shell";
import { TaskDetailPanel } from "@/components/task-detail/task-detail-panel";
import { useI18n } from "@/lib/i18n/provider";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  size: string;
  scheduled_at: string | null;
  deadline_at: string | null;
  workstream_id: string | null;
  stage_id: string | null;
}

interface WorkstreamRow {
  id: string;
  name: string;
  description: string;
  position: number;
}

interface StageRow {
  id: string;
  workstream_id: string;
  name: string;
  position: number;
}

interface MilestoneRow {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  target_date: string | null;
  workstreams: WorkstreamRow[];
  stages: StageRow[];
  tasks: TaskRow[];
  milestones: MilestoneRow[];
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newWorkstreamName, setNewWorkstreamName] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [showNewWorkstream, setShowNewWorkstream] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [expandedWs, setExpandedWs] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [newStageName, setNewStageName] = useState<Record<string, string>>({});
  const [showNewStage, setShowNewStage] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
        const wsIds = new Set((data.data.workstreams as WorkstreamRow[]).map((w) => w.id));
        setExpandedWs(wsIds);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const calcProgress = (tasks: TaskRow[]) => {
    const sizeWeight: Record<string, number> = { S: 1, M: 2, L: 4 };
    let total = 0;
    let done = 0;
    for (const task of tasks) {
      const w = sizeWeight[task.size] ?? 2;
      total += w;
      if (task.status === "done") done += w;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  // Next Action logic (spec §32)
  const getNextAction = (tasks: TaskRow[]): TaskRow | null => {
    const candidates = tasks.filter(
      (t) => t.status !== "done" && t.status !== "blocked"
    );
    if (candidates.length === 0) return null;

    // Sort: in_progress first, then by deadline, scheduled, priority
    return candidates.sort((a, b) => {
      // In progress first
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;

      // Then by deadline
      const aDl = a.deadline_at || "";
      const bDl = b.deadline_at || "";
      if (aDl && bDl) return aDl.localeCompare(bDl);
      if (aDl) return -1;
      if (bDl) return 1;

      // Then by scheduled
      const aS = a.scheduled_at || "";
      const bS = b.scheduled_at || "";
      if (aS && bS) return aS.localeCompare(bS);
      if (aS) return -1;
      if (bS) return 1;

      // Then by priority
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority as keyof typeof pOrder] ?? 1) - (pOrder[b.priority as keyof typeof pOrder] ?? 1);
    })[0];
  };

  const handleDone = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      fetchProject();
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
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleAddTask = async (workstreamId?: string, stageId?: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          project_id: id,
          workstream_id: workstreamId || null,
          stage_id: stageId || null,
        }),
      });
      setNewTaskTitle("");
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleAddWorkstream = async () => {
    if (!newWorkstreamName.trim()) return;
    try {
      await fetch("/api/workstreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id, name: newWorkstreamName.trim() }),
      });
      setNewWorkstreamName("");
      setShowNewWorkstream(false);
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleDeleteWorkstream = async (wsId: string) => {
    if (!confirm("Delete this workstream and all its tasks?")) return;
    try {
      await fetch(`/api/workstreams/${wsId}`, { method: "DELETE" });
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleAddStage = async (workstreamId: string) => {
    const name = newStageName[workstreamId];
    if (!name?.trim()) return;
    try {
      await fetch("/api/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workstream_id: workstreamId, name: name.trim() }),
      });
      setNewStageName((prev) => ({ ...prev, [workstreamId]: "" }));
      setShowNewStage((prev) => ({ ...prev, [workstreamId]: false }));
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    try {
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id, title: newMilestoneTitle.trim() }),
      });
      setNewMilestoneTitle("");
      setShowNewMilestone(false);
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleToggleMilestone = async (msId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    try {
      await fetch(`/api/milestones/${msId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchProject();
    } catch {
      // silent
    }
  };

  const handleSaveProject = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          status: editStatus,
        }),
      });
      setEditingProject(false);
      fetchProject();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const startEditProject = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description);
    setEditStatus(project.status);
    setEditingProject(true);
  };

  if (loading) {
    return (
      <LayoutShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-skeleton rounded w-1/3" />
          <div className="h-4 bg-skeleton rounded w-1/2" />
          <div className="h-20 bg-skeleton rounded-lg" />
        </div>
      </LayoutShell>
    );
  }

  if (!project) {
    return (
      <LayoutShell>
        <div className="text-center py-20">
          <p className="text-text-secondary">Project not found</p>
          <Link href="/projects" className="text-accent text-sm mt-2 inline-block">{t.common.back}</Link>
        </div>
      </LayoutShell>
    );
  }

  const progress = calcProgress(project.tasks);
  const nextAction = getNextAction(project.tasks);
  const doneCount = project.tasks.filter((t) => t.status === "done").length;
  const statusOptions = ["active", "paused", "completed", "archived"];

  return (
    <LayoutShell>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Link href="/projects" className="hover:text-text-primary">{t.projects.title}</Link>
          <span>/</span>
          <span className="text-text-primary">{project.name}</span>
        </div>

        {/* Header — editable */}
        {editingProject ? (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5 space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-2xl font-semibold text-text-primary bg-transparent border-b-2 border-accent focus:outline-none pb-1"
              autoFocus
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder={t.task.description}
              className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">{t.task.status}</label>
              <div className="flex gap-1.5">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={`px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                      editStatus === s ? "bg-accent text-text-inverse" : "border border-border text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {t.status[s as keyof typeof t.status] || s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditingProject(false)} className="px-4 py-2.5 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium">
                {t.common.cancel}
              </button>
              <button onClick={handleSaveProject} disabled={!editName.trim() || saving} className="px-5 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
                {saving ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>
        ) : (
          <header className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-text-primary tracking-tight">{project.name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  project.status === "active" ? "bg-success-bg text-success" :
                  project.status === "completed" ? "bg-accent-light text-accent" :
                  project.status === "archived" ? "bg-surface-hover text-text-secondary" :
                  "bg-warning-bg text-warning"
                }`}>
                  {t.status[project.status as keyof typeof t.status] || project.status}
                </span>
              </div>
              {project.description && <p className="text-sm text-text-secondary mt-1">{project.description}</p>}
            </div>
            <button onClick={startEditProject} className="p-2 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
          </header>
        )}

        {/* Progress Overview */}
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary">{t.projects.progress}</span>
            <span className="text-lg font-semibold text-accent">{progress}%</span>
          </div>
          <div className="h-2 bg-skeleton rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
            <span>{doneCount}/{project.tasks.length} {t.projects.tasks.toLowerCase()}</span>
            <span>{project.workstreams.length} {t.projects.workstreams.toLowerCase()}</span>
            <span>{project.milestones.length} {t.projects.milestones.toLowerCase()}</span>
          </div>
        </div>

        {/* Next Action */}
        {nextAction && (
          <div className="bg-accent-light rounded-[var(--radius-lg)] border border-accent/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Next Action</span>
            </div>
            <button onClick={() => setSelectedTaskId(nextAction.id)} className="text-sm font-medium text-text-primary hover:text-accent transition-colors">
              {nextAction.title}
            </button>
            <div className="flex items-center gap-2 mt-1">
              {nextAction.priority === "high" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-danger-bg text-danger">{t.priority.high}</span>
              )}
              {nextAction.deadline_at && (
                <span className="text-[10px] text-danger">{t.task.deadline}: {new Date(nextAction.deadline_at).toLocaleDateString()}</span>
              )}
              {nextAction.scheduled_at && (
                <span className="text-[10px] text-text-tertiary">{t.task.scheduled}: {new Date(nextAction.scheduled_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        {/* Quick Add Task */}
        <form onSubmit={(e) => { e.preventDefault(); handleAddTask(); }} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={t.common.addTask}
            className="flex-1 px-4 py-3 rounded-[var(--radius-md)] border border-border bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button type="submit" disabled={!newTaskTitle.trim()} className="px-5 py-3 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors">
            {t.common.add}
          </button>
        </form>

        {/* Workstreams */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{t.projects.workstreams}</h2>
            <button onClick={() => setShowNewWorkstream(!showNewWorkstream)} className="text-xs font-medium text-accent hover:text-accent-hover">
              + {t.common.new}
            </button>
          </div>

          {showNewWorkstream && (
            <form onSubmit={(e) => { e.preventDefault(); handleAddWorkstream(); }} className="flex gap-2">
              <input
                type="text" value={newWorkstreamName} onChange={(e) => setNewWorkstreamName(e.target.value)}
                placeholder={t.projects.workstreams}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus
              />
              <button type="submit" disabled={!newWorkstreamName.trim()} className="px-4 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
                {t.common.create}
              </button>
            </form>
          )}

          {project.workstreams.length === 0 ? (
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-8 text-center">
              <p className="text-text-tertiary text-sm">{t.projects.createFirst}</p>
            </div>
          ) : (
            project.workstreams.map((ws) => {
              const wsStages = project.stages.filter((s) => s.workstream_id === ws.id);
              const wsTasks = project.tasks.filter((t) => t.workstream_id === ws.id);
              const wsProgress = calcProgress(wsTasks);
              const isExpanded = expandedWs.has(ws.id);

              return (
                <div key={ws.id} className="bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedWs((prev) => { const next = new Set(prev); if (next.has(ws.id)) next.delete(ws.id); else next.add(ws.id); return next; })}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="text-sm font-semibold text-text-primary">{ws.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary">{wsTasks.length} tasks</span>
                      <span className="text-xs font-medium text-accent">{wsProgress}%</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteWorkstream(ws.id); }}
                        className="p-1 rounded text-text-tertiary hover:text-danger transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Tasks without stage */}
                      {wsTasks.filter((t) => !t.stage_id).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-surface-hover">
                          <button
                            onClick={() => task.status === "done" ? handleUndone(task.id) : handleDone(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                              task.status === "done" ? "bg-success border-success" : "border-border hover:border-accent"
                            }`}
                          >
                            {task.status === "done" && (
                              <svg className="w-3 h-3 text-white mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                          <button onClick={() => setSelectedTaskId(task.id)} className="text-sm flex-1 text-left hover:text-accent transition-colors">
                            <span className={task.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}>
                              {task.title}
                            </span>
                          </button>
                          {task.priority === "high" && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-danger-bg text-danger">H</span>
                          )}
                        </div>
                      ))}

                      {/* Stages */}
                      {wsStages.map((stage) => {
                        const stageTasks = wsTasks.filter((t) => t.stage_id === stage.id);
                        return (
                          <div key={stage.id} className="ml-4">
                            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider py-1">{stage.name}</p>
                            {stageTasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)] hover:bg-surface-hover">
                                <button
                                  onClick={() => task.status === "done" ? handleUndone(task.id) : handleDone(task.id)}
                                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                                    task.status === "done" ? "bg-success border-success" : "border-border hover:border-accent"
                                  }`}
                                >
                                  {task.status === "done" && (
                                    <svg className="w-3 h-3 text-white mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                  )}
                                </button>
                                <button onClick={() => setSelectedTaskId(task.id)} className="text-sm flex-1 text-left">
                                  <span className={task.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}>
                                    {task.title}
                                  </span>
                                </button>
                                {task.priority === "high" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-danger-bg text-danger">H</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}

                      {/* Add task to workstream */}
                      <form onSubmit={(e) => { e.preventDefault(); handleAddTask(ws.id); }} className="flex gap-2 mt-2">
                        <input
                          type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder={t.common.addTask}
                          className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-text-primary text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                        <button type="submit" disabled={!newTaskTitle.trim()} className="px-3 py-2 rounded-[var(--radius-sm)] bg-accent text-text-inverse text-xs font-medium hover:bg-accent-hover disabled:opacity-40">+</button>
                      </form>

                      {/* Add stage */}
                      {showNewStage[ws.id] ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleAddStage(ws.id); }} className="flex gap-2">
                          <input
                            type="text"
                            value={newStageName[ws.id] || ""}
                            onChange={(e) => setNewStageName((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                            placeholder={t.projects.stages}
                            className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-accent bg-elevated text-text-primary text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                            autoFocus
                          />
                          <button type="submit" disabled={!newStageName[ws.id]?.trim()} className="px-3 py-2 rounded-[var(--radius-sm)] bg-accent text-text-inverse text-xs font-medium">
                            {t.common.create}
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowNewStage((prev) => ({ ...prev, [ws.id]: true }))}
                          className="text-xs text-accent hover:text-accent-hover font-medium"
                        >
                          + {t.projects.stages}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Milestones */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{t.projects.milestones}</h2>
            <button onClick={() => setShowNewMilestone(!showNewMilestone)} className="text-xs font-medium text-accent hover:text-accent-hover">
              + {t.common.new}
            </button>
          </div>

          {showNewMilestone && (
            <form onSubmit={(e) => { e.preventDefault(); handleAddMilestone(); }} className="flex gap-2 mb-3">
              <input
                type="text" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder={t.projects.milestones}
                className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus
              />
              <button type="submit" disabled={!newMilestoneTitle.trim()} className="px-4 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover disabled:opacity-40">
                {t.common.create}
              </button>
            </form>
          )}

          {project.milestones.length > 0 ? (
            <div className="space-y-2">
              {project.milestones.map((ms) => (
                <div key={ms.id} className="bg-surface rounded-[var(--radius-md)] border border-border p-4 flex items-center gap-3">
                  <button
                    onClick={() => handleToggleMilestone(ms.id, ms.status)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                      ms.status === "done" ? "bg-success border-success" : "border-border hover:border-accent"
                    }`}
                  >
                    {ms.status === "done" && (
                      <svg className="w-3 h-3 text-white mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${ms.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                    {ms.title}
                  </span>
                  {ms.target_date && (
                    <span className="text-xs text-text-tertiary">{new Date(ms.target_date).toLocaleDateString()}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-6 text-center">
              <p className="text-text-tertiary text-sm">No milestones yet</p>
            </div>
          )}
        </section>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={fetchProject}
      />
    </LayoutShell>
  );
}
