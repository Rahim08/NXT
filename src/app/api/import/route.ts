import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";

// ─── Canonical schema types ───────────────────────────────────────────

interface ImportSubtask {
  id?: string;
  title: string;
  status?: string;
  position?: number;
}

interface ImportTask {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  size?: string;
  scheduled_at?: string;
  deadline_at?: string;
  position?: number;
  subtasks?: ImportSubtask[];
  dependencies?: string[];
}

interface ImportStage {
  id?: string;
  name: string;
  position?: number;
  tasks?: ImportTask[];
}

interface ImportWorkstream {
  id?: string;
  name: string;
  description?: string;
  position?: number;
  stages?: ImportStage[];
  tasks?: ImportTask[]; // tasks without a stage
}

interface ImportMilestone {
  id?: string;
  title: string;
  status?: string;
  target_date?: string;
  position?: number;
}

interface ImportProject {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  target_date?: string;
  workstreams?: ImportWorkstream[];
  milestones?: ImportMilestone[];
}

interface ProjectOSJSON {
  schema_version?: string;
  project?: ImportProject;
  projects?: ImportProject[];
}

// ─── Preview result ───────────────────────────────────────────────────

interface PreviewResult {
  projects: ImportProject[];
  workstreamCount: number;
  stageCount: number;
  taskCount: number;
  milestoneCount: number;
  subtaskCount: number;
  dependencyCount: number;
  warnings: string[];
  errors: string[];
  existingProjects: { id: string; name: string }[];
  workstreamDetails: { name: string; taskCount: number }[];
}

// ─── Normalization helpers ────────────────────────────────────────────

function normalizeSize(size: string | undefined): "S" | "M" | "L" {
  if (!size) return "M";
  const s = size.trim().toLowerCase();
  if (s === "s" || s === "small") return "S";
  if (s === "l" || s === "large") return "L";
  return "M"; // medium or unknown → M
}

function normalizeStatus(
  value: string | undefined,
  valid: readonly string[],
  fallback: string
): string {
  if (!value) return fallback;
  const v = value.trim().toLowerCase();
  return valid.includes(v) ? v : fallback;
}

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
const PROJECT_STATUSES = ["active", "paused", "completed", "archived"] as const;
const MILESTONE_STATUSES = ["todo", "in_progress", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

function normalizeTaskStatus(s?: string) {
  return normalizeStatus(s, TASK_STATUSES, "todo");
}
function normalizeProjectStatus(s?: string) {
  return normalizeStatus(s, PROJECT_STATUSES, "active");
}
function normalizeMilestoneStatus(s?: string) {
  return normalizeStatus(s, MILESTONE_STATUSES, "todo");
}
function normalizePriority(p?: string) {
  if (!p) return "medium";
  const v = p.trim().toLowerCase();
  return PRIORITIES.includes(v as (typeof PRIORITIES)[number]) ? v : "medium";
}

function ensureId(id?: string): string {
  return id && id.trim().length > 0 ? id.trim() : generateId();
}

// ─── Parse input ──────────────────────────────────────────────────────

function jsonToProjects(jsonStr: string): ImportProject[] {
  const parsed: ProjectOSJSON = JSON.parse(jsonStr);
  if (parsed.project) return [parsed.project];
  if (parsed.projects && Array.isArray(parsed.projects)) return parsed.projects;
  return [];
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function csvToProjects(csvText: string): ImportProject[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = (name: string) => header.indexOf(name);

  const projectsMap = new Map<string, ImportProject>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 2) continue;

    const projName = cols[idx("project") ?? idx("project_name") ?? 0] || "";
    if (!projName) continue;

    if (!projectsMap.has(projName)) {
      projectsMap.set(projName, {
        id: cols[idx("project_id")] || undefined,
        name: projName,
        description: cols[idx("project_description")] || "",
        workstreams: [],
        milestones: [],
      });
    }
    const project = projectsMap.get(projName)!;

    const wsName = cols[idx("workstream")] || "";
    const stageName = cols[idx("stage")] || "General";
    const taskTitle = cols[idx("task")] || "";

    // Find or create workstream
    let ws = project.workstreams!.find((w) => w.name === wsName);
    if (!ws && wsName) {
      ws = {
        id: cols[idx("workstream_id")] || undefined,
        name: wsName,
        stages: [],
      };
      project.workstreams!.push(ws);
    }
    if (!ws) {
      // Tasks without workstream — create a default one
      ws = { name: "Default", stages: [] };
      project.workstreams!.push(ws);
    }
    if (!ws.stages) ws.stages = [];

    // Find or create stage
    let stage = ws.stages!.find((s) => s.name === (stageName || "General"));
    if (!stage) {
      stage = {
        id: cols[idx("stage_id")] || undefined,
        name: stageName || "General",
        tasks: [],
      };
      ws.stages!.push(stage);
    }
    if (!stage.tasks) stage.tasks = [];

    if (taskTitle) {
      const task: ImportTask = {
        id: cols[idx("task_id")] || undefined,
        title: taskTitle,
        description: cols[idx("description")] || undefined,
        status: cols[idx("status")] || undefined,
        priority: cols[idx("priority")] || undefined,
        size: cols[idx("size")] || undefined,
        scheduled_at: cols[idx("scheduled_at")] || undefined,
        deadline_at: cols[idx("deadline_at")] || undefined,
      };
      stage.tasks!.push(task);
    }

    // Handle milestones from CSV
    const milestoneName = cols[idx("milestone")] || "";
    if (milestoneName && project.milestones) {
      const existing = project.milestones.find((m) => m.title === milestoneName);
      if (!existing) {
        project.milestones.push({ title: milestoneName });
      }
    }
  }

  return Array.from(projectsMap.values());
}

