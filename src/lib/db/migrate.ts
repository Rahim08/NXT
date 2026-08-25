import { getDb } from "./client";
import { SCHEMA_SQL } from "./schema";

async function migrate() {
  console.log("Running NEXT database migrations...");
  const db = getDb();

  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (err) {
      console.error(`Migration error on statement: ${stmt.slice(0, 80)}...`);
      throw err;
    }
  }

  // Ensure default settings row exists
  await db.execute({
    sql: "INSERT OR IGNORE INTO settings (id, language, appearance) VALUES ('default', 'en', 'system')",
    args: [],
  });

  // Add notes column to tasks if missing (schema evolution)
  try {
    await db.execute({
      sql: "ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''",
      args: [],
    });
  } catch {
    // Column already exists — safe to ignore
  }

  console.log("Migrations complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
