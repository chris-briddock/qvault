import { deleteSession } from "@/lib/session";
import { withApi, jsonResponse } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withApi(async (_req, ctx) => {
  await deleteSession();
  logger.info("Session terminated", { requestId: ctx.requestId });
  return jsonResponse({ success: true }, 200, ctx.requestId);
});
