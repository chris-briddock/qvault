"use server";

import { cookies } from "next/headers";
import { createSessionToken, getSessionCookieOptions } from "@/lib/session";
import { getUserById, updateUserPQFields } from "@/lib/auth";
import {
  generateMLKEMKeypair,
  generateMasterKey,
  generateClassicalSecret,
  hybridEncapsulate,
  wrapMasterKey,
  encryptWithServerSecret,
  decryptWithServerSecret,
  hybridDecapsulate,
  unwrapMasterKey,
} from "@/lib/vault-crypto";
import { logger } from "@/lib/logger";

async function generateAndStorePQKeys(userId: string): Promise<Uint8Array> {
  const { publicKey: mlkemPublicKey, privateKey: mlkemPrivateKey } = await generateMLKEMKeypair();
  const masterKey = generateMasterKey();
  const classicalSecret = generateClassicalSecret();

  const { ciphertext: mlkemCiphertext, sharedSecret } = await hybridEncapsulate(
    mlkemPublicKey,
    classicalSecret
  );

  const { wrappedKey: masterKeyWrapped, salt: masterKeySalt } = await wrapMasterKey(
    masterKey,
    sharedSecret
  );

  const mlkemPrivateKeyEncrypted = await encryptWithServerSecret(mlkemPrivateKey);

  await updateUserPQFields(userId, {
    mlkem_public_key: Buffer.from(mlkemPublicKey).toString("base64url"),
    mlkem_private_key_encrypted: JSON.stringify(mlkemPrivateKeyEncrypted),
    mlkem_ciphertext: Buffer.from(mlkemCiphertext).toString("base64url"),
    mlkem_salt: Buffer.from(classicalSecret).toString("base64url"),
    master_key_wrapped: Buffer.from(masterKeyWrapped).toString("base64url"),
    master_key_salt: Buffer.from(masterKeySalt).toString("base64url"),
  });

  logger.info("Generated and stored PQ keys for legacy user", { userId });
  return masterKey;
}

export async function setSessionCookie(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    let masterKey: Uint8Array | undefined;

    const hasPQFields =
      user.mlkem_private_key_encrypted &&
      user.mlkem_ciphertext &&
      user.mlkem_salt &&
      user.master_key_wrapped &&
      user.master_key_salt;

    if (hasPQFields) {
      // Unwrap existing master key
      try {
        const mlkemPrivateKeyEncrypted = JSON.parse(user.mlkem_private_key_encrypted!);
        const mlkemPrivateKey = await decryptWithServerSecret(
          mlkemPrivateKeyEncrypted.ciphertext,
          mlkemPrivateKeyEncrypted.iv,
          mlkemPrivateKeyEncrypted.authTag
        );

        const mlkemCiphertext = Buffer.from(user.mlkem_ciphertext!, "base64url");
        const classicalSecret = Buffer.from(user.mlkem_salt!, "base64url");
        const sharedSecret = await hybridDecapsulate(mlkemCiphertext, mlkemPrivateKey, classicalSecret);

        const masterKeyWrapped = Buffer.from(user.master_key_wrapped!, "base64url");
        const masterKeySalt = Buffer.from(user.master_key_salt!, "base64url");
        masterKey = await unwrapMasterKey(masterKeyWrapped, masterKeySalt, sharedSecret);
      } catch (e) {
        logger.error("Failed to unwrap master key", {}, e instanceof Error ? e : new Error(String(e)));
      }
    } else {
      // Legacy user: generate PQ keys on-the-fly and store them
      masterKey = await generateAndStorePQKeys(userId);
    }

    const token = await createSessionToken(userId, masterKey);
    const cookieStore = await cookies();
    const opts = getSessionCookieOptions();
    cookieStore.set("session", token, opts);

    return { success: true };
  } catch (error) {
    logger.error("setSessionCookie failed", {}, error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: "Failed to create session" };
  }
}
