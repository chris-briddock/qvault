import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

function bufferToBase64URLString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  const base64 = Buffer.from(str, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64URLStringToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const str = Buffer.from(base64 + padding, "base64").toString("binary");
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

export function uint8ArrayToBase64url(buf: Uint8Array): string {
  return bufferToBase64URLString(buf.buffer as ArrayBuffer);
}

export function base64urlToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(base64URLStringToBuffer(str)).slice() as Uint8Array<ArrayBuffer>;
}

/** Extract the challenge from a WebAuthn clientDataJSON response */
export function extractChallengeFromClientData(clientDataJSON: string): string | null {
  try {
    const json = Buffer.from(clientDataJSON, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    return typeof parsed.challenge === "string" ? parsed.challenge : null;
  } catch {
    return null;
  }
}

/** Store a challenge in the database. expires_at is a raw millisecond timestamp. */
export async function storeChallenge(key: string, challenge: string, ttlMs = 300000): Promise<void> {
  const db = await getDb();
  const expiresAt = Date.now() + ttlMs;
  const keyStr = String(key);

  // Remove any existing challenge for this key, then create a fresh one
  await db.query("DELETE challenge WHERE key = $key", { key: keyStr });
  await db.query(
    "CREATE challenge SET key = <string>$key, challenge = $challenge, expires_at = $expiresAt",
    { key: keyStr, challenge, expiresAt }
  );

  logger.debug("Challenge stored", { key: keyStr, challenge: challenge.slice(0, 20) + "...", expiresAt });
}

/** Retrieve and delete a challenge from the database */
export async function getChallenge(key: string): Promise<string | null> {
  const db = await getDb();
  const keyStr = String(key);
  const result = await db.query<[{ challenge: string; expires_at: number }[]]>(
    "SELECT challenge, expires_at FROM challenge WHERE key = <string>$key",
    { key: keyStr }
  );
  const entries = result[0];
  if (!entries || entries.length === 0) {
    logger.debug("Challenge not found in DB", { key });
    return null;
  }

  const entry = entries[0];
  logger.debug("Challenge found in DB", { key: keyStr, expires_at: entry.expires_at, now: Date.now() });

  if (Date.now() > entry.expires_at) {
    logger.debug("Challenge expired", { key: keyStr, expires_at: entry.expires_at, now: Date.now() });
    await db.query("DELETE challenge WHERE key = <string>$key", { key: keyStr });
    return null;
  }

  await db.query("DELETE challenge WHERE key = <string>$key", { key: keyStr });
  return entry.challenge;
}
