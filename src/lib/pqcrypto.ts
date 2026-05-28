"use client";

import { MlKem768 } from "mlkem";

const mlKem = new MlKem768();

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return new Uint8Array(buf).buffer;
}

export async function generateMLKEMKeypair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  const [publicKey, privateKey] = await mlKem.generateKeyPair();
  return { publicKey, privateKey };
}

export async function hybridEncapsulate(
  publicKey: Uint8Array,
  classicalSecret: Uint8Array
): Promise<{ ciphertext: Uint8Array; sharedSecret: Uint8Array }> {
  const [cipherText, sharedSecret] = await mlKem.encap(publicKey);
  const hybridSecret = await hkdfSha256(sharedSecret, classicalSecret, 32);
  return {
    ciphertext: cipherText,
    sharedSecret: hybridSecret,
  };
}

export async function hybridDecapsulate(
  ciphertext: Uint8Array,
  privateKey: Uint8Array,
  classicalSecret: Uint8Array
): Promise<Uint8Array> {
  const kemShared = await mlKem.decap(ciphertext, privateKey);
  return hkdfSha256(kemShared, classicalSecret, 32);
}

export async function wrapMasterKey(
  masterKey: Uint8Array,
  sharedSecret: Uint8Array
): Promise<{ wrappedKey: Uint8Array; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await hkdfSha256(sharedSecret, salt, 32);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(wrappingKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(masterKey)
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(-16);
  const ciphertext = encryptedBytes.slice(0, -16);

  const wrappedKey = new Uint8Array(iv.length + ciphertext.length + authTag.length);
  wrappedKey.set(iv, 0);
  wrappedKey.set(ciphertext, iv.length);
  wrappedKey.set(authTag, iv.length + ciphertext.length);

  return { wrappedKey, salt };
}

export async function unwrapMasterKey(
  wrappedKey: Uint8Array,
  salt: Uint8Array,
  sharedSecret: Uint8Array
): Promise<Uint8Array> {
  const wrappingKey = await hkdfSha256(sharedSecret, salt, 32);

  const iv = wrappedKey.slice(0, 12);
  const ciphertext = wrappedKey.slice(12, -16);
  const authTag = wrappedKey.slice(-16);

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(wrappingKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    combined
  );

  return new Uint8Array(decrypted);
}

async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const prk = await crypto.subtle.sign("HMAC", key, toArrayBuffer(ikm));

  const info = new Uint8Array(0);
  const okm = new Uint8Array(length);
  let previous = new Uint8Array(0);
  let offset = 0;
  let counter = 1;

  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  while (offset < length) {
    const data = new Uint8Array(previous.length + info.length + 1);
    data.set(previous, 0);
    data.set(info, previous.length);
    data[data.length - 1] = counter;

    const hash = await crypto.subtle.sign("HMAC", prkKey, data);
    const hashBytes = new Uint8Array(hash);

    const remaining = length - offset;
    const toCopy = Math.min(remaining, hashBytes.length);
    okm.set(hashBytes.slice(0, toCopy), offset);
    offset += toCopy;
    previous = hashBytes;
    counter++;
  }

  return okm;
}
