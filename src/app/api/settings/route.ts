import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export async function GET() {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM settings WHERE id = 'default'",
      args: [],
    });

    if (result.rows.length === 0) {
      // Create default settings
      await db.execute({
        sql: "INSERT INTO settings (id, language, appearance) VALUES ('default', 'en', 'system')",
        args: [],
      });
      return NextResponse.json({
        success: true,
        data: { id: "default", language: "en", appearance: "system" },
      });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const args: string[] = [];

    if (body.language && ["en", "ru"].includes(body.language)) {
      updates.push("language = ?");
      args.push(body.language);
    }

    if (body.appearance && ["light", "dark", "system"].includes(body.appearance)) {
      updates.push("appearance = ?");
      args.push(body.appearance);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `UPDATE settings SET ${updates.join(", ")} WHERE id = 'default'`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM settings WHERE id = 'default'",
      args: [],
    });

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
