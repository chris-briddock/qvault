import { getDb } from "@/lib/db";

export async function up(): Promise<void> {
  const db = await getDb();
  // Create vault_group table
  await db.query(`
    DEFINE TABLE vault_group SCHEMAFULL;
    DEFINE FIELD user_id ON vault_group TYPE record<user>;
    DEFINE FIELD name ON vault_group TYPE string ASSERT $value != NONE;
    DEFINE FIELD color ON vault_group TYPE option<string>;
    DEFINE FIELD created_at ON vault_group TYPE option<datetime> DEFAULT time::now();
  `);

  // Add group_id to vault_entry
  await db.query(`
    DEFINE FIELD group_id ON vault_entry TYPE option<record<vault_group>>;
  `);
}

export async function down(): Promise<void> {
  const db = await getDb();
  await db.query(`
    REMOVE FIELD group_id ON vault_entry;
    REMOVE TABLE vault_group;
  `);
}
