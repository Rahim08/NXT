// Status enums
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type Priority = "low" | "medium" | "high";
export type Size = "S" | "M" | "L";
export type Locale = "en" | "ru";
export type Appearance = "light" | "dark" | "system";
export type MilestoneStatus = "todo" | "in_progress" | "done";
export type ImportStatus = "pending" | "completed" | "failed";

// Size weights for progress calculation
export const SIZE_WEIGHTS: Record<Size, number> = { S: 1, M: 2, L: 4 };

// Entities
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workstream {
  id: string;
  project_id: string;
  name: string;
  description: string;
  position: number;
}

export interface Stage {
  id: string;
  workstream_id: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  project_id: string;
  workstream_id: string | null;
  stage_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  size: Size;
  scheduled_at: string | null;
  deadline_at: string | null;
  position: number;
  completed_at: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  status: MilestoneStatus;
  target_date: string | null;
  position: number;
}

export interface TaskDependency {
  id: number;
  task_id: string;
  depends_on_task_id: string;
}

export interface Import {
  id: number;
  project_id: string | null;
  filename: string;
  format: string;
  status: ImportStatus;
  created_at: string;
}

export interface Settings {
  id: string;
  language: Locale;
  appearance: Appearance;
  app_icon_variant: string | null;
}

// Computed progress — attached to entities by progress engine
export interface ProgressInfo {
  total_weight: number;
  completed_weight: number;
  percentage: number; // 0–100
}

export interface ProjectWithProgress extends Project, ProgressInfo {
  workstreams?: WorkstreamWithProgress[];
  milestones?: Milestone[];
  task_count?: number;
  completed_task_count?: number;
}

export interface WorkstreamWithProgress extends Workstream, ProgressInfo {
  stages?: StageWithProgress[];
  task_count?: number;
}

export interface StageWithProgress extends Stage, ProgressInfo {
  task_count?: number;
}

// Import schema types
export interface ImportTask {
  id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  size?: Size;
  scheduled_at?: string;
  deadline_at?: string;
  external_id?: string;
  subtasks?: { id?: string; title: string; done?: boolean }[];
}

export interface ImportStage {
  id?: string;
  name: string;
  tasks?: ImportTask[];
}

export interface ImportWorkstream {
  id?: string;
  name: string;
  stages?: ImportStage[];
}

export interface ImportProject {
  id?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  workstreams?: ImportWorkstream[];
  milestones?: { id?: string; title: string; status?: MilestoneStatus; target_date?: string }[];
}

export interface ProjectOSJSON {
  schema_version: string;
  project?: ImportProject;
  projects?: ImportProject[];
}

// Import preview
export interface ImportPreview {
  projects: ImportProject[];
  workstreamCount: number;
  stageCount: number;
  taskCount: number;
  milestoneCount: number;
  warnings: string[];
  errors: string[];
  existingProjects: { id: string; name: string }[];
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
