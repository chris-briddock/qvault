import { verifySession } from "@/lib/session";
import { listVaultEntries, createVaultEntry } from "@/lib/vault";
import { VaultEntrySchema } from "@/lib/zod";
import { withApi, jsonResponse, unauthorizedError, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { encryptEntry, decryptEntry } from "@/lib/vault-crypto";

export const GET = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault GET: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const url = new URL(req.url);
  const groupId = url.searchParams.get("group") || undefined;

  const entries = await listVaultEntries(session.userId, groupId);

  // Decrypt entries if master key is available
  if (session.masterKey) {
    const decryptedEntries = await Promise.all(
      entries.map(async (entry) => {
        try {
          const plaintext = await decryptEntry(
            entry.encrypted_data,
            entry.iv,
            entry.auth_tag,
            session.masterKey!
          );
          return { ...entry, decrypted_data: plaintext };
        } catch {
          // Legacy or corrupted entry - return without decrypted_data
          return entry;
        }
      })
    );
    logger.info("Vault entries listed (decrypted)", { requestId: ctx.requestId, userId: session.userId, count: entries.length });
    return jsonResponse(decryptedEntries, 200, ctx.requestId);
  }

  logger.info("Vault entries listed (encrypted)", { requestId: ctx.requestId, userId: session.userId, count: entries.length });
  return jsonResponse(entries, 200, ctx.requestId);
});

export const POST = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault POST: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  if (!session.masterKey) {
    logger.warn("Vault POST: no master key in session", { requestId: ctx.requestId, userId: session.userId });
    return jsonResponse({ error: "Encryption not available. Please re-authenticate." }, 403, ctx.requestId);
  }

  const body = await req.json();
  const { title, username, password, email, phone, url, notes, group_id } = body;

  if (!title || !password) {
    return validationError("Title and password are required", ctx.requestId);
  }

  const plaintext = JSON.stringify({ username, password, email, phone, url, notes });
  const encrypted = await encryptEntry(plaintext, session.masterKey);

  const parse = VaultEntrySchema.omit({ id: true, created_at: true, updated_at: true }).safeParse({
    encrypted_data: encrypted.ciphertext,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
    title,
    user_id: session.userId,
    group_id,
  });

  if (!parse.success) {
    logger.warn("Vault POST: invalid input", { requestId: ctx.requestId, userId: session.userId });
    return validationError("Invalid input", ctx.requestId);
  }

  const entry = await createVaultEntry(parse.data);
  logger.info("Vault entry created", { requestId: ctx.requestId, userId: session.userId, entryId: entry.id });
  return jsonResponse(entry, 201, ctx.requestId);
});
