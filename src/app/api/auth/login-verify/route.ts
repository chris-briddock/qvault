import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getChallenge, base64urlToUint8Array } from "@/lib/webauthn";
import { getUserByUsername, updateUserCounter } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const body = await req.json();
    const { username, response } = body;

    if (!username || !response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expectedChallenge = await getChallenge(user.id);
    if (!expectedChallenge) {
      return NextResponse.json({ error: "Challenge expired or invalid" }, { status: 400 });
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
      return NextResponse.json({ error: "Authentication verification failed" }, { status: 400 });
    }

    await updateUserCounter(user.id, verification.authenticationInfo.newCounter);

    logger.info("Login verify: authentication successful", { requestId, userId: user.id });
    // Return userId so client can call Server Action to set cookie
    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    const message = process.env.NODE_ENV === "production" ? "Internal server error" : (error instanceof Error ? error.message : "Unknown error");
    logger.error("Login verify: request failed", { requestId }, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
};
