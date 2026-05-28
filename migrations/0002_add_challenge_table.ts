import { getDb } from "../src/lib/db";

export async function up(): Promise<void> {
  const db = await getDb();

  await db.query("DEFINE TABLE IF NOT EXISTS challenge SCHEMAFULL");
  await db.query("DEFINE FIELD IF NOT EXISTS key ON challenge TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS challenge ON challenge TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS expires_at ON challenge TYPE int ASSERT $value != NONE");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_challenge_key ON challenge COLUMNS key UNIQUE");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_challenge_expiry ON challenge COLUMNS expires_at");
}

export async function down(): Promise<void> {
  const db = await getDb();

  await db.query("REMOVE TABLE IF EXISTS challenge");
}
