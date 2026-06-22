/**
 * Unit tests for src/lib/auth.ts — all functions use a mocked DB.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/db", () => ({
  getDb: jest.fn(),
}));

import { getDb } from "@/lib/db";
import {
  getUserByUsername,
  getUserById,
  createUser,
  updateUserCounter,
  updateUserPQFields,
  deleteUser,
} from "@/lib/auth";

const mockGetDb = getDb as jest.Mock;
const mockQuery = jest.fn();

beforeEach(() => {
  mockGetDb.mockResolvedValue({ query: mockQuery });
});

const MOCK_USER = {
  id: "user:abc",
  username: "alice",
  credential_id: "cred-123",
  public_key: "pub-key-base64",
  counter: 0,
};

afterEach(() => jest.clearAllMocks());

describe("getUserByUsername", () => {
  it("returns the user when found", async () => {
    mockQuery.mockResolvedValue([[MOCK_USER]]);
    const result = await getUserByUsername("alice");
    expect(result).toEqual(MOCK_USER);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("username = $username"),
      { username: "alice" }
    );
  });

  it("returns null when no user found", async () => {
    mockQuery.mockResolvedValue([[]]);
    const result = await getUserByUsername("nobody");
    expect(result).toBeNull();
  });
});

describe("getUserById", () => {
  it("returns the user when found", async () => {
    mockQuery.mockResolvedValue([[MOCK_USER]]);
    const result = await getUserById("user:abc");
    expect(result).toEqual(MOCK_USER);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("type::record"),
      { id: "user:abc" }
    );
  });

  it("returns null when not found", async () => {
    mockQuery.mockResolvedValue([[]]);
    expect(await getUserById("user:missing")).toBeNull();
  });
});

describe("createUser", () => {
  it("creates a user and returns the record", async () => {
    mockQuery.mockResolvedValue([[MOCK_USER]]);
    const result = await createUser({
      username: "alice",
      credential_id: "cred-123",
      public_key: "pub-key-base64",
      counter: 0,
    });
    expect(result).toEqual(MOCK_USER);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CREATE user SET"),
      expect.objectContaining({ username: "alice" })
    );
  });

  it("includes optional PQ fields in the query when provided", async () => {
    mockQuery.mockResolvedValue([[MOCK_USER]]);
    await createUser({
      username: "bob",
      credential_id: "cred-456",
      public_key: "pub",
      counter: 0,
      mlkem_public_key: "mlkem-pub",
      mlkem_ciphertext: "ct",
    });
    const query = mockQuery.mock.calls[0][0] as string;
    expect(query).toContain("mlkem_public_key");
    expect(query).toContain("mlkem_ciphertext");
  });

  it("omits PQ fields from query when not provided", async () => {
    mockQuery.mockResolvedValue([[MOCK_USER]]);
    await createUser({
      username: "bob",
      credential_id: "cred",
      public_key: "pub",
      counter: 0,
    });
    const query = mockQuery.mock.calls[0][0] as string;
    expect(query).not.toContain("mlkem_public_key");
  });
});

describe("updateUserCounter", () => {
  it("calls query with the new counter value", async () => {
    mockQuery.mockResolvedValue([]);
    await updateUserCounter("user:abc", 42);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("counter = $counter"),
      { id: "user:abc", counter: 42 }
    );
  });
});

describe("updateUserPQFields", () => {
  it("calls query with all PQ fields", async () => {
    mockQuery.mockResolvedValue([]);
    const fields = {
      mlkem_public_key: "pub",
      mlkem_private_key_encrypted: "enc",
      mlkem_ciphertext: "ct",
      mlkem_salt: "salt",
      master_key_wrapped: "wk",
      master_key_salt: "wks",
    };
    await updateUserPQFields("user:abc", fields);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("mlkem_public_key"),
      expect.objectContaining({ id: "user:abc", ...fields })
    );
  });
});

describe("deleteUser", () => {
  it("calls DELETE query with the user id", async () => {
    mockQuery.mockResolvedValue([]);
    await deleteUser("user:abc");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE"),
      { id: "user:abc" }
    );
  });
});