// ─── Preview ──────────────────────────────────────────────────────────

async function previewImport(
  format: string,
  data: string
): Promise<PreviewResult> {
  let projects: ImportProject[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    if (format === "csv") {
      projects = csvToProjects(data);
    } else {
      projects = jsonToProjects(data);
    }
  } catch (err) {
    errors.push(
      `Parse error: ${err instanceof Error ? err.message : "Invalid format"}`
    );
    return {
      projects: [],
      workstreamCount: 0,
      stageCount: 0,
      taskCount: 0,
      milestoneCount: 0,
      subtaskCount: 0,
      dependencyCount: 0,
      warnings,
      errors,
      existingProjects: [],
      workstreamDetails: [],
    };
  }

  if (projects.length === 0) {
    errors.push("No projects found in the file");
    return {
      projects: [],
      workstreamCount: 0,
      stageCount: 0,
      taskCount: 0,
      milestoneCount: 0,
      subtaskCount: 0,
      dependencyCount: 0,
      warnings,
      errors,
      existingProjects: [],
      workstreamDetails: [],
    };
  }

  const db = getDb();
  let workstreamCount = 0;
  let stageCount = 0;
  let taskCount = 0;
  let milestoneCount = 0;
  let subtaskCount = 0;
  let dependencyCount = 0;
  const existingProjects: { id: string; name: string }[] = [];
  const workstreamDetails: { name: string; taskCount: number }[] = [];
  let noStageTasks = 0;

  for (const proj of projects) {
    // Check existing
    const existing = await db.execute({
      sql: "SELECT id, name FROM projects WHERE name = ? OR id = ?",
      args: [proj.name, proj.id || ""],
    });
    if (existing.rows.length > 0) {
      existingProjects.push({
        id: existing.rows[0].id as string,
        name: existing.rows[0].name as string,
      });
      warnings.push(proj.name + " already exists");
    }

    for (const ws of proj.workstreams || []) {
      workstreamCount++;
      let wsTaskCount = 0;

      for (const stage of ws.stages || []) {
        stageCount++;
        const stageTasks = stage.tasks || [];
        wsTaskCount += stageTasks.length;

        for (const task of stageTasks) {
          taskCount++;
          subtaskCount += task.subtasks?.length || 0;
          dependencyCount += task.dependencies?.length || 0;
        }
      }

      // Tasks directly on workstream (no stage)
      const directTasks = ws.tasks || [];
      if (directTasks.length > 0) {
        wsTaskCount += directTasks.length;
        noStageTasks += directTasks.length;
        // These will be auto-placed in "General"
        stageCount++; // General stage will be created
      }

      workstreamDetails.push({ name: ws.name, taskCount: wsTaskCount });
    }

    milestoneCount += proj.milestones?.length || 0;

    // Validate tasks
    for (const ws of proj.workstreams || []) {
      for (const stage of ws.stages || []) {
        for (const task of stage.tasks || []) {
          if (!task.title || task.title.trim().length === 0) {
            warnings.push(
              `Task in "${ws.name}/${stage.name}" has no title and will be skipped`
            );
          }
        }
      }
    }
  }

  if (noStageTasks > 0) {
    warnings.push(
      `${noStageTasks} tasks had no stage and will be placed in General`
    );
  }

  return {
    projects,
    workstreamCount,
    stageCount,
    taskCount,
    milestoneCount,
    subtaskCount,
    dependencyCount,
    warnings,
    errors,
    existingProjects,
    workstreamDetails,
  };
}

