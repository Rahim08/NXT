import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "task_id is required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT * FROM subtasks WHERE task_id = ? ORDER BY position",
      args: [taskId],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_id, title } = body;

    if (!task_id || !title) {
      return NextResponse.json(
        { success: false, error: "task_id and title are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();

    const maxPos = await db.execute({
      sql: "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM subtasks WHERE task_id = ?",
      args: [task_id],
    });
    const position = (maxPos.rows[0]?.next_pos as number) ?? 0;

    await db.execute({
      sql: "INSERT INTO subtasks (id, task_id, title, done, position) VALUES (?, ?, ?, 0, ?)",
      args: [id, task_id, title.trim(), position],
    });

    const result = await db.execute({
      sql: "SELECT * FROM subtasks WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}
