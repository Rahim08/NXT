import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { generateId } from "@/lib/validate";
import { SIZE_WEIGHTS } from "@/types";
import type { Size } from "@/types";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let sql = "SELECT * FROM projects";
    const args: string[] = [];

    if (status) {
      sql += " WHERE status = ?";
      args.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });

    // Fetch task counts for each project
    const projects = await Promise.all(
      result.rows.map(async (project) => {
        const tasks = await db.execute({
          sql: "SELECT id, status, size FROM tasks WHERE project_id = ?",
          args: [project.id as string],
        });

        const totalTasks = tasks.rows.length;
        const completedTasks = tasks.rows.filter((t) => t.status === "done").length;

        // Weighted progress
        let totalWeight = 0;
        let completedWeight = 0;
        for (const t of tasks.rows) {
          const sizeVal = (t.size as string) || "M";
          const w = SIZE_WEIGHTS[sizeVal as Size] ?? 2;
          totalWeight += w;
          if (t.status === "done") completedWeight += w;
        }
        const weightedPercentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

        // Get workstream count
        const workstreams = await db.execute({
          sql: "SELECT COUNT(*) as count FROM workstreams WHERE project_id = ?",
          args: [project.id as string],
        });

        return {
          ...project,
          task_count: totalTasks,
          completed_task_count: completedTasks,
          weighted_percentage: weightedPercentage,
          workstream_count: (workstreams.rows[0]?.count as number) ?? 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: projects });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, target_date } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO projects (id, name, description, status, target_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name.trim(),
        description ?? "",
        status ?? "active",
        target_date ?? null,
        now,
        now,
      ],
    });

    const result = await db.execute({
      sql: "SELECT * FROM projects WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(
      { success: true, data: result.rows[0] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}
