import type { Task, Size, ProgressInfo } from "@/types";
import { SIZE_WEIGHTS } from "@/types";

export function taskWeight(size: Size): number {
  return SIZE_WEIGHTS[size] ?? 2; // default M weight
}

export function computeProgress(tasks: Task[]): ProgressInfo {
  if (tasks.length === 0) {
    return { total_weight: 0, completed_weight: 0, percentage: 0 };
  }

  let total = 0;
  let completed = 0;

  for (const t of tasks) {
    const w = taskWeight(t.size);
    total += w;
    if (t.status === "done") completed += w;
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total_weight: total, completed_weight: completed, percentage };
}

export function computeWorkstreamProgress(tasks: Task[], workstreamId: string): ProgressInfo {
  const wsTasks = tasks.filter((t) => t.workstream_id === workstreamId);
  return computeProgress(wsTasks);
}

export function computeStageProgress(tasks: Task[], stageId: string): ProgressInfo {
  const stageTasks = tasks.filter((t) => t.stage_id === stageId);
  return computeProgress(stageTasks);
}

export function computeProjectProgress(tasks: Task[], projectId: string): ProgressInfo {
  const projectTasks = tasks.filter((t) => t.project_id === projectId);
  return computeProgress(projectTasks);
}

export function nextAction(tasks: Task[]): Task | null {
  // Priority: in_progress first, then todo by deadline/scheduled
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  if (inProgress.length > 0) {
    return inProgress.sort((a, b) => {
      const aDate = a.deadline_at ?? a.scheduled_at ?? "";
      const bDate = b.deadline_at ?? b.scheduled_at ?? "";
      return aDate.localeCompare(bDate);
    })[0];
  }

  const todo = tasks.filter((t) => t.status === "todo");
  if (todo.length > 0) {
    return todo.sort((a, b) => {
      // Sort by deadline first, then scheduled, then priority
      const aDate = a.deadline_at ?? "";
      const bDate = b.deadline_at ?? "";
      if (aDate && bDate) return aDate.localeCompare(bDate);
      if (aDate) return -1;
      if (bDate) return 1;

      const aSched = a.scheduled_at ?? "";
      const bSched = b.scheduled_at ?? "";
      if (aSched && bSched) return aSched.localeCompare(bSched);

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];
  }

  return null;
}
