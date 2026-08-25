import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

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
      sql: "SELECT * FROM task_dependencies WHERE task_id = ?",
      args: [taskId],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch dependencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_id, depends_on_task_id } = body;

    if (!task_id || !depends_on_task_id) {
      return NextResponse.json(
        { success: false, error: "task_id and depends_on_task_id are required" },
        { status: 400 }
      );
    }

    if (task_id === depends_on_task_id) {
      return NextResponse.json(
        { success: false, error: "A task cannot depend on itself" },
        { status: 400 }
      );
    }

    const db = getDb();

    await db.execute({
      sql: "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)",
      args: [task_id, depends_on_task_id],
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create dependency" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { task_id, depends_on_task_id } = body;

    if (!task_id || !depends_on_task_id) {
      return NextResponse.json(
        { success: false, error: "task_id and depends_on_task_id are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    await db.execute({
      sql: "DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?",
      args: [task_id, depends_on_task_id],
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete dependency" },
      { status: 500 }
    );
  }
}
