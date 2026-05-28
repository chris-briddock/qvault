import { getDb } from "../src/lib/db";

export async function up(): Promise<void> {
  const db = await getDb();

  // Namespace and Database
  await db.query("USE NS qvault DB qvault");

  // User table
  await db.query("DEFINE TABLE IF NOT EXISTS user SCHEMAFULL");
  await db.query("DEFINE FIELD IF NOT EXISTS username ON user TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS credential_id ON user TYPE string");
  await db.query("DEFINE FIELD IF NOT EXISTS public_key ON user TYPE string");
  await db.query("DEFINE FIELD IF NOT EXISTS counter ON user TYPE int DEFAULT 0");
  await db.query("DEFINE FIELD IF NOT EXISTS created_at ON user TYPE datetime DEFAULT time::now()");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_username ON user COLUMNS username UNIQUE");

  // Vault Entry table
  await db.query("DEFINE TABLE IF NOT EXISTS vault_entry SCHEMAFULL");
  await db.query("DEFINE FIELD IF NOT EXISTS user_id ON vault_entry TYPE record<user> ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS encrypted_data ON vault_entry TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS iv ON vault_entry TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS auth_tag ON vault_entry TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS title ON vault_entry TYPE string");
  await db.query("DEFINE FIELD IF NOT EXISTS created_at ON vault_entry TYPE datetime DEFAULT time::now()");
  await db.query("DEFINE FIELD IF NOT EXISTS updated_at ON vault_entry TYPE datetime DEFAULT time::now()");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_user_id ON vault_entry COLUMNS user_id");

  // Session table
  await db.query("DEFINE TABLE IF NOT EXISTS session SCHEMAFULL");
  await db.query("DEFINE FIELD IF NOT EXISTS user_id ON session TYPE record<user> ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS expires_at ON session TYPE datetime ASSERT $value != NONE");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_session_expiry ON session COLUMNS expires_at");

  // Audit log table
  await db.query("DEFINE TABLE IF NOT EXISTS audit_log SCHEMAFULL");
  await db.query("DEFINE FIELD IF NOT EXISTS user_id ON audit_log TYPE record<user>");
  await db.query("DEFINE FIELD IF NOT EXISTS action ON audit_log TYPE string ASSERT $value != NONE");
  await db.query("DEFINE FIELD IF NOT EXISTS resource ON audit_log TYPE string");
  await db.query("DEFINE FIELD IF NOT EXISTS details ON audit_log TYPE object");
  await db.query("DEFINE FIELD IF NOT EXISTS created_at ON audit_log TYPE datetime DEFAULT time::now()");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_audit_user ON audit_log COLUMNS user_id");
  await db.query("DEFINE INDEX IF NOT EXISTS idx_audit_created ON audit_log COLUMNS created_at");
}

export async function down(): Promise<void> {
  const db = await getDb();

  await db.query("REMOVE TABLE IF EXISTS audit_log");
  await db.query("REMOVE TABLE IF EXISTS session");
  await db.query("REMOVE TABLE IF EXISTS vault_entry");
  await db.query("REMOVE TABLE IF EXISTS user");
}
