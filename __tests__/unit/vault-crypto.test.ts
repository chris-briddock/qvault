/**
 * Unit tests for server-side post-quantum vault crypto (src/lib/vault-crypto.ts).
 * Tests ML-KEM key generation, hybrid encap/decap, master key wrap/unwrap,
 * and server-secret encryption.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

import {
  generateMLKEMKeypair,
  generateMasterKey,
  generateClassicalSecret,
  hybridEncapsulate,
  hybridDecapsulate,
  wrapMasterKey,
  unwrapMasterKey,
  encryptWithServerSecret,
  decryptWithServerSecret,
  encryptEntry,
  decryptEntry,
} from "@/lib/vault-crypto";

describe("generateMLKEMKeypair", () => {
  it("generates a public and private key", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(privateKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.byteLength).toBeGreaterThan(0);
    expect(privateKey.byteLength).toBeGreaterThan(0);
  });

  it("generates unique keypairs each call", async () => {
    const kp1 = await generateMLKEMKeypair();
    const kp2 = await generateMLKEMKeypair();
    expect(Buffer.from(kp1.publicKey).toString("hex")).not.toBe(
      Buffer.from(kp2.publicKey).toString("hex")
    );
  });
});

describe("generateMasterKey", () => {
  it("returns 32 random bytes", () => {
    const key = generateMasterKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.byteLength).toBe(32);
  });
});

describe("generateClassicalSecret", () => {
  it("returns 32 random bytes", () => {
    const secret = generateClassicalSecret();
    expect(secret).toBeInstanceOf(Uint8Array);
    expect(secret.byteLength).toBe(32);
  });
});

describe("hybridEncapsulate / hybridDecapsulate (round-trip)", () => {
  it("decapsulates to the same shared secret", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    const classicalSecret = generateClassicalSecret();

    const { ciphertext, sharedSecret } = await hybridEncapsulate(
      publicKey,
      classicalSecret
    );

    expect(ciphertext).toBeInstanceOf(Uint8Array);
    expect(sharedSecret).toBeInstanceOf(Uint8Array);
    expect(sharedSecret.byteLength).toBe(32);

    const recovered = await hybridDecapsulate(
      ciphertext,
      privateKey,
      classicalSecret
    );

    expect(Buffer.from(recovered).toString("hex")).toBe(
      Buffer.from(sharedSecret).toString("hex")
    );
  });

  it("produces different shared secrets with different classical secrets", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    const classical1 = generateClassicalSecret();
    const classical2 = generateClassicalSecret();

    const { ciphertext, sharedSecret: ss1 } = await hybridEncapsulate(
      publicKey,
      classical1
    );

    const ss2 = await hybridDecapsulate(ciphertext, privateKey, classical2);

    expect(Buffer.from(ss1).toString("hex")).not.toBe(
      Buffer.from(ss2).toString("hex")
    );
  });
});

describe("wrapMasterKey / unwrapMasterKey (round-trip)", () => {
  it("unwraps to the original master key", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    const classicalSecret = generateClassicalSecret();
    const { ciphertext, sharedSecret } = await hybridEncapsulate(
      publicKey,
      classicalSecret
    );
    const masterKey = generateMasterKey();

    const { wrappedKey, salt } = await wrapMasterKey(masterKey, sharedSecret);

    const recovered = await hybridDecapsulate(
      ciphertext,
      privateKey,
      classicalSecret
    );
    const unwrapped = await unwrapMasterKey(wrappedKey, salt, recovered);

    expect(Buffer.from(unwrapped).toString("hex")).toBe(
      Buffer.from(masterKey).toString("hex")
    );
  });

  it("wrappedKey includes iv + ciphertext + authTag (≥ 12+1+16 bytes)", async () => {
    const sharedSecret = generateMasterKey();
    const masterKey = generateMasterKey();
    const { wrappedKey } = await wrapMasterKey(masterKey, sharedSecret);
    expect(wrappedKey.byteLength).toBeGreaterThan(28);
  });

  it("fails to unwrap with a wrong shared secret", async () => {
    const sharedSecret = generateMasterKey();
    const wrongSecret = generateMasterKey();
    const masterKey = generateMasterKey();
    const { wrappedKey, salt } = await wrapMasterKey(masterKey, sharedSecret);

    await expect(
      unwrapMasterKey(wrappedKey, salt, wrongSecret)
    ).rejects.toThrow();
  });
});

describe("encryptWithServerSecret / decryptWithServerSecret (round-trip)", () => {
  it("encrypts and decrypts bytes correctly", async () => {
    const plaintext = new TextEncoder().encode("server-side secret data");
    const { ciphertext, iv, authTag } = await encryptWithServerSecret(plaintext);

    expect(typeof ciphertext).toBe("string");
    expect(typeof iv).toBe("string");
    expect(typeof authTag).toBe("string");

    const recovered = await decryptWithServerSecret(ciphertext, iv, authTag);
    expect(new TextDecoder().decode(recovered)).toBe(
      new TextDecoder().decode(plaintext)
    );
  });

  it("uses base64url (no + / = chars)", async () => {
    const { ciphertext, iv, authTag } = await encryptWithServerSecret(
      new Uint8Array([1, 2, 3])
    );
    for (const val of [ciphertext, iv, authTag]) {
      expect(val).not.toMatch(/[+/=]/);
    }
  });
});

describe("vault-crypto encryptEntry / decryptEntry (round-trip)", () => {
  it("server-side encrypt/decrypt preserves plaintext", async () => {
    const masterKey = generateMasterKey();
    const plaintext = JSON.stringify({ password: "hunter2" });

    const { ciphertext, iv, authTag } = await encryptEntry(plaintext, masterKey);
    const result = await decryptEntry(ciphertext, iv, authTag, masterKey);

    expect(result).toBe(plaintext);
  });
});
