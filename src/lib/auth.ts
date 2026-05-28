import { getDb } from "@/lib/db";
import type { User } from "@/lib/zod";

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = await getDb();
  const result = await db.query<[User[]]>(
    "SELECT * FROM user WHERE username = $username",
    { username }
  );
  const users = result[0];
  return users && users.length > 0 ? users[0] : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const result = await db.query<[User[]]>("SELECT * FROM type::record($id)", { id });
  const users = result[0];
  return users && users.length > 0 ? users[0] : null;
}

export async function createUser(data: {
  username: string;
  credential_id: string;
  public_key: string;
  counter: number;
  mlkem_public_key?: string;
  mlkem_private_key_encrypted?: string;
  mlkem_ciphertext?: string;
  mlkem_salt?: string;
  master_key_wrapped?: string;
  master_key_salt?: string;
}): Promise<User> {
  const db = await getDb();
  const fields: string[] = [
    "username = $username",
    "credential_id = $credential_id",
    "public_key = $public_key",
    "counter = $counter",
  ];
  if (data.mlkem_public_key) fields.push("mlkem_public_key = $mlkem_public_key");
  if (data.mlkem_private_key_encrypted) fields.push("mlkem_private_key_encrypted = $mlkem_private_key_encrypted");
  if (data.mlkem_ciphertext) fields.push("mlkem_ciphertext = $mlkem_ciphertext");
  if (data.mlkem_salt) fields.push("mlkem_salt = $mlkem_salt");
  if (data.master_key_wrapped) fields.push("master_key_wrapped = $master_key_wrapped");
  if (data.master_key_salt) fields.push("master_key_salt = $master_key_salt");

  const result = await db.query<[User[]]>(
    `CREATE user SET ${fields.join(", ")}`,
    data
  );
  return result[0][0];
}

export async function updateUserCounter(
  id: string,
  counter: number
): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE type::record($id) SET counter = $counter", { id, counter });
}

export async function updateUserPQFields(
  id: string,
  data: {
    mlkem_public_key: string;
    mlkem_private_key_encrypted: string;
    mlkem_ciphertext: string;
    mlkem_salt: string;
    master_key_wrapped: string;
    master_key_salt: string;
  }
): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE type::record($id) SET
      mlkem_public_key = $mlkem_public_key,
      mlkem_private_key_encrypted = $mlkem_private_key_encrypted,
      mlkem_ciphertext = $mlkem_ciphertext,
      mlkem_salt = $mlkem_salt,
      master_key_wrapped = $master_key_wrapped,
      master_key_salt = $master_key_salt`,
    { id, ...data }
  );
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  await db.query("DELETE type::record($id)", { id });
}
