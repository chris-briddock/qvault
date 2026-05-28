import { getDb } from "@/lib/db";
import type { VaultEntry, VaultGroup } from "@/lib/zod";

export async function listVaultEntries(userId: string, groupId?: string): Promise<VaultEntry[]> {
  const db = await getDb();
  let query = "SELECT * FROM vault_entry WHERE user_id = type::record($userId)";
  const params: Record<string, string> = { userId };

  if (groupId) {
    query += " AND group_id = type::record($groupId)";
    params.groupId = groupId;
  }

  query += " ORDER BY created_at DESC";

  const result = await db.query<[VaultEntry[]]>(query, params);
  return result[0] || [];
}

export async function getVaultEntry(id: string, userId: string): Promise<VaultEntry | null> {
  const db = await getDb();
  const result = await db.query<[VaultEntry[]]>(
    "SELECT * FROM vault_entry WHERE id = type::record($id) AND user_id = type::record($userId)",
    { id, userId }
  );
  const entries = result[0];
  return entries && entries.length > 0 ? entries[0] : null;
}

export async function createVaultEntry(data: {
  user_id: string;
  group_id?: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  title?: string;
}): Promise<VaultEntry> {
  const db = await getDb();

  const fields: string[] = [
    "user_id = type::record($user_id)",
    "encrypted_data = $encrypted_data",
    "iv = $iv",
    "auth_tag = $auth_tag",
  ];

  if (data.group_id) fields.push("group_id = type::record($group_id)");
  if (data.title) fields.push("title = $title");

  const result = await db.query<[VaultEntry[]]>(
    `CREATE vault_entry SET ${fields.join(", ")}`,
    data
  );
  return result[0][0];
}

export async function updateVaultEntry(
  id: string,
  userId: string,
  data: {
    encrypted_data: string;
    iv: string;
    auth_tag: string;
    title?: string;
    group_id?: string;
  }
): Promise<VaultEntry | null> {
  const db = await getDb();

  const fields: string[] = [
    "encrypted_data = $encrypted_data",
    "iv = $iv",
    "auth_tag = $auth_tag",
    "updated_at = time::now()",
  ];

  if (data.title) fields.push("title = $title");
  if (data.group_id) fields.push("group_id = type::record($group_id)");
  else fields.push("group_id = NONE");

  const result = await db.query<[VaultEntry[]]>(
    `UPDATE vault_entry SET ${fields.join(", ")} WHERE id = type::record($id) AND user_id = type::record($userId)`,
    { ...data, id, userId }
  );
  const entries = result[0];
  return entries && entries.length > 0 ? entries[0] : null;
}

export async function deleteVaultEntry(id: string, userId: string): Promise<boolean> {
  const db = await getDb();
  await db.query(
    "DELETE vault_entry WHERE id = type::record($id) AND user_id = type::record($userId)",
    { id, userId }
  );
  return true;
}

// Vault Group CRUD

export async function listVaultGroups(userId: string): Promise<VaultGroup[]> {
  const db = await getDb();
  const result = await db.query<[VaultGroup[]]>(
    "SELECT * FROM vault_group WHERE user_id = type::record($userId) ORDER BY name ASC",
    { userId }
  );
  return result[0] || [];
}

export async function getVaultGroup(id: string, userId: string): Promise<VaultGroup | null> {
  const db = await getDb();
  const result = await db.query<[VaultGroup[]]>(
    "SELECT * FROM vault_group WHERE id = type::record($id) AND user_id = type::record($userId)",
    { id, userId }
  );
  const groups = result[0];
  return groups && groups.length > 0 ? groups[0] : null;
}

export async function createVaultGroup(data: {
  user_id: string;
  name: string;
  color?: string;
}): Promise<VaultGroup> {
  const db = await getDb();
  const result = await db.query<[VaultGroup[]]>(
    "CREATE vault_group SET user_id = type::record($user_id), name = $name, color = $color",
    data
  );
  return result[0][0];
}

export async function updateVaultGroup(
  id: string,
  userId: string,
  data: { name?: string; color?: string }
): Promise<VaultGroup | null> {
  const db = await getDb();
  const fields: string[] = [];
  if (data.name !== undefined) fields.push("name = $name");
  if (data.color !== undefined) fields.push("color = $color");

  if (fields.length === 0) return getVaultGroup(id, userId);

  const result = await db.query<[VaultGroup[]]>(
    `UPDATE vault_group SET ${fields.join(", ")} WHERE id = type::record($id) AND user_id = type::record($userId)`,
    { ...data, id, userId }
  );
  const groups = result[0];
  return groups && groups.length > 0 ? groups[0] : null;
}

export async function deleteVaultGroup(id: string, userId: string): Promise<boolean> {
  const db = await getDb();
  // Unlink entries from this group first
  await db.query(
    "UPDATE vault_entry SET group_id = NONE WHERE group_id = type::record($id) AND user_id = type::record($userId)",
    { id, userId }
  );
  await db.query(
    "DELETE vault_group WHERE id = type::record($id) AND user_id = type::record($userId)",
    { id, userId }
  );
  return true;
}
