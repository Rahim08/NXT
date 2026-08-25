import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if ("title" in body) {
      updates.push("title = ?");
      args.push(body.title);
    }
    if ("done" in body) {
      updates.push("done = ?");
      args.push(body.done ? 1 : 0);
    }
    if ("position" in body) {
      updates.push("position = ?");
      args.push(body.position);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    args.push(id);
    await db.execute({
      sql: `UPDATE subtasks SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM subtasks WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update subtask" },
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
    await db.execute({ sql: "DELETE FROM subtasks WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
