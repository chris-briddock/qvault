import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/webauthn";
import { getUserByUsername } from "@/lib/auth";
import { env } from "@/lib/env";
import { withApi, jsonResponse, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withApi(async (req, ctx) => {
  const { username } = await req.json();

  if (!username || typeof username !== "string") {
    logger.warn("Login options: missing username", { requestId: ctx.requestId });
    return validationError("Username is required", ctx.requestId);
  }

  const user = await getUserByUsername(username);
  if (!user) {
    logger.warn("Login options: user not found", { requestId: ctx.requestId, username });
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
    userVerification: "preferred",
  });

  await storeChallenge(String(user.id), options.challenge, 300000);
  logger.info("Login options generated", { requestId: ctx.requestId, userId: user.id });

  return jsonResponse(options, 200, ctx.requestId);
});