// ─── Commit import (atomic) ───────────────────────────────────────────

async function commitImport(
  projects: ImportProject[],
  mode: "merge" | "duplicate"
) {
  const db = getDb();
  const imported: { id: string; name: string; tasks: number }[] = [];

  // Begin transaction
  await db.execute("BEGIN TRANSACTION");

  try {
    for (const proj of projects) {
      const projectId =
        mode === "duplicate"
          ? generateId()
          : proj.id || proj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const now = new Date().toISOString();
      let taskCount = 0;

      // ── Project ──────────────────────────────────────────────
      if (mode === "duplicate") {
        await db.execute({
          sql: `INSERT INTO projects (id, name, description, status, target_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            projectId,
            proj.name,
            proj.description || "",
            normalizeProjectStatus(proj.status),
            proj.target_date || null,
            now,
            now,
          ],
        });
      } else {
        // Merge: check if exists
        const existing = await db.execute({
          sql: "SELECT id FROM projects WHERE id = ?",
          args: [projectId],
        });

        if (existing.rows.length > 0) {
          // Update project metadata
          await db.execute({
            sql: `UPDATE projects SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`,
            args: [
              proj.name,
              proj.description || "",
              normalizeProjectStatus(proj.status),
              now,
              projectId,
            ],
          });
        } else {
          await db.execute({
            sql: `INSERT INTO projects (id, name, description, status, target_date, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              projectId,
              proj.name,
              proj.description || "",
              normalizeProjectStatus(proj.status),
              proj.target_date || null,
              now,
              now,
            ],
          });
        }
      }

      // ── Workstreams ──────────────────────────────────────────
      for (const ws of proj.workstreams || []) {
        const wsId = ensureId(ws.id);

        if (mode === "merge") {
          const existingWs = await db.execute({
            sql: "SELECT id FROM workstreams WHERE id = ?",
            args: [wsId],
          });
          if (existingWs.rows.length === 0) {
            await db.execute({
              sql: `INSERT INTO workstreams (id, project_id, name, description, position)
                    VALUES (?, ?, ?, ?, ?)`,
              args: [wsId, projectId, ws.name, ws.description || "", ws.position ?? 0],
            });
          }
        } else {
          const newWsId = ws.id || generateId();
          await db.execute({
            sql: `INSERT INTO workstreams (id, project_id, name, description, position)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [newWsId, projectId, ws.name, ws.description || "", ws.position ?? 0],
          });
        }

        // ── Stages ──────────────────────────────────────────
        const stagesToProcess = [...(ws.stages || [])];

        // Auto-create "General" for tasks directly on workstream
        if (ws.tasks && ws.tasks.length > 0) {
          const generalStageId = generateId();
          stagesToProcess.push({
            id: generalStageId,
            name: "General",
            position: 0,
            tasks: ws.tasks,
          });
        }

        for (const stage of stagesToProcess) {
          const stageId = ensureId(stage.id);

          if (mode === "merge") {
            const existingStage = await db.execute({
              sql: "SELECT id FROM stages WHERE id = ?",
              args: [stageId],
            });
            if (existingStage.rows.length === 0) {
              await db.execute({
                sql: `INSERT INTO stages (id, workstream_id, name, position)
                      VALUES (?, ?, ?, ?)`,
                args: [stageId, wsId, stage.name, stage.position ?? 0],
              });
            }
          } else {
            const newStageId = stage.id || generateId();
            await db.execute({
              sql: `INSERT INTO stages (id, workstream_id, name, position)
                    VALUES (?, ?, ?, ?)`,
              args: [newStageId, wsId, stage.name, stage.position ?? 0],
            });
          }

          // ── Tasks ──────────────────────────────────────────
          for (const task of stage.tasks || []) {
            if (!task.title || task.title.trim().length === 0) continue;

            const taskId = ensureId(task.id);
            const taskNow = new Date().toISOString();
            const status = normalizeTaskStatus(task.status);
            const priority = normalizePriority(task.priority);
            const size = normalizeSize(task.size);

            if (mode === "merge" && task.id) {
              // Check existing by stable ID
              const existingTask = await db.execute({
                sql: "SELECT id, status, completed_at FROM tasks WHERE id = ?",
                args: [task.id],
              });

              if (existingTask.rows.length > 0) {
                const existingStatus = existingTask.rows[0].status as string;
                // Preserve completed state
                if (existingStatus === "done") {
                  // Don't override done tasks
                  taskCount++;
                  // Still import subtasks
                  await importSubtasks(db, taskId, task.subtasks);
                  continue;
                }
                // Update existing task
                await db.execute({
                  sql: `UPDATE tasks SET title = ?, description = ?, status = ?,
                        priority = ?, size = ?, scheduled_at = ?, deadline_at = ?,
                        workstream_id = ?, stage_id = ?, updated_at = ?
                        WHERE id = ?`,
                  args: [
                    task.title,
                    task.description || "",
                    status,
                    priority,
                    size,
                    task.scheduled_at || null,
                    task.deadline_at || null,
                    wsId,
                    stageId,
                    taskNow,
                    task.id,
                  ],
                });
                taskCount++;
                await importSubtasks(db, task.id, task.subtasks);
                continue;
              }
            }

            // Create new task
            await db.execute({
              sql: `INSERT INTO tasks (id, project_id, workstream_id, stage_id,
                    title, description, status, priority, size, scheduled_at, deadline_at,
                    position, external_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                taskId,
                projectId,
                wsId,
                stageId,
                task.title,
                task.description || "",
                status,
                priority,
                size,
                task.scheduled_at || null,
                task.deadline_at || null,
                task.position ?? 0,
                task.id || null,
                taskNow,
                taskNow,
              ],
            });
            taskCount++;

            // Import subtasks
            await importSubtasks(db, taskId, task.subtasks);

            // Import dependencies
            if (task.dependencies && task.dependencies.length > 0) {
              for (const depId of task.dependencies) {
                if (!depId || depId.trim().length === 0) continue;
                await db.execute({
                  sql: `INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id)
                        VALUES (?, ?)`,
                  args: [taskId, depId],
                });
              }
            }
          }
        }
      }

      // ── Milestones ──────────────────────────────────────────
      for (const ms of proj.milestones || []) {
        const msId = ensureId(ms.id);
        if (mode === "merge") {
          const existingMs = await db.execute({
            sql: "SELECT id FROM milestones WHERE id = ?",
            args: [msId],
          });
          if (existingMs.rows.length === 0) {
            await db.execute({
              sql: `INSERT INTO milestones (id, project_id, title, status, target_date, position)
                    VALUES (?, ?, ?, ?, ?, ?)`,
              args: [
                msId,
                projectId,
                ms.title,
                normalizeMilestoneStatus(ms.status),
                ms.target_date || null,
                ms.position ?? 0,
              ],
            });
          }
        } else {
          const newMsId = ms.id || generateId();
          await db.execute({
            sql: `INSERT INTO milestones (id, project_id, title, status, target_date, position)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              newMsId,
              projectId,
              ms.title,
              normalizeMilestoneStatus(ms.status),
              ms.target_date || null,
              ms.position ?? 0,
            ],
          });
        }
      }

      imported.push({ id: projectId, name: proj.name, tasks: taskCount });
    }

    await db.execute("COMMIT");
    return { imported };
  } catch (err) {
    await db.execute("ROLLBACK");
    throw err;
  }
}

async function importSubtasks(
  db: ReturnType<typeof getDb>,
  taskId: string,
  subtasks?: ImportSubtask[]
) {
  if (!subtasks || subtasks.length === 0) return;

  for (const st of subtasks) {
    const stId = ensureId(st.id);
    // Check if exists (in merge mode the parent task may already have subtasks)
    const existing = await db.execute({
      sql: "SELECT id FROM subtasks WHERE id = ?",
      args: [stId],
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO subtasks (id, task_id, title, done, position)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          stId,
          taskId,
          st.title,
          st.status === "done" ? 1 : 0,
          st.position ?? 0,
        ],
      });
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, format, data, mode } = body;

    if (action === "preview") {
      const preview = await previewImport(format, data);
      return NextResponse.json({ success: true, data: preview });
    }

    if (action === "import") {
      const projects =
        format === "csv"
          ? csvToProjects(data)
          : jsonToProjects(data);
      const result = await commitImport(projects, mode || "duplicate");

      // Record import history
      try {
        const db = getDb();
        for (const imp of result.imported) {
          await db.execute({
            sql: `INSERT INTO imports (project_id, filename, format, status, created_at)
                  VALUES (?, ?, ?, 'completed', datetime('now'))`,
            args: [imp.id, body.filename || 'unknown', format || 'json'],
          });
        }
      } catch {
        // Don't fail import if history recording fails
      }

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'preview' or 'import'." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
