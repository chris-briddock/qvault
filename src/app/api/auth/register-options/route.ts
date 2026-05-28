import { generateRegistrationOptions } from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/webauthn";
import { env } from "@/lib/env";
import { withApi, jsonResponse, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withApi(async (req, ctx) => {
  const { username } = await req.json();

  if (!username || typeof username !== "string") {
    logger.warn("Register options: missing username", { requestId: ctx.requestId });
    return validationError("Username is required", ctx.requestId);
  }

  const options = await generateRegistrationOptions({
    rpName: env.WEBAUTHN_RP_NAME,
    rpID: env.WEBAUTHN_RP_ID,
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store challenge keyed by the challenge itself so verify can look it up
  // from the clientDataJSON response
  await storeChallenge(options.challenge, options.challenge, 300000);
  logger.info("Register options generated", { requestId: ctx.requestId, username });

  return jsonResponse(options, 200, ctx.requestId);
});
