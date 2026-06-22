/**
 * Unit tests for session helpers (src/lib/session.ts).
 * jose is ESM-only so we mock it to keep Jest in CJS mode.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SESSION_MAX_AGE = "86400";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

/* ── mock jose ────────────────────────────────────────────────── */
jest.mock("jose", () => {
  const signInstance = {
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mocked.jwt.token"),
  };
  return {
    SignJWT: jest.fn().mockReturnValue(signInstance),
    jwtVerify: jest.fn(),
  };
});

/* ── mock next/headers cookies ───────────────────────────────── */
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

/* ── mock downstream deps ────────────────────────────────────── */
jest.mock("@/lib/auth", () => ({
  getUserById: jest.fn(),
  updateUserPQFields: jest.fn(),
}));

jest.mock("@/lib/vault-crypto", () => ({
  generateMLKEMKeypair: jest.fn(),
  generateMasterKey: jest.fn().mockReturnValue(new Uint8Array(32).fill(0)),
  generateClassicalSecret: jest.fn().mockReturnValue(new Uint8Array(32).fill(0)),
  hybridEncapsulate: jest.fn().mockResolvedValue({
    ciphertext: new Uint8Array(32),
    sharedSecret: new Uint8Array(32),
  }),
  wrapMasterKey: jest.fn().mockResolvedValue({
    wrappedKey: new Uint8Array(64),
    salt: new Uint8Array(16),
  }),
  encryptWithServerSecret: jest.fn().mockResolvedValue({
    ciphertext: "ct",
    iv: "iv",
    authTag: "tag",
  }),
  decryptWithServerSecret: jest.fn(),
  hybridDecapsulate: jest.fn(),
  unwrapMasterKey: jest.fn(),
}));

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifySession,
  deleteSession,
} from "@/lib/session";
import { getUserById } from "@/lib/auth";

const mockCookies = cookies as jest.Mock;
const mockCookiesGet = jest.fn();
const mockCookiesSet = jest.fn();
const mockCookiesDelete = jest.fn();

beforeEach(() => {
  mockCookies.mockResolvedValue({
    get: mockCookiesGet,
    set: mockCookiesSet,
    delete: mockCookiesDelete,
  });
});

const MockSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;
const mockJwtVerify = jwtVerify as jest.Mock;
const mockGetUserById = getUserById as jest.Mock;

/* ── getSessionCookieOptions ────────────────────────────────── */
describe("getSessionCookieOptions", () => {
  it("returns correct cookie options", () => {
    const opts = getSessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.sameSite).toBe("lax");
    expect(typeof opts.maxAge).toBe("number");
    expect(opts.maxAge).toBeGreaterThan(0);
  });

  it("secure is false outside production", () => {
    const opts = getSessionCookieOptions();
    expect(opts.secure).toBe(false);
  });
});

/* ── createSessionToken ─────────────────────────────────────── */
describe("createSessionToken", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls SignJWT with userId payload", async () => {
    await createSessionToken("user:abc");
    expect(MockSignJWT).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user:abc" })
    );
  });

  it("includes base64url-encoded masterKey when provided", async () => {
    const masterKey = new Uint8Array(32).fill(7);
    await createSessionToken("user:xyz", masterKey);
    const payload = MockSignJWT.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof payload.masterKey).toBe("string");
    expect(payload.masterKey as string).not.toMatch(/[+/=]/);
  });

  it("omits masterKey when not provided", async () => {
    await createSessionToken("user:abc");
    const payload = MockSignJWT.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.masterKey).toBeUndefined();
  });

  it("sets HS256 header, iat, and expiration", async () => {
    await createSessionToken("user:abc");
    const inst = MockSignJWT.mock.results[0]?.value;
    expect(inst.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
    expect(inst.setIssuedAt).toHaveBeenCalled();
    expect(inst.setExpirationTime).toHaveBeenCalledWith("86400s");
  });

  it("returns the JWT string", async () => {
    const token = await createSessionToken("user:abc");
    expect(token).toBe("mocked.jwt.token");
  });
});

/* ── verifySession ──────────────────────────────────────────── */
describe("verifySession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when no session cookie exists", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns null when jwtVerify throws", async () => {
    mockCookiesGet.mockReturnValue({ value: "bad.token" });
    mockJwtVerify.mockRejectedValue(new Error("invalid signature"));
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns null when payload has no userId", async () => {
    mockCookiesGet.mockReturnValue({ value: "some.token" });
    mockJwtVerify.mockResolvedValue({ payload: { sub: "nobody" } });
    const result = await verifySession();
    expect(result).toBeNull();
  });

  it("returns userId and masterKey when both are in the JWT payload", async () => {
    const masterKeyBytes = new Uint8Array(32).fill(5);
    const masterKeyB64 = Buffer.from(masterKeyBytes).toString("base64url");

    mockCookiesGet.mockReturnValue({ value: "valid.token" });
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "user:abc", masterKey: masterKeyB64 },
    });

    const result = await verifySession();
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user:abc");
    expect(result?.masterKey).toBeInstanceOf(Uint8Array);
    expect(result?.masterKey?.byteLength).toBe(32);
  });

  it("returns userId without masterKey when masterKey is absent from payload", async () => {
    mockCookiesGet.mockReturnValue({ value: "valid.token" });
    mockJwtVerify.mockResolvedValue({
      payload: { userId: "user:abc" },
    });
    // getUserById is called for legacy sessions — return null to skip PQ resolution
    mockGetUserById.mockResolvedValue(null);

    const result = await verifySession();
    expect(result?.userId).toBe("user:abc");
  });
});

/* ── deleteSession ──────────────────────────────────────────── */
describe("deleteSession", () => {
  it("deletes the session cookie", async () => {
    await deleteSession();
    expect(mockCookiesDelete).toHaveBeenCalledWith("session");
  });
});
