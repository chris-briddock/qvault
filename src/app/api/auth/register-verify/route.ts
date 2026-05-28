import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getChallenge, extractChallengeFromClientData } from "@/lib/webauthn";
import { getUserByUsername, createUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { withApi, jsonResponse, validationError } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import {
  generateMLKEMKeypair,
  generateMasterKey,
  generateClassicalSecret,
  hybridEncapsulate,
  wrapMasterKey,
  encryptWithServerSecret,
} from "@/lib/vault-crypto";

export const POST = withApi(async (req, ctx) => {
  const body = await req.json();
  const { username, response } = body;

  if (!username || !response) {
    logger.warn("Register verify: invalid request body", { requestId: ctx.requestId });
    return validationError("Invalid request", ctx.requestId);
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    logger.warn("Register verify: username taken", { requestId: ctx.requestId, username });
    return jsonResponse({ error: "Username already taken" }, 409, ctx.requestId);
  }

  const challengeKey = extractChallengeFromClientData(response.response.clientDataJSON);
  if (!challengeKey) {
    logger.warn("Register verify: could not extract challenge from clientDataJSON", { requestId: ctx.requestId, username });
    return validationError("Invalid challenge data", ctx.requestId);
  }

  const expectedChallenge = await getChallenge(challengeKey);
  if (!expectedChallenge) {
    logger.warn("Register verify: challenge expired", { requestId: ctx.requestId, username, challengeKey });
    return validationError("Challenge expired or invalid", ctx.requestId);
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    logger.warn("Register verify: verification failed", { requestId: ctx.requestId, username });
    return validationError("Registration verification failed", ctx.requestId);
  }

  const { credential } = verification.registrationInfo;

  // Generate post-quantum ML-KEM keypair
  const { publicKey: mlkemPublicKey, privateKey: mlkemPrivateKey } = await generateMLKEMKeypair();

  // Generate a random master key for vault encryption
  const masterKey = generateMasterKey();

  // Generate a classical secret for hybrid encapsulation
  const classicalSecret = generateClassicalSecret();

  // Encapsulate: create a shared secret using the ML-KEM public key + classical secret
  const { ciphertext: mlkemCiphertext, sharedSecret } = await hybridEncapsulate(
    mlkemPublicKey,
    classicalSecret
  );

  // Wrap the master key with the shared secret
  const { wrappedKey: masterKeyWrapped, salt: masterKeySalt } = await wrapMasterKey(
    masterKey,
    sharedSecret
  );

  // Encrypt the ML-KEM private key with the server secret
  const mlkemPrivateKeyEncrypted = await encryptWithServerSecret(mlkemPrivateKey);

  const user = await createUser({
    username,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    mlkem_public_key: Buffer.from(mlkemPublicKey).toString("base64url"),
    mlkem_private_key_encrypted: JSON.stringify(mlkemPrivateKeyEncrypted),
    mlkem_ciphertext: Buffer.from(mlkemCiphertext).toString("base64url"),
    mlkem_salt: Buffer.from(classicalSecret).toString("base64url"),
    master_key_wrapped: Buffer.from(masterKeyWrapped).toString("base64url"),
    master_key_salt: Buffer.from(masterKeySalt).toString("base64url"),
  });

  logger.info("Register verify: user created with PQ keys", { requestId: ctx.requestId, userId: user.id, username });
  return jsonResponse({ success: true, userId: user.id }, 200, ctx.requestId);
});
