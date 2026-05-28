import { getDb } from "@/lib/db";

export async function up(): Promise<void> {
  const db = await getDb();
  // Add post-quantum fields to the user table
  await db.query(`
    DEFINE FIELD mlkem_public_key ON user TYPE option<string>;
    DEFINE FIELD mlkem_private_key_encrypted ON user TYPE option<string>;
    DEFINE FIELD mlkem_ciphertext ON user TYPE option<string>;
    DEFINE FIELD mlkem_salt ON user TYPE option<string>;
    DEFINE FIELD master_key_wrapped ON user TYPE option<string>;
    DEFINE FIELD master_key_salt ON user TYPE option<string>;
  `);
}

export async function down(): Promise<void> {
  const db = await getDb();
  await db.query(`
    REMOVE FIELD mlkem_public_key ON user;
    REMOVE FIELD mlkem_private_key_encrypted ON user;
    REMOVE FIELD mlkem_ciphertext ON user;
    REMOVE FIELD mlkem_salt ON user;
    REMOVE FIELD master_key_wrapped ON user;
    REMOVE FIELD master_key_salt ON user;
  `);
}
