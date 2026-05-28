"use client";

export function generateMasterKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return new Uint8Array(buf).buffer;
}

export async function encryptEntry(
  plaintext: string,
  masterKey: Uint8Array
): Promise<{ ciphertext: string; iv: string; authTag: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(masterKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    data
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(-16);
  const ciphertext = encryptedBytes.slice(0, -16);

  return {
    ciphertext: bufferToBase64url(ciphertext),
    iv: bufferToBase64url(iv),
    authTag: bufferToBase64url(authTag),
  };
}

export async function decryptEntry(
  ciphertext: string,
  iv: string,
  authTag: string,
  masterKey: Uint8Array
): Promise<string> {
  const ivBytes = base64urlToBuffer(iv);
  const cipherBytes = base64urlToBuffer(ciphertext);
  const tagBytes = base64urlToBuffer(authTag);

  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes, 0);
  combined.set(tagBytes, cipherBytes.length);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(masterKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBytes) },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

function bufferToBase64url(buffer: Uint8Array): string {
  const base64 = Buffer.from(buffer).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + padding, "base64");
}
