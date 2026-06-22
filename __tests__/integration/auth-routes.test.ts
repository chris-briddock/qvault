/**
 * Integration tests for auth API routes:
 *   POST /api/auth/register-options
 *   POST /api/auth/login-options
 *   POST /api/auth/logout
 *   POST /api/auth/delete-account/options
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";
process.env.WEBAUTHN_RP_ID = "localhost";
process.env.WEBAUTHN_RP_NAME = "QVault";
process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";

jest.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

jest.mock("@/lib/webauthn", () => ({
  storeChallenge: jest.fn().mockResolvedValue(undefined),
  getChallenge: jest.fn(),
  base64urlToUint8Array: jest.fn((s: string) => Buffer.from(s, "base64url")),
  extractChallengeFromClientData: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getUserByUsername: jest.fn(),
  getUserById: jest.fn(),
  createUser: jest.fn(),
  updateUserCounter: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  verifySession: jest.fn(),
  deleteSession: jest.fn().mockResolvedValue(undefined),
  createSessionToken: jest.fn().mockResolvedValue("mock-token"),
  getSessionCookieOptions: jest.fn().mockReturnValue({ httpOnly: true, path: "/" }),
}));

jest.mock("@/lib/vault-crypto", () => ({
  generateMLKEMKeypair: jest.fn(),
  generateMasterKey: jest.fn().mockReturnValue(new Uint8Array(32)),
  generateClassicalSecret: jest.fn().mockReturnValue(new Uint8Array(32)),
  hybridEncapsulate: jest.fn().mockResolvedValue({ ciphertext: new Uint8Array(32), sharedSecret: new Uint8Array(32) }),
  wrapMasterKey: jest.fn().mockResolvedValue({ wrappedKey: new Uint8Array(64), salt: new Uint8Array(16) }),
  encryptWithServerSecret: jest.fn().mockResolvedValue({ ciphertext: "ct", iv: "iv", authTag: "tag" }),
}));

import { POST as registerOptions } from "@/app/api/auth/register-options/route";
import { POST as loginOptions } from "@/app/api/auth/login-options/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as deleteAccountOptions } from "@/app/api/auth/delete-account/options/route";

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { storeChallenge } from "@/lib/webauthn";
import { getUserByUsername, getUserById } from "@/lib/auth";
import { verifySession } from "@/lib/session";

const mockGenerateRegistrationOptions = generateRegistrationOptions as jest.Mock;
const mockGenerateAuthenticationOptions = generateAuthenticationOptions as jest.Mock;
const mockStoreChallenge = storeChallenge as jest.Mock;
const mockGetUserByUsername = getUserByUsername as jest.Mock;
const mockGetUserById = getUserById as jest.Mock;
const mockVerifySession = verifySession as jest.Mock;

function makeReq(url: string, body?: object): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx() {
  return { params: Promise.resolve({} as Record<string, string>) };
}

afterEach(() => jest.clearAllMocks());

/* ── POST /api/auth/register-options ─────────────────────────── */
describe("POST /api/auth/register-options", () => {
  it("returns 400 when username is missing", async () => {
    const res = await registerOptions(makeReq("/api/auth/register-options", {}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when username is not a string", async () => {
    const res = await registerOptions(
      makeReq("/api/auth/register-options", { username: 123 }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with options when username is valid", async () => {
    const fakeOptions = { challenge: "chal-abc", rp: { id: "localhost" } };
    mockGenerateRegistrationOptions.mockResolvedValue(fakeOptions);

    const res = await registerOptions(
      makeReq("/api/auth/register-options", { username: "alice" }),
      makeCtx()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("chal-abc");
    expect(mockStoreChallenge).toHaveBeenCalledWith("chal-abc", "chal-abc", 300000);
  });
});

/* ── POST /api/auth/login-options ────────────────────────────── */
describe("POST /api/auth/login-options", () => {
  it("returns 400 when username is missing", async () => {
    const res = await loginOptions(makeReq("/api/auth/login-options", {}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    const res = await loginOptions(
      makeReq("/api/auth/login-options", { username: "nobody" }),
      makeCtx()
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with options for a known user", async () => {
    const user = {
      id: "user:1",
      username: "alice",
      credential_id: "cred-1",
      public_key: "pub",
      counter: 0,
    };
    mockGetUserByUsername.mockResolvedValue(user);
    const fakeOptions = { challenge: "login-chal", rpId: "localhost" };
    mockGenerateAuthenticationOptions.mockResolvedValue(fakeOptions);

    const res = await loginOptions(
      makeReq("/api/auth/login-options", { username: "alice" }),
      makeCtx()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("login-chal");
    expect(mockStoreChallenge).toHaveBeenCalledWith("user:1", "login-chal", 300000);
  });
});

/* ── POST /api/auth/logout ───────────────────────────────────── */
describe("POST /api/auth/logout", () => {
  it("deletes the session and returns success", async () => {
    const res = await logout(makeReq("/api/auth/logout"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

/* ── POST /api/auth/delete-account/options ───────────────────── */
describe("POST /api/auth/delete-account/options", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await deleteAccountOptions(
      makeReq("/api/auth/delete-account/options"),
      makeCtx()
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found in DB", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue(null);
    const res = await deleteAccountOptions(
      makeReq("/api/auth/delete-account/options"),
      makeCtx()
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with auth options when authenticated", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue({
      id: "user:1",
      credential_id: "cred-1",
      username: "alice",
      public_key: "pub",
      counter: 0,
    });
    const fakeOptions = { challenge: "del-chal", rpId: "localhost" };
    mockGenerateAuthenticationOptions.mockResolvedValue(fakeOptions);

    const res = await deleteAccountOptions(
      makeReq("/api/auth/delete-account/options"),
      makeCtx()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toBe("del-chal");
  });
});
