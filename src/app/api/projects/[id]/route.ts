import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const project = await db.execute({
      sql: "SELECT * FROM projects WHERE id = ?",
      args: [id],
    });

    if (project.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Fetch workstreams with stages and tasks
    const workstreams = await db.execute({
      sql: "SELECT * FROM workstreams WHERE project_id = ? ORDER BY position",
      args: [id],
    });

    const stages = await db.execute({
      sql: `SELECT s.* FROM stages s 
            JOIN workstreams w ON s.workstream_id = w.id 
            WHERE w.project_id = ? ORDER BY s.position`,
      args: [id],
    });

    const tasks = await db.execute({
      sql: "SELECT * FROM tasks WHERE project_id = ? ORDER BY position, created_at",
      args: [id],
    });

    const milestones = await db.execute({
      sql: "SELECT * FROM milestones WHERE project_id = ? ORDER BY position",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      data: {
        ...project.rows[0],
        workstreams: workstreams.rows,
        stages: stages.rows,
        tasks: tasks.rows,
        milestones: milestones.rows,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
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

    const allowedFields = ["name", "description", "status", "target_date"];
    const updates: string[] = [];
    const args: (string | null)[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        args.push(body[field] ?? null);
      }
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
      sql: `UPDATE projects SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM projects WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
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

    // Delete project and cascade (tasks, workstreams, stages, milestones, subtasks)
    await db.execute({ sql: "DELETE FROM projects WHERE id = ?", args: [id] });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
