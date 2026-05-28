import { verifySession } from "@/lib/session";
import { getVaultEntry, updateVaultEntry, deleteVaultEntry } from "@/lib/vault";
import { VaultEntrySchema } from "@/lib/zod";
import { withApi, jsonResponse, unauthorizedError, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { encryptEntry, decryptEntry } from "@/lib/vault-crypto";

export const GET = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault entry GET: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const { id } = await ctx.params;
  const entry = await getVaultEntry(id, session.userId);

  if (!entry) {
    logger.warn("Vault entry GET: not found", { requestId: ctx.requestId, userId: session.userId, entryId: id });
    return jsonResponse({ error: "Not found" }, 404, ctx.requestId);
  }

  // Decrypt entry if master key is available
  if (session.masterKey) {
    try {
      const plaintext = await decryptEntry(
        entry.encrypted_data,
        entry.iv,
        entry.auth_tag,
        session.masterKey
      );
      return jsonResponse({ ...entry, decrypted_data: plaintext }, 200, ctx.requestId);
    } catch {
      // Legacy or corrupted entry
      return jsonResponse(entry, 200, ctx.requestId);
    }
  }

  return jsonResponse(entry, 200, ctx.requestId);
});

export const PUT = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault entry PUT: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  if (!session.masterKey) {
    logger.warn("Vault entry PUT: no master key in session", { requestId: ctx.requestId, userId: session.userId });
    return jsonResponse({ error: "Encryption not available. Please re-authenticate." }, 403, ctx.requestId);
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const { title, username, password, email, phone, url, notes, group_id } = body;

  if (!title || !password) {
    return validationError("Title and password are required", ctx.requestId);
  }

  const plaintext = JSON.stringify({ username, password, email, phone, url, notes });
  const encrypted = await encryptEntry(plaintext, session.masterKey);

  const parse = VaultEntrySchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).safeParse({
    encrypted_data: encrypted.ciphertext,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
    title,
    group_id,
  });

  if (!parse.success) {
    logger.warn("Vault entry PUT: invalid input", { requestId: ctx.requestId, userId: session.userId, entryId: id });
    return validationError("Invalid input", ctx.requestId);
  }

  const entry = await updateVaultEntry(id, session.userId, parse.data);
  if (!entry) {
    logger.warn("Vault entry PUT: not found", { requestId: ctx.requestId, userId: session.userId, entryId: id });
    return jsonResponse({ error: "Not found" }, 404, ctx.requestId);
  }

  logger.info("Vault entry updated", { requestId: ctx.requestId, userId: session.userId, entryId: id });
  return jsonResponse(entry, 200, ctx.requestId);
});

export const DELETE = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault entry DELETE: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const { id } = await ctx.params;
  await deleteVaultEntry(id, session.userId);

  logger.info("Vault entry deleted", { requestId: ctx.requestId, userId: session.userId, entryId: id });
  return jsonResponse({ success: true }, 200, ctx.requestId);
});
