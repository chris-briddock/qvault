/**
 * Unit tests for src/lib/webauthn.ts.
 * DB-dependent functions (storeChallenge, getChallenge) use a mocked DB.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/db", () => ({
  getDb: jest.fn(),
}));

import { getDb } from "@/lib/db";
import {
  uint8ArrayToBase64url,
  base64urlToUint8Array,
  extractChallengeFromClientData,
  storeChallenge,
  getChallenge,
} from "@/lib/webauthn";

const mockGetDb = getDb as jest.Mock;
const mockQuery = jest.fn();

beforeEach(() => {
  mockGetDb.mockResolvedValue({ query: mockQuery });
});
afterEach(() => jest.clearAllMocks());

/* ── base64url helpers ─────────────────────────────────────────── */
describe("uint8ArrayToBase64url", () => {
  it("encodes bytes to base64url without padding", () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd]);
    const result = uint8ArrayToBase64url(bytes);
    expect(result).not.toMatch(/[+/=]/);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("round-trips through base64urlToUint8Array", () => {
    const original = new Uint8Array([1, 2, 3, 4, 200, 201, 202]);
    const encoded = uint8ArrayToBase64url(original);
    const decoded = base64urlToUint8Array(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});

describe("base64urlToUint8Array", () => {
  it("decodes a known base64url string", () => {
    // "hello" in base64url is "aGVsbG8"
    const result = base64urlToUint8Array("aGVsbG8");
    expect(new TextDecoder().decode(result)).toBe("hello");
  });

  it("handles base64url with - and _ (not + and /)", () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe]);
    const encoded = uint8ArrayToBase64url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    const decoded = base64urlToUint8Array(encoded);
    expect(Array.from(decoded)).toEqual([0xfb, 0xff, 0xfe]);
  });
});

/* ── extractChallengeFromClientData ────────────────────────────── */
describe("extractChallengeFromClientData", () => {
  function encodeClientData(obj: object): string {
    return Buffer.from(JSON.stringify(obj)).toString("base64url");
  }

  it("extracts challenge from valid clientDataJSON", () => {
    const challenge = "abc-123_challenge";
    const encoded = encodeClientData({ type: "webauthn.create", challenge });
    expect(extractChallengeFromClientData(encoded)).toBe(challenge);
  });

  it("returns null when challenge field is missing", () => {
    const encoded = encodeClientData({ type: "webauthn.create" });
    expect(extractChallengeFromClientData(encoded)).toBeNull();
  });

  it("returns null when challenge is not a string", () => {
    const encoded = encodeClientData({ challenge: 12345 });
    expect(extractChallengeFromClientData(encoded)).toBeNull();
  });

  it("returns null for invalid base64url input", () => {
    expect(extractChallengeFromClientData("not-valid-base64url!!@#$")).toBeNull();
  });

  it("returns null for valid base64url but invalid JSON", () => {
    const bad = Buffer.from("{invalid json").toString("base64url");
    expect(extractChallengeFromClientData(bad)).toBeNull();
  });
});

/* ── storeChallenge ────────────────────────────────────────────── */
describe("storeChallenge", () => {
  it("deletes existing and creates a new challenge record", async () => {
    mockQuery.mockResolvedValue([]);
    await storeChallenge("user:1", "challenge-abc", 300000);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockQuery.mock.calls;
    expect(firstCall[0]).toContain("DELETE challenge");
    expect(secondCall[0]).toContain("CREATE challenge");
    expect(secondCall[1]).toMatchObject({ key: "user:1", challenge: "challenge-abc" });
  });

  it("uses default TTL of 300000ms when not provided", async () => {
    mockQuery.mockResolvedValue([]);
    const before = Date.now();
    await storeChallenge("k", "ch");
    const after = Date.now();

    const createCall = mockQuery.mock.calls[1];
    const expiresAt = createCall[1].expiresAt as number;
    expect(expiresAt).toBeGreaterThanOrEqual(before + 300000);
    expect(expiresAt).toBeLessThanOrEqual(after + 300000);
  });
});

/* ── getChallenge ──────────────────────────────────────────────── */
describe("getChallenge", () => {
  it("returns the challenge when found and not expired", async () => {
    mockQuery
      .mockResolvedValueOnce([[{ challenge: "my-challenge", expires_at: Date.now() + 60000 }]])
      .mockResolvedValueOnce([]); // DELETE

    const result = await getChallenge("user:1");
    expect(result).toBe("my-challenge");
  });

  it("returns null and deletes when challenge is expired", async () => {
    mockQuery
      .mockResolvedValueOnce([[{ challenge: "old", expires_at: Date.now() - 1000 }]])
      .mockResolvedValueOnce([]); // DELETE expired

    const result = await getChallenge("user:1");
    expect(result).toBeNull();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("returns null when no challenge found", async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    const result = await getChallenge("missing-key");
    expect(result).toBeNull();
  });
});
