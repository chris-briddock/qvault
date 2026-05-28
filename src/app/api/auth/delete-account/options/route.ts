import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { verifySession } from "@/lib/session";
import { storeChallenge } from "@/lib/webauthn";
import { getUserById } from "@/lib/auth";
import { env } from "@/lib/env";
import { withApi, jsonResponse, unauthorizedError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withApi(async (_req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Delete account options: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const user = await getUserById(session.userId);
  if (!user) {
    logger.warn("Delete account options: user not found", { requestId: ctx.requestId, userId: session.userId });
    return jsonResponse({ error: "User not found" }, 404, ctx.requestId);
  }

  const options = await generateAuthenticationOptions({
    rpID: env.WEBAUTHN_RP_ID,
    allowCredentials: [
      {
        id: user.credential_id,
        transports: [],
      },
    ],
    userVerification: "required",
    challenge: undefined,
  });

  await storeChallenge(`delete:${user.id}`, options.challenge, 300000);
  logger.info("Delete account options generated", { requestId: ctx.requestId, userId: user.id });

  return jsonResponse(options, 200, ctx.requestId);
});
