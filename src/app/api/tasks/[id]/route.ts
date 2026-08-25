import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Fetch subtasks
    const subtasks = await db.execute({
      sql: "SELECT * FROM subtasks WHERE task_id = ? ORDER BY position",
      args: [id],
    });

    // Fetch dependencies
    const deps = await db.execute({
      sql: "SELECT * FROM task_dependencies WHERE task_id = ?",
      args: [id],
    });

    // Fetch dependency task titles for display
    const depIds = deps.rows.map((d) => d.depends_on_task_id as string);
    let depTasks: Record<string, string>[] = [];
    if (depIds.length > 0) {
      const placeholders = depIds.map(() => "?").join(",");
      const depResult = await db.execute({
        sql: `SELECT id, title, status FROM tasks WHERE id IN (${placeholders})`,
        args: depIds,
      });
      depTasks = depResult.rows as Record<string, string>[];
    }

    // Also fetch tasks that depend on THIS task
    const reverseDeps = await db.execute({
      sql: "SELECT * FROM task_dependencies WHERE depends_on_task_id = ?",
      args: [id],
    });
    const reverseDepIds = reverseDeps.rows.map((d) => d.task_id as string);
    let reverseDepTasks: Record<string, string>[] = [];
    if (reverseDepIds.length > 0) {
      const placeholders = reverseDepIds.map(() => "?").join(",");
      const result = await db.execute({
        sql: `SELECT id, title, status FROM tasks WHERE id IN (${placeholders})`,
        args: reverseDepIds,
      });
      reverseDepTasks = result.rows as Record<string, string>[];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        subtasks: subtasks.rows,
        dependencies: depTasks.map((t) => ({
          id: t.id as string,
          title: t.title as string,
          status: t.status as string,
        })),
        dependent_tasks: reverseDepTasks.map((t) => ({
          id: t.id as string,
          title: t.title as string,
          status: t.status as string,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    // Check if task exists
    const existing = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "title", "description", "status", "priority", "size",
      "scheduled_at", "deadline_at", "position", "workstream_id", "stage_id",
      "notes",
    ];

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        args.push(body[field] ?? null);
      }
    }

    // Handle completion
    if (body.status === "done") {
      updates.push("completed_at = ?");
      args.push(new Date().toISOString());
    } else if ("status" in body && body.status !== "done") {
      updates.push("completed_at = NULL");
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await db.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
