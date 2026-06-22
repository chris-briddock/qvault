/**
 * Unit tests for src/lib/pqcrypto.ts — client-side PQ crypto.
 * Same algorithm as vault-crypto but the "use client" variant.
 */

import {
  generateMLKEMKeypair,
  hybridEncapsulate,
  hybridDecapsulate,
  wrapMasterKey,
  unwrapMasterKey,
} from "@/lib/pqcrypto";

describe("generateMLKEMKeypair (client)", () => {
  it("returns a public and private key pair", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    expect(publicKey).toBeInstanceOf(Uint8Array);
    expect(privateKey).toBeInstanceOf(Uint8Array);
    expect(publicKey.byteLength).toBeGreaterThan(0);
  });
});

describe("hybridEncapsulate / hybridDecapsulate (client round-trip)", () => {
  it("recovers the same shared secret after decapsulation", async () => {
    const { publicKey, privateKey } = await generateMLKEMKeypair();
    const classical = crypto.getRandomValues(new Uint8Array(32));

    const { ciphertext, sharedSecret } = await hybridEncapsulate(publicKey, classical);
    const recovered = await hybridDecapsulate(ciphertext, privateKey, classical);

    expect(Buffer.from(recovered).toString("hex")).toBe(
      Buffer.from(sharedSecret).toString("hex")
    );
  });
});

describe("wrapMasterKey / unwrapMasterKey (client round-trip)", () => {
  it("unwraps to the original master key", async () => {
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));
    const masterKey = crypto.getRandomValues(new Uint8Array(32));

    const { wrappedKey, salt } = await wrapMasterKey(masterKey, sharedSecret);
    const unwrapped = await unwrapMasterKey(wrappedKey, salt, sharedSecret);

    expect(Buffer.from(unwrapped).toString("hex")).toBe(
      Buffer.from(masterKey).toString("hex")
    );
  });

  it("fails to unwrap with a wrong shared secret", async () => {
    const sharedSecret = crypto.getRandomValues(new Uint8Array(32));
    const wrongSecret = crypto.getRandomValues(new Uint8Array(32));
    const masterKey = crypto.getRandomValues(new Uint8Array(32));

    const { wrappedKey, salt } = await wrapMasterKey(masterKey, sharedSecret);
    await expect(unwrapMasterKey(wrappedKey, salt, wrongSecret)).rejects.toThrow();
  });
});
