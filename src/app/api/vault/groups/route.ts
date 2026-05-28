import { verifySession } from "@/lib/session";
import { listVaultGroups, createVaultGroup } from "@/lib/vault";
import { VaultGroupSchema } from "@/lib/zod";
import { withApi, jsonResponse, unauthorizedError, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const GET = withApi(async (_req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault groups GET: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const groups = await listVaultGroups(session.userId);
  logger.info("Vault groups listed", { requestId: ctx.requestId, userId: session.userId, count: groups.length });
  return jsonResponse(groups, 200, ctx.requestId);
});

export const POST = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Vault groups POST: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const body = await req.json();
  const parse = VaultGroupSchema.omit({ id: true, created_at: true }).safeParse({
    ...body,
    user_id: session.userId,
  });

  if (!parse.success) {
    logger.warn("Vault groups POST: invalid input", { requestId: ctx.requestId, userId: session.userId });
    return validationError("Invalid input", ctx.requestId);
  }

  const group = await createVaultGroup(parse.data);
  logger.info("Vault group created", { requestId: ctx.requestId, userId: session.userId, groupId: group.id });
  return jsonResponse(group, 201, ctx.requestId);
});
