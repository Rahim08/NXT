import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const workstreamId = searchParams.get("workstream_id");

    if (!workstreamId) {
      return NextResponse.json(
        { success: false, error: "workstream_id is required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: "SELECT * FROM stages WHERE workstream_id = ? ORDER BY position",
      args: [workstreamId],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workstream_id, name } = body;

    if (!workstream_id || !name) {
      return NextResponse.json(
        { success: false, error: "workstream_id and name are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();

    const maxPos = await db.execute({
      sql: "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM stages WHERE workstream_id = ?",
      args: [workstream_id],
    });
    const position = (maxPos.rows[0]?.next_pos as number) ?? 0;

    await db.execute({
      sql: "INSERT INTO stages (id, workstream_id, name, position) VALUES (?, ?, ?, ?)",
      args: [id, workstream_id, name.trim(), position],
    });

    const result = await db.execute({
      sql: "SELECT * FROM stages WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create stage" },
      { status: 500 }
    );
  }
}
