import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
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

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
  path: string;
}

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.SESSION_MAX_AGE,
    path: "/",
  };
}

export async function createSessionToken(userId: string, masterKey?: Uint8Array): Promise<string> {
  const payload: Record<string, unknown> = { userId };
  if (masterKey) {
    payload.masterKey = Buffer.from(masterKey).toString("base64url");
  }
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_MAX_AGE}s`)
    .sign(secret);

  return token;
}

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

async function resolveMasterKey(userId: string): Promise<Uint8Array | undefined> {
  const user = await getUserById(userId);
  if (!user) return undefined;

  const hasPQFields =
    user.mlkem_private_key_encrypted &&
    user.mlkem_ciphertext &&
    user.mlkem_salt &&
    user.master_key_wrapped &&
    user.master_key_salt;

  if (hasPQFields) {
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
      return await unwrapMasterKey(masterKeyWrapped, masterKeySalt, sharedSecret);
    } catch (e) {
      logger.error("Failed to unwrap master key", {}, e instanceof Error ? e : new Error(String(e)));
      return undefined;
    }
  }

  // Legacy user: generate PQ keys on-the-fly
  return await generateAndStorePQKeys(userId);
}

export async function verifySession(): Promise<{ userId: string; masterKey?: Uint8Array } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60,
    });
    if (payload.userId && typeof payload.userId === "string") {
      const userId = payload.userId;
      let masterKey: Uint8Array | undefined;

      if (payload.masterKey && typeof payload.masterKey === "string") {
        const padding = payload.masterKey.length % 4 === 0 ? "" : "=".repeat(4 - (payload.masterKey.length % 4));
        masterKey = Buffer.from(payload.masterKey.replace(/-/g, "+").replace(/_/g, "/") + padding, "base64");
      } else {
        // Legacy session: resolve master key from DB and re-issue cookie
        masterKey = await resolveMasterKey(userId);
        if (masterKey) {
          const newToken = await createSessionToken(userId, masterKey);
          cookieStore.set("session", newToken, getSessionCookieOptions());
        }
      }

      return { userId, masterKey };
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
