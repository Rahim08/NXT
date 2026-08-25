"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";

interface DepTask {
  id: string;
  title: string;
  status: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  size: string;
  scheduled_at: string | null;
  deadline_at: string | null;
  project_id: string;
  workstream_id: string | null;
  stage_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string;
  subtasks: { id: string; title: string; done: boolean; position: number }[];
  dependencies: DepTask[];
  dependent_tasks: DepTask[];
}

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailPanel({ taskId, onClose, onUpdate }: TaskDetailPanelProps) {
  const { t } = useI18n();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch task on mount and when taskId changes
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setTask(data.data);
          setTitleValue(data.data.title);
          setDescriptionValue(data.data.description || "");
          setNotesValue(data.data.notes || "");
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [taskId]);

  const refetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTask(data.data);
        setTitleValue(data.data.title);
        setDescriptionValue(data.data.description || "");
        setNotesValue(data.data.notes || "");
      }
    } catch {
      // silent
    }
  }, [taskId]);

  if (!taskId) return null;

  const handleUpdate = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      refetchTask();
      onUpdate();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== task?.title) {
      handleUpdate({ title: titleValue.trim() });
    }
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    if (descriptionValue !== task?.description) {
      handleUpdate({ description: descriptionValue });
    }
    setEditingDescription(false);
  };

  const handleSaveNotes = () => {
    if (notesValue !== (task?.notes || "")) {
      handleUpdate({ notes: notesValue });
    }
    setEditingNotes(false);
  };

  const handleToggleSubtask = async (subtaskId: string, done: boolean) => {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !done }),
      });
      refetchTask();
    } catch {
      // silent
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, title: newSubtaskTitle.trim() }),
      });
      setNewSubtaskTitle("");
      refetchTask();
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      onClose();
      onUpdate();
    } catch {
      // silent
    }
  };

  const statusOptions = [
    { value: "todo", label: t.status.todo },
    { value: "in_progress", label: t.status.in_progress },
    { value: "blocked", label: t.status.blocked },
    { value: "done", label: t.status.done },
  ];

  const priorityOptions = [
    { value: "low", label: t.priority.low },
    { value: "medium", label: t.priority.medium },
    { value: "high", label: t.priority.high },
  ];

  const sizeOptions = [
    { value: "S", label: t.size.S },
    { value: "M", label: t.size.M },
    { value: "L", label: t.size.L },
  ];

  return (
    <>
      {/* Desktop: right-side panel */}
      <div className="hidden lg:block fixed right-0 top-0 h-screen w-[400px] bg-surface border-l border-border z-40 overflow-y-auto shadow-lg">
        <TaskDetailContent
          task={task}
          loading={loading}
          saving={saving}
          t={t}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          titleValue={titleValue}
          setTitleValue={setTitleValue}
          editingDescription={editingDescription}
          setEditingDescription={setEditingDescription}
          descriptionValue={descriptionValue}
          setDescriptionValue={setDescriptionValue}
          editingNotes={editingNotes}
          setEditingNotes={setEditingNotes}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          handleSaveTitle={handleSaveTitle}
          handleSaveDescription={handleSaveDescription}
          handleSaveNotes={handleSaveNotes}
          handleUpdate={handleUpdate}
          handleToggleSubtask={handleToggleSubtask}
          newSubtaskTitle={newSubtaskTitle}
          setNewSubtaskTitle={setNewSubtaskTitle}
          handleAddSubtask={handleAddSubtask}
          handleDelete={handleDelete}
          statusOptions={statusOptions}
          priorityOptions={priorityOptions}
          sizeOptions={sizeOptions}
          onClose={onClose}
        />
      </div>

      {/* Mobile: full-height sheet */}
      <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative mt-16 flex-1 bg-surface rounded-t-[var(--radius-lg)] overflow-y-auto">
          <TaskDetailContent
            task={task}
            loading={loading}
            saving={saving}
            t={t}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            titleValue={titleValue}
            setTitleValue={setTitleValue}
            editingDescription={editingDescription}
            setEditingDescription={setEditingDescription}
            descriptionValue={descriptionValue}
            setDescriptionValue={setDescriptionValue}
            editingNotes={editingNotes}
            setEditingNotes={setEditingNotes}
            notesValue={notesValue}
            setNotesValue={setNotesValue}
            handleSaveTitle={handleSaveTitle}
            handleSaveDescription={handleSaveDescription}
            handleSaveNotes={handleSaveNotes}
            handleUpdate={handleUpdate}
            handleToggleSubtask={handleToggleSubtask}
            newSubtaskTitle={newSubtaskTitle}
            setNewSubtaskTitle={setNewSubtaskTitle}
            handleAddSubtask={handleAddSubtask}
            handleDelete={handleDelete}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            sizeOptions={sizeOptions}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
}

