/**
 * Unit tests for client-side AES-256-GCM crypto (src/lib/crypto.ts).
 * Uses Node's built-in WebCrypto (available since Node 19 and globalThis.crypto in Node 20+).
 */

import { generateMasterKey, encryptEntry, decryptEntry } from "@/lib/crypto";

describe("generateMasterKey", () => {
  it("returns a 32-byte Uint8Array", () => {
    const key = generateMasterKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.byteLength).toBe(32);
  });

  it("returns a different key on each call", () => {
    const k1 = generateMasterKey();
    const k2 = generateMasterKey();
    expect(Buffer.from(k1).toString("hex")).not.toBe(
      Buffer.from(k2).toString("hex")
    );
  });
});

describe("encryptEntry / decryptEntry (round-trip)", () => {
  it("encrypts and decrypts plaintext correctly", async () => {
    const masterKey = generateMasterKey();
    const plaintext = "super-secret-password-123";

    const { ciphertext, iv, authTag } = await encryptEntry(plaintext, masterKey);

    expect(typeof ciphertext).toBe("string");
    expect(typeof iv).toBe("string");
    expect(typeof authTag).toBe("string");

    const result = await decryptEntry(ciphertext, iv, authTag, masterKey);
    expect(result).toBe(plaintext);
  });

  it("encrypts JSON payloads correctly", async () => {
    const masterKey = generateMasterKey();
    const payload = JSON.stringify({
      username: "alice",
      password: "hunter2",
      url: "https://example.com",
    });

    const { ciphertext, iv, authTag } = await encryptEntry(payload, masterKey);
    const decrypted = await decryptEntry(ciphertext, iv, authTag, masterKey);
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const masterKey = generateMasterKey();
    const plaintext = "same input";

    const enc1 = await encryptEntry(plaintext, masterKey);
    const enc2 = await encryptEntry(plaintext, masterKey);

    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("uses base64url encoding (no + / = chars)", async () => {
    const masterKey = generateMasterKey();
    const { ciphertext, iv, authTag } = await encryptEntry("test", masterKey);

    for (const val of [ciphertext, iv, authTag]) {
      expect(val).not.toMatch(/[+/=]/);
    }
  });

  it("fails to decrypt with a wrong key", async () => {
    const masterKey = generateMasterKey();
    const wrongKey = generateMasterKey();
    const { ciphertext, iv, authTag } = await encryptEntry("secret", masterKey);

    await expect(
      decryptEntry(ciphertext, iv, authTag, wrongKey)
    ).rejects.toThrow();
  });

  it("fails to decrypt with a tampered ciphertext", async () => {
    const masterKey = generateMasterKey();
    const { ciphertext, iv, authTag } = await encryptEntry("secret", masterKey);

    const tampered = ciphertext.slice(0, -2) + "XX";
    await expect(
      decryptEntry(tampered, iv, authTag, masterKey)
    ).rejects.toThrow();
  });
});
