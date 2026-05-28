import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { verifySession, deleteSession } from "@/lib/session";
import { getChallenge, base64urlToUint8Array } from "@/lib/webauthn";
import { getUserById, deleteUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { withApi, jsonResponse, unauthorizedError, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withApi(async (req, ctx) => {
  const session = await verifySession();
  if (!session) {
    logger.warn("Delete account verify: unauthorized", { requestId: ctx.requestId });
    return unauthorizedError(ctx.requestId);
  }

  const user = await getUserById(session.userId);
  if (!user) {
    logger.warn("Delete account verify: user not found", { requestId: ctx.requestId, userId: session.userId });
    return jsonResponse({ error: "User not found" }, 404, ctx.requestId);
  }

  const body = await req.json();
  const { response } = body;

  if (!response) {
    return validationError("Authentication response is required", ctx.requestId);
  }

  const expectedChallenge = await getChallenge(`delete:${user.id}`);
  if (!expectedChallenge) {
    logger.warn("Delete account verify: challenge expired", { requestId: ctx.requestId, userId: user.id });
    return validationError("Challenge expired or invalid", ctx.requestId);
  }

  const credential = {
    id: user.credential_id,
    publicKey: base64urlToUint8Array(user.public_key),
    counter: user.counter,
  };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
    credential,
  });

  if (!verification.verified) {
    logger.warn("Delete account verify: authentication failed", { requestId: ctx.requestId, userId: user.id });
    return validationError("Passkey verification failed", ctx.requestId);
  }

  await deleteUser(user.id);
  await deleteSession();

  logger.info("User account deleted after passkey confirmation", { requestId: ctx.requestId, userId: user.id });
  return jsonResponse({ success: true }, 200, ctx.requestId);
});
