import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "project_id is required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT * FROM workstreams WHERE project_id = ? ORDER BY position",
      args: [projectId],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch workstreams" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, name, description } = body;

    if (!project_id || !name) {
      return NextResponse.json(
        { success: false, error: "project_id and name are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();

    // Get next position
    const maxPos = await db.execute({
      sql: "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM workstreams WHERE project_id = ?",
      args: [project_id],
    });
    const position = (maxPos.rows[0]?.next_pos as number) ?? 0;

    await db.execute({
      sql: "INSERT INTO workstreams (id, project_id, name, description, position) VALUES (?, ?, ?, ?, ?)",
      args: [id, project_id, name.trim(), description ?? "", position],
    });

    const result = await db.execute({
      sql: "SELECT * FROM workstreams WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create workstream" },
      { status: 500 }
    );
  }
}
