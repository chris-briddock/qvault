import { verifySession } from "@/lib/session";
import { getVaultGroup, updateVaultGroup, deleteVaultGroup } from "@/lib/vault";
import { VaultGroupSchema } from "@/lib/zod";
import { withApi, jsonResponse, unauthorizedError, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const GET = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault group GET: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const { id } = await ctx.params;
  const group = await getVaultGroup(id, session.userId);

  if (!group) {
    logger.warn("Vault group GET: not found", { requestId: ctx.requestId, userId: session.userId, groupId: id });
    return jsonResponse({ error: "Not found" }, 404, ctx.requestId);
  }

  return jsonResponse(group, 200, ctx.requestId);
});

export const PUT = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault group PUT: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parse = VaultGroupSchema.omit({ id: true, user_id: true, created_at: true }).partial().safeParse(body);

  if (!parse.success) {
    logger.warn("Vault group PUT: invalid input", { requestId: ctx.requestId, userId: session.userId, groupId: id });
    return validationError("Invalid input", ctx.requestId);
  }

  const group = await updateVaultGroup(id, session.userId, parse.data);
  if (!group) {
    logger.warn("Vault group PUT: not found", { requestId: ctx.requestId, userId: session.userId, groupId: id });
    return jsonResponse({ error: "Not found" }, 404, ctx.requestId);
  }

  logger.info("Vault group updated", { requestId: ctx.requestId, userId: session.userId, groupId: id });
  return jsonResponse(group, 200, ctx.requestId);
});

export const DELETE = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault group DELETE: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const { id } = await ctx.params;
  await deleteVaultGroup(id, session.userId);

  logger.info("Vault group deleted", { requestId: ctx.requestId, userId: session.userId, groupId: id });
  return jsonResponse({ success: true }, 200, ctx.requestId);
});
