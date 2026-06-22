/**
 * Integration tests for src/app/actions/auth.ts — setSessionCookie server action.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getUserById: jest.fn(),
  updateUserPQFields: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/session", () => ({
  createSessionToken: jest.fn().mockResolvedValue("mock-session-token"),
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
  encryptWithServerSecret: jest.fn().mockResolvedValue({ ciphertext: "ct", iv: "iv", authTag: "tag" }),
  decryptWithServerSecret: jest.fn().mockResolvedValue(new Uint8Array(64)),
  hybridDecapsulate: jest.fn().mockResolvedValue(new Uint8Array(32)),
  unwrapMasterKey: jest.fn().mockResolvedValue(new Uint8Array(32)),
}));

import { cookies } from "next/headers";
import { setSessionCookie } from "@/app/actions/auth";
import { getUserById } from "@/lib/auth";
import { createSessionToken } from "@/lib/session";

const mockCookies = cookies as jest.Mock;
const mockCookiesSet = jest.fn();
const mockGetUserById = getUserById as jest.Mock;
const mockCreateSessionToken = createSessionToken as jest.Mock;

beforeEach(() => {
  mockCookies.mockResolvedValue({ set: mockCookiesSet });
});
afterEach(() => jest.clearAllMocks());

describe("setSessionCookie", () => {
  it("returns error when user not found", async () => {
    mockGetUserById.mockResolvedValue(null);
    const result = await setSessionCookie("user:missing");
    expect(result.success).toBe(false);
    expect(result.error).toContain("User not found");
  });

  it("sets session cookie for a user with existing PQ fields", async () => {
    mockGetUserById.mockResolvedValue({
      id: "user:1",
      username: "alice",
      mlkem_private_key_encrypted: JSON.stringify({ ciphertext: "ct", iv: "iv", authTag: "tag" }),
      mlkem_ciphertext: Buffer.from(new Uint8Array(32)).toString("base64url"),
      mlkem_salt: Buffer.from(new Uint8Array(32)).toString("base64url"),
      master_key_wrapped: Buffer.from(new Uint8Array(64)).toString("base64url"),
      master_key_salt: Buffer.from(new Uint8Array(16)).toString("base64url"),
    });

    const result = await setSessionCookie("user:1");

    expect(result.success).toBe(true);
    expect(mockCreateSessionToken).toHaveBeenCalledWith("user:1", expect.any(Uint8Array));
    expect(mockCookiesSet).toHaveBeenCalledWith(
      "session",
      "mock-session-token",
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("generates new PQ keys for a legacy user (no PQ fields)", async () => {
    mockGetUserById.mockResolvedValue({
      id: "user:legacy",
      username: "legacy-user",
      // No PQ fields
    });

    const result = await setSessionCookie("user:legacy");

    expect(result.success).toBe(true);
    expect(mockCookiesSet).toHaveBeenCalledWith(
      "session",
      "mock-session-token",
      expect.any(Object)
    );
  });

  it("returns error when an exception is thrown", async () => {
    mockGetUserById.mockRejectedValue(new Error("DB unavailable"));
    const result = await setSessionCookie("user:1");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