interface ContentProps {
  task: TaskDetail | null;
  loading: boolean;
  saving: boolean;
  t: ReturnType<typeof useI18n>["t"];
  editingTitle: boolean;
  setEditingTitle: (v: boolean) => void;
  titleValue: string;
  setTitleValue: (v: string) => void;
  editingDescription: boolean;
  setEditingDescription: (v: boolean) => void;
  descriptionValue: string;
  setDescriptionValue: (v: string) => void;
  editingNotes: boolean;
  setEditingNotes: (v: boolean) => void;
  notesValue: string;
  setNotesValue: (v: string) => void;
  handleSaveTitle: () => void;
  handleSaveDescription: () => void;
  handleSaveNotes: () => void;
  handleUpdate: (fields: Record<string, unknown>) => void;
  handleToggleSubtask: (id: string, done: boolean) => void;
  newSubtaskTitle: string;
  setNewSubtaskTitle: (v: string) => void;
  handleAddSubtask: (e: React.FormEvent) => void;
  handleDelete: () => void;
  statusOptions: { value: string; label: string }[];
  priorityOptions: { value: string; label: string }[];
  sizeOptions: { value: string; label: string }[];
  onClose: () => void;
}

function TaskDetailContent({
  task,
  loading,
  saving,
  t,
  editingTitle,
  setEditingTitle,
  titleValue,
  setTitleValue,
  editingDescription,
  setEditingDescription,
  descriptionValue,
  setDescriptionValue,
  editingNotes,
  setEditingNotes,
  notesValue,
  setNotesValue,
  handleSaveTitle,
  handleSaveDescription,
  handleSaveNotes,
  handleUpdate,
  handleToggleSubtask,
  newSubtaskTitle,
  setNewSubtaskTitle,
  handleAddSubtask,
  handleDelete,
  statusOptions,
  priorityOptions,
  sizeOptions,
  onClose,
}: ContentProps) {
  if (loading && !task) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-6 bg-skeleton rounded w-2/3" />
        <div className="h-4 bg-skeleton rounded w-1/2" />
        <div className="h-20 bg-skeleton rounded" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-text-tertiary">{t.common.loading}</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-text-tertiary animate-pulse">{t.common.loading}</span>
          )}
          <button
            onClick={handleDelete}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-danger-bg text-text-tertiary hover:text-danger transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      {editingTitle ? (
        <input
          type="text"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveTitle();
            if (e.key === "Escape") {
              setTitleValue(task.title);
              setEditingTitle(false);
            }
          }}
          className="w-full text-xl font-semibold text-text-primary bg-transparent border-b-2 border-accent focus:outline-none pb-1"
          autoFocus
        />
      ) : (
        <h2
          onClick={() => setEditingTitle(true)}
          className="text-xl font-semibold text-text-primary cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1"
        >
          {task.title}
        </h2>
      )}

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
          {t.task.status}
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleUpdate({ status: opt.value })}
              className={`px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-colors min-h-[36px] ${
                task.status === opt.value
                  ? opt.value === "done"
                    ? "bg-success text-white"
                    : opt.value === "blocked"
                    ? "bg-danger text-white"
                    : opt.value === "in_progress"
                    ? "bg-accent text-text-inverse"
                    : "bg-surface-hover text-text-primary"
                  : "border border-border text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority + Size row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
            {t.task.priority}
          </label>
          <div className="flex gap-1.5">
            {priorityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleUpdate({ priority: opt.value })}
                className={`flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                  task.priority === opt.value
                    ? opt.value === "high"
                      ? "bg-danger text-white"
                      : "bg-accent text-text-inverse"
                    : "border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
            {t.task.size}
          </label>
          <div className="flex gap-1.5">
            {sizeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleUpdate({ size: opt.value })}
                className={`flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                  task.size === opt.value
                    ? "bg-accent text-text-inverse"
                    : "border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {opt.value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
            {t.task.scheduled}
          </label>
          <input
            type="date"
            value={task.scheduled_at ? task.scheduled_at.split("T")[0] : ""}
            onChange={(e) =>
              handleUpdate({ scheduled_at: e.target.value || null })
            }
            className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
            {t.task.deadline}
          </label>
          <input
            type="date"
            value={task.deadline_at ? task.deadline_at.split("T")[0] : ""}
            onChange={(e) =>
              handleUpdate({ deadline_at: e.target.value || null })
            }
            className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
          {t.task.description}
        </label>
        {editingDescription ? (
          <textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={handleSaveDescription}
            className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-accent bg-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[80px] resize-y"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingDescription(true)}
            className="px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-sm cursor-pointer hover:bg-surface-hover min-h-[44px]"
          >
            {task.description ? (
              <span className="text-text-primary">{task.description}</span>
            ) : (
              <span className="text-text-tertiary">{t.task.noDescription}</span>
            )}
          </div>
        )}
      </div>

      {/* Subtasks */}
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
          {t.task.subtasks}
        </label>
        <div className="space-y-1.5">
          {task.subtasks && task.subtasks.length > 0 ? (
            task.subtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-hover"
              >
                <button
                  onClick={() => handleToggleSubtask(st.id, st.done)}
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                    st.done
                      ? "bg-success border-success"
                      : "border-border hover:border-accent"
                  }`}
                >
                  {st.done && (
                    <svg className="w-2.5 h-2.5 text-white mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm ${st.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                  {st.title}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-text-tertiary px-2">{t.task.noSubtasks}</p>
          )}
        </div>

        {/* Add subtask */}
        <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder={t.task.addSubtask}
            className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-text-primary text-xs placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            disabled={!newSubtaskTitle.trim()}
            className="px-3 py-2 rounded-[var(--radius-sm)] bg-accent text-text-inverse text-xs font-medium hover:bg-accent-hover disabled:opacity-40"
          >
            +
          </button>
        </form>
      </div>

      {/* Dependencies */}
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
          {t.task.dependencies}
        </label>
        {task.dependencies && task.dependencies.length > 0 ? (
          <div className="space-y-1.5">
            {task.dependencies.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-elevated">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dep.status === "done" ? "bg-success" : dep.status === "blocked" ? "bg-danger" : "bg-text-tertiary"}`} />
                <span className={`text-sm ${dep.status === "done" ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                  {dep.title}
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {dep.status === "done" ? "✓" : dep.status === "blocked" ? "⊘" : "○"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary px-2">{t.task.noDependencies}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 block">
          {t.task.notes}
        </label>
        {editingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-accent bg-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[60px] resize-y"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setEditingNotes(true)}
            className="px-3 py-2 rounded-[var(--radius-sm)] border border-border bg-elevated text-sm cursor-pointer hover:bg-surface-hover min-h-[44px]"
          >
            {task.notes ? (
              <span className="text-text-primary whitespace-pre-wrap">{task.notes}</span>
            ) : (
              <span className="text-text-tertiary">Add notes...</span>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="border-t border-border pt-4 space-y-2 text-xs text-text-tertiary">
        <div className="flex justify-between">
          <span>{t.task.createdAt}</span>
          <span>{new Date(task.created_at).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>{t.task.updatedAt}</span>
          <span>{new Date(task.updated_at).toLocaleString()}</span>
        </div>
        {task.completed_at && (
          <div className="flex justify-between">
            <span>{t.task.completedAt}</span>
            <span>{new Date(task.completed_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
