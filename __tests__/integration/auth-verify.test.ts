/**
 * Integration tests for auth verification routes:
 *   POST /api/auth/register-verify
 *   POST /api/auth/login-verify
 *   POST /api/auth/delete-account/verify
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";
process.env.WEBAUTHN_RP_ID = "localhost";
process.env.WEBAUTHN_RP_NAME = "QVault";
process.env.WEBAUTHN_ORIGIN = "http://localhost:3000";

jest.mock("@simplewebauthn/server", () => ({
  verifyRegistrationResponse: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

jest.mock("@/lib/webauthn", () => ({
  getChallenge: jest.fn(),
  base64urlToUint8Array: jest.fn((s: string) => Buffer.from(s, "base64url")),
  extractChallengeFromClientData: jest.fn(),
  storeChallenge: jest.fn(),
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
  generateMLKEMKeypair: jest.fn().mockResolvedValue({
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(64),
  }),
  generateMasterKey: jest.fn().mockReturnValue(new Uint8Array(32)),
  generateClassicalSecret: jest.fn().mockReturnValue(new Uint8Array(32)),
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
}));

import { POST as registerVerify } from "@/app/api/auth/register-verify/route";
import { POST as loginVerify } from "@/app/api/auth/login-verify/route";
import { POST as deleteAccountVerify } from "@/app/api/auth/delete-account/verify/route";

import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  getChallenge,
  extractChallengeFromClientData,
} from "@/lib/webauthn";
import {
  getUserByUsername,
  getUserById,
  createUser,
  updateUserCounter,
  deleteUser,
} from "@/lib/auth";
import { verifySession, deleteSession } from "@/lib/session";

const mockVerifyRegistration = verifyRegistrationResponse as jest.Mock;
const mockVerifyAuthentication = verifyAuthenticationResponse as jest.Mock;
const mockGetChallenge = getChallenge as jest.Mock;
const mockExtractChallenge = extractChallengeFromClientData as jest.Mock;
const mockGetUserByUsername = getUserByUsername as jest.Mock;
const mockGetUserById = getUserById as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockUpdateUserCounter = updateUserCounter as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;
const mockVerifySession = verifySession as jest.Mock;
const mockDeleteSession = deleteSession as jest.Mock;

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

/* ── POST /api/auth/register-verify ─────────────────────────── */
describe("POST /api/auth/register-verify", () => {
  it("returns 400 when username or response is missing", async () => {
    const res = await registerVerify(
      makeReq("/api/auth/register-verify", { username: "alice" }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when username already exists", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "user:1", username: "alice" });
    const res = await registerVerify(
      makeReq("/api/auth/register-verify", {
        username: "alice",
        response: { response: { clientDataJSON: "abc" } },
      }),
      makeCtx()
    );
    expect(res.status).toBe(409);
  });

  it("returns 400 when challenge cannot be extracted", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    mockExtractChallenge.mockReturnValue(null);
    const res = await registerVerify(
      makeReq("/api/auth/register-verify", {
        username: "alice",
        response: { response: { clientDataJSON: "bad" } },
      }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when challenge not found / expired", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    mockExtractChallenge.mockReturnValue("chal-key");
    mockGetChallenge.mockResolvedValue(null);
    const res = await registerVerify(
      makeReq("/api/auth/register-verify", {
        username: "alice",
        response: { response: { clientDataJSON: "ok" } },
      }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when verification fails", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    mockExtractChallenge.mockReturnValue("chal");
    mockGetChallenge.mockResolvedValue("expected-chal");
    mockVerifyRegistration.mockResolvedValue({ verified: false });
    const res = await registerVerify(
      makeReq("/api/auth/register-verify", {
        username: "alice",
        response: { response: { clientDataJSON: "ok" } },
      }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("creates user and returns 200 on success", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    mockExtractChallenge.mockReturnValue("chal");
    mockGetChallenge.mockResolvedValue("expected-chal");
    mockVerifyRegistration.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: "cred-1", publicKey: new Uint8Array([1, 2, 3]), counter: 0 },
      },
    });
    mockCreateUser.mockResolvedValue({ id: "user:new", username: "alice" });

    const res = await registerVerify(
      makeReq("/api/auth/register-verify", {
        username: "alice",
        response: { response: { clientDataJSON: "ok" } },
      }),
      makeCtx()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("user:new");
  });
});

/* ── POST /api/auth/login-verify ─────────────────────────────── */
describe("POST /api/auth/login-verify", () => {
  it("returns 400 when username or response is missing", async () => {
    const res = await loginVerify(makeReq("/api/auth/login-verify", { username: "alice" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockGetUserByUsername.mockResolvedValue(null);
    const res = await loginVerify(
      makeReq("/api/auth/login-verify", { username: "ghost", response: {} })
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when challenge expired", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    mockGetChallenge.mockResolvedValue(null);
    const res = await loginVerify(
      makeReq("/api/auth/login-verify", { username: "alice", response: {} })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when authentication verification fails", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    mockGetChallenge.mockResolvedValue("chal");
    mockVerifyAuthentication.mockResolvedValue({ verified: false });
    const res = await loginVerify(
      makeReq("/api/auth/login-verify", { username: "alice", response: {} })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with userId on success", async () => {
    mockGetUserByUsername.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    mockGetChallenge.mockResolvedValue("chal");
    mockVerifyAuthentication.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    const res = await loginVerify(
      makeReq("/api/auth/login-verify", { username: "alice", response: {} })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe("user:1");
    expect(mockUpdateUserCounter).toHaveBeenCalledWith("user:1", 1);
  });
});

/* ── POST /api/auth/delete-account/verify ────────────────────── */
describe("POST /api/auth/delete-account/verify", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await deleteAccountVerify(
      makeReq("/api/auth/delete-account/verify", { response: {} }),
      makeCtx()
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found in DB", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue(null);
    const res = await deleteAccountVerify(
      makeReq("/api/auth/delete-account/verify", { response: {} }),
      makeCtx()
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when response body is missing", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    const res = await deleteAccountVerify(
      makeReq("/api/auth/delete-account/verify", {}),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when challenge is expired", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    mockGetChallenge.mockResolvedValue(null);
    const res = await deleteAccountVerify(
      makeReq("/api/auth/delete-account/verify", { response: {} }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("deletes the user and session on success", async () => {
    mockVerifySession.mockResolvedValue({ userId: "user:1" });
    mockGetUserById.mockResolvedValue({ id: "user:1", credential_id: "cred", public_key: "pub", counter: 0 });
    mockGetChallenge.mockResolvedValue("del-chal");
    mockVerifyAuthentication.mockResolvedValue({ verified: true });

    const res = await deleteAccountVerify(
      makeReq("/api/auth/delete-account/verify", { response: {} }),
      makeCtx()
    );
    expect(res.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith("user:1");
    expect(mockDeleteSession).toHaveBeenCalled();
  });
});
