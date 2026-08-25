import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const status = searchParams.get("status");
    const scheduled = searchParams.get("scheduled");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    let sql = "SELECT * FROM tasks WHERE 1=1";
    const args: (string | number)[] = [];

    if (projectId) {
      sql += " AND project_id = ?";
      args.push(projectId);
    }
    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }
    if (scheduled === "today") {
      sql += " AND date(scheduled_at) = date('now')";
    }

    sql += " ORDER BY position ASC, created_at DESC LIMIT ?";
    args.push(limit);

    const result = await db.execute({ sql, args });
    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, project_id, workstream_id, stage_id, priority, size } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO tasks (id, project_id, title, status, priority, size, workstream_id, stage_id, created_at, updated_at)
            VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        project_id ?? "inbox",
        title.trim(),
        priority ?? "medium",
        size ?? "M",
        workstream_id ?? null,
        stage_id ?? null,
        now,
        now,
      ],
    });

    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}
