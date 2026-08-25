import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

// ─── Canonical JSON export (schema_version 1.0) ─────────────────────

async function exportProjectJSON(projectId?: string) {
  const db = getDb();

  const projectFilter = projectId
    ? { sql: "SELECT * FROM projects WHERE id = ?", args: [projectId] }
    : { sql: "SELECT * FROM projects ORDER BY created_at", args: [] as string[] };

  const projectsResult = await db.execute(projectFilter);
  const allWorkstreams = await db.execute("SELECT * FROM workstreams ORDER BY position");
  const allStages = await db.execute("SELECT * FROM stages ORDER BY position");
  const allTasks = await db.execute("SELECT * FROM tasks ORDER BY position, created_at");
  const allSubtasks = await db.execute("SELECT * FROM subtasks ORDER BY position");
  const allMilestones = await db.execute("SELECT * FROM milestones ORDER BY position");
  const allDeps = await db.execute("SELECT * FROM task_dependencies");

  const projects = projectsResult.rows.map((proj) => {
    const pid = proj.id as string;

    const workstreams = allWorkstreams.rows
      .filter((w) => w.project_id === pid)
      .map((ws) => {
        const wsid = ws.id as string;

        const stages = allStages.rows
          .filter((s) => s.workstream_id === wsid)
          .map((stage) => {
            const sid = stage.id as string;

            const tasks = allTasks.rows
              .filter((t) => t.stage_id === sid)
              .map((t) => {
                const tid = t.id as string;

                const subtasks = allSubtasks.rows
                  .filter((st) => st.task_id === tid)
                  .map((st) => ({
                    id: st.id as string,
                    title: st.title as string,
                    status: st.done ? "done" : "todo",
                    position: st.position as number,
                  }));

                const dependencies = allDeps.rows
                  .filter((d) => d.task_id === tid)
                  .map((d) => d.depends_on_task_id as string);

                return {
                  id: tid,
                  title: t.title as string,
                  description: (t.description as string) || null,
                  status: t.status as string,
                  priority: t.priority as string,
                  size: t.size as string,
                  scheduled_at: t.scheduled_at as string | null,
                  deadline_at: t.deadline_at as string | null,
                  position: t.position as number,
                  subtasks: subtasks.length > 0 ? subtasks : undefined,
                  dependencies: dependencies.length > 0 ? dependencies : undefined,
                };
              });

            return {
              id: sid,
              name: stage.name as string,
              position: stage.position as number,
              tasks,
            };
          });

        return {
          id: wsid,
          name: ws.name as string,
          description: (ws.description as string) || null,
          position: ws.position as number,
          stages,
          ...(unstagedTasksExist(allTasks.rows, wsid)
            ? { tasks: getUnstagedTasks(allTasks.rows, allSubtasks.rows, allDeps.rows, wsid) }
            : {}),
        };
      });

    const milestones = allMilestones.rows
      .filter((m) => m.project_id === pid)
      .map((m) => ({
        id: m.id as string,
        title: m.title as string,
        status: m.status as string,
        target_date: m.target_date as string | null,
        position: m.position as number,
      }));

    return {
      id: pid,
      name: proj.name as string,
      description: (proj.description as string) || "",
      status: proj.status as string,
      target_date: proj.target_date as string | null,
      workstreams,
      milestones: milestones.length > 0 ? milestones : undefined,
    };
  });

  if (projectId && projects.length === 1) {
    return { schema_version: "1.0", project: projects[0] };
  }
  return { schema_version: "1.0", projects };
}

function unstagedTasksExist(
  tasks: Record<string, unknown>[],
  wsId: string
): boolean {
  return tasks.some((t) => t.workstream_id === wsId && !t.stage_id);
}

function getUnstagedTasks(
  allTasks: Record<string, unknown>[],
  allSubtasks: Record<string, unknown>[],
  allDeps: Record<string, unknown>[],
  wsId: string
) {
  return allTasks
    .filter((t) => t.workstream_id === wsId && !t.stage_id)
    .map((t) => {
      const tid = t.id as string;
      const subtasks = allSubtasks
        .filter((st) => st.task_id === tid)
        .map((st) => ({
          id: st.id as string,
          title: st.title as string,
          status: st.done ? "done" : "todo",
        }));
      const dependencies = allDeps
        .filter((d) => d.task_id === tid)
        .map((d) => d.depends_on_task_id as string);
      return {
        id: tid,
        title: t.title as string,
        description: t.description || null,
        status: t.status as string,
        priority: t.priority as string,
        size: t.size as string,
        scheduled_at: t.scheduled_at || null,
        deadline_at: t.deadline_at || null,
        position: t.position as number,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
      };
    });
}

// ─── CSV export ───────────────────────────────────────────────────────

async function exportCSV() {
  const db = getDb();
  const projects = await db.execute("SELECT * FROM projects ORDER BY created_at");
  const workstreams = await db.execute("SELECT * FROM workstreams");
  const stages = await db.execute("SELECT * FROM stages");
  const tasks = await db.execute("SELECT * FROM tasks ORDER BY position");
  const milestones = await db.execute("SELECT * FROM milestones");

  const header =
    "project_id,project,project_description,workstream_id,workstream,stage_id,stage,task_id,task,description,status,priority,size,scheduled_at,deadline_at,milestone";

  const wsMap = new Map(workstreams.rows.map((w) => [w.id as string, w]));
  const stMap = new Map(stages.rows.map((s) => [s.id as string, s]));
  const projMap = new Map(projects.rows.map((p) => [p.id as string, p]));
  const msByProject = new Map<string, string[]>();
  for (const m of milestones.rows) {
    const pid = m.project_id as string;
    if (!msByProject.has(pid)) msByProject.set(pid, []);
    msByProject.get(pid)!.push(m.title as string);
  }

  const rows = [header];

  for (const task of tasks.rows) {
    const pid = task.project_id as string;
    const wid = task.workstream_id as string | null;
    const sid = task.stage_id as string | null;
    const proj = projMap.get(pid);
    const ws = wid ? wsMap.get(wid) : null;
    const stage = sid ? stMap.get(sid) : null;

    const milestoneNames = (msByProject.get(pid) || []).join("; ");

    rows.push(
      [
        pid,
        proj?.name || "",
        proj?.description || "",
        wid || "",
        ws?.name || "",
        sid || "",
        stage?.name || "",
        task.id as string,
        task.title as string,
        task.description || "",
        task.status as string,
        task.priority as string,
        task.size as string,
        task.scheduled_at || "",
        task.deadline_at || "",
        milestoneNames,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
  }

  return rows.join("\n");
}

// ─── Route handler ────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const projectId = searchParams.get("project_id") || undefined;

    if (format === "csv") {
      const csv = await exportCSV();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="next-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON — canonical schema_version 1.0
    const exportData = await exportProjectJSON(projectId);
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="next-export-${new Date().toISOString().split("T")[0]}.project.json"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Export failed" },
      { status: 500 }
    );
  }
}
