import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { SIZE_WEIGHTS } from "@/types";
import type { Size } from "@/types";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const workstreamId = searchParams.get("workstream_id");
    const stageId = searchParams.get("stage_id");

    let sql = "SELECT id, project_id, workstream_id, stage_id, status, size FROM tasks WHERE 1=1";
    const args: string[] = [];

    if (projectId) {
      sql += " AND project_id = ?";
      args.push(projectId);
    }
    if (workstreamId) {
      sql += " AND workstream_id = ?";
      args.push(workstreamId);
    }
    if (stageId) {
      sql += " AND stage_id = ?";
      args.push(stageId);
    }

    const result = await db.execute({ sql, args });

    let totalWeight = 0;
    let completedWeight = 0;

    for (const row of result.rows) {
      const sizeVal = (row.size as string) || "M";
      const w = SIZE_WEIGHTS[sizeVal as Size] ?? 2;
      totalWeight += w;
      if (row.status === "done") completedWeight += w;
    }

    const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        total_weight: totalWeight,
        completed_weight: completedWeight,
        percentage,
        task_count: result.rows.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to compute progress" },
      { status: 500 }
    );
  }
}
