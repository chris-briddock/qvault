/**
 * Integration tests for the vault API routes.
 * Mocks session verification and DB operations so no live infra is required.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/session", () => ({
  verifySession: jest.fn(),
}));

jest.mock("@/lib/vault", () => ({
  listVaultEntries: jest.fn(),
  createVaultEntry: jest.fn(),
  getVaultEntry: jest.fn(),
  updateVaultEntry: jest.fn(),
  deleteVaultEntry: jest.fn(),
}));

import { GET as vaultGET, POST as vaultPOST } from "@/app/api/vault/route";
import {
  GET as entryGET,
  PUT as entryPUT,
  DELETE as entryDELETE,
} from "@/app/api/vault/[id]/route";
import { verifySession } from "@/lib/session";
import {
  listVaultEntries,
  createVaultEntry,
  getVaultEntry,
  updateVaultEntry,
  deleteVaultEntry,
} from "@/lib/vault";

const mockVerifySession = verifySession as jest.Mock;
const mockListVaultEntries = listVaultEntries as jest.Mock;
const mockCreateVaultEntry = createVaultEntry as jest.Mock;
const mockGetVaultEntry = getVaultEntry as jest.Mock;
const mockUpdateVaultEntry = updateVaultEntry as jest.Mock;
const mockDeleteVaultEntry = deleteVaultEntry as jest.Mock;

const MASTER_KEY = new Uint8Array(32).fill(1);
const USER_ID = "user:test123";

function makeReq(
  url: string,
  method: string,
  body?: object
): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

afterEach(() => jest.clearAllMocks());

/* ── GET /api/vault ─────────────────────────────────────────────── */
describe("GET /api/vault", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await vaultGET(makeReq("/api/vault", "GET"), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns encrypted entries when session has no masterKey", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const entry = {
      id: "vault_entry:1",
      user_id: USER_ID,
      encrypted_data: "enc",
      iv: "iv",
      auth_tag: "tag",
      title: "Bank",
    };
    mockListVaultEntries.mockResolvedValue([entry]);

    const res = await vaultGET(makeReq("/api/vault", "GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("vault_entry:1");
    expect(body[0].decrypted_data).toBeUndefined();
  });

  it("passes group query parameter to listVaultEntries", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockListVaultEntries.mockResolvedValue([]);

    await vaultGET(
      makeReq("/api/vault?group=vault_group:1", "GET"),
      makeCtx()
    );
    expect(mockListVaultEntries).toHaveBeenCalledWith(USER_ID, "vault_group:1");
  });
});

/* ── POST /api/vault ────────────────────────────────────────────── */
describe("POST /api/vault", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await vaultPOST(
      makeReq("/api/vault", "POST", { title: "Bank", password: "pass" }),
      makeCtx()
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when session has no masterKey", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const res = await vaultPOST(
      makeReq("/api/vault", "POST", { title: "Bank", password: "pass" }),
      makeCtx()
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    const res = await vaultPOST(
      makeReq("/api/vault", "POST", { password: "pass" }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    const res = await vaultPOST(
      makeReq("/api/vault", "POST", { title: "Bank" }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("creates and returns an entry with status 201", async () => {
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    const created = {
      id: "vault_entry:99",
      user_id: USER_ID,
      encrypted_data: "enc",
      iv: "iv",
      auth_tag: "tag",
      title: "Bank",
    };
    mockCreateVaultEntry.mockResolvedValue(created);

    const res = await vaultPOST(
      makeReq("/api/vault", "POST", {
        title: "Bank",
        password: "hunter2",
        username: "alice",
      }),
      makeCtx()
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("vault_entry:99");
  });
});

/* ── GET /api/vault/[id] ────────────────────────────────────────── */
describe("GET /api/vault/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await entryGET(
      makeReq("/api/vault/vault_entry:1", "GET"),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockGetVaultEntry.mockResolvedValue(null);

    const res = await entryGET(
      makeReq("/api/vault/vault_entry:99", "GET"),
      makeCtx({ id: "vault_entry:99" })
    );
    expect(res.status).toBe(404);
  });

  it("returns the entry when found", async () => {
    const entry = {
      id: "vault_entry:1",
      user_id: USER_ID,
      encrypted_data: "enc",
      iv: "iv",
      auth_tag: "tag",
      title: "Bank",
    };
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockGetVaultEntry.mockResolvedValue(entry);

    const res = await entryGET(
      makeReq("/api/vault/vault_entry:1", "GET"),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("vault_entry:1");
  });
});

/* ── PUT /api/vault/[id] ────────────────────────────────────────── */
describe("PUT /api/vault/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await entryPUT(
      makeReq("/api/vault/vault_entry:1", "PUT", {
        title: "Bank",
        password: "new",
      }),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when session has no masterKey", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const res = await entryPUT(
      makeReq("/api/vault/vault_entry:1", "PUT", {
        title: "Bank",
        password: "new",
      }),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    const res = await entryPUT(
      makeReq("/api/vault/vault_entry:1", "PUT", { password: "new" }),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when entry is not found", async () => {
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    mockUpdateVaultEntry.mockResolvedValue(null);

    const res = await entryPUT(
      makeReq("/api/vault/vault_entry:99", "PUT", {
        title: "Bank",
        password: "new",
      }),
      makeCtx({ id: "vault_entry:99" })
    );
    expect(res.status).toBe(404);
  });

  it("updates and returns the entry", async () => {
    const updated = {
      id: "vault_entry:1",
      user_id: USER_ID,
      encrypted_data: "new-enc",
      iv: "new-iv",
      auth_tag: "new-tag",
      title: "Bank Updated",
    };
    mockVerifySession.mockResolvedValue({
      userId: USER_ID,
      masterKey: MASTER_KEY,
    });
    mockUpdateVaultEntry.mockResolvedValue(updated);

    const res = await entryPUT(
      makeReq("/api/vault/vault_entry:1", "PUT", {
        title: "Bank Updated",
        password: "new-password",
      }),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Bank Updated");
  });
});

/* ── DELETE /api/vault/[id] ─────────────────────────────────────── */
describe("DELETE /api/vault/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await entryDELETE(
      makeReq("/api/vault/vault_entry:1", "DELETE"),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(401);
  });

  it("deletes and returns success", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockDeleteVaultEntry.mockResolvedValue(true);

    const res = await entryDELETE(
      makeReq("/api/vault/vault_entry:1", "DELETE"),
      makeCtx({ id: "vault_entry:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

/* ── Decryption paths (GET /api/vault and GET /api/vault/[id]) ── */
describe("Decryption paths with masterKey in session", () => {
  it("GET /api/vault returns decrypted_data when masterKey is present", async () => {
    // Create a real encrypted entry so the route can decrypt it
    const { encryptEntry } = await import("@/lib/vault-crypto");
    const plaintext = JSON.stringify({ password: "s3cr3t" });
    const encrypted = await encryptEntry(plaintext, MASTER_KEY);

    const entry = {
      id: "vault_entry:10",
      user_id: USER_ID,
      encrypted_data: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      title: "MyBank",
    };

    mockVerifySession.mockResolvedValue({ userId: USER_ID, masterKey: MASTER_KEY });
    mockListVaultEntries.mockResolvedValue([entry]);

    const res = await vaultGET(makeReq("/api/vault", "GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].decrypted_data).toBe(plaintext);
  });

  it("GET /api/vault skips corrupted entries without failing", async () => {
    const entry = {
      id: "vault_entry:11",
      user_id: USER_ID,
      encrypted_data: "not-valid-ciphertext",
      iv: "bad-iv",
      auth_tag: "bad-tag",
      title: "Broken",
    };

    mockVerifySession.mockResolvedValue({ userId: USER_ID, masterKey: MASTER_KEY });
    mockListVaultEntries.mockResolvedValue([entry]);

    const res = await vaultGET(makeReq("/api/vault", "GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].decrypted_data).toBeUndefined();
  });

  it("GET /api/vault/[id] returns decrypted_data when masterKey is present", async () => {
    const { encryptEntry } = await import("@/lib/vault-crypto");
    const plaintext = JSON.stringify({ password: "pass123" });
    const encrypted = await encryptEntry(plaintext, MASTER_KEY);

    const entry = {
      id: "vault_entry:12",
      user_id: USER_ID,
      encrypted_data: encrypted.ciphertext,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      title: "Work",
    };

    mockVerifySession.mockResolvedValue({ userId: USER_ID, masterKey: MASTER_KEY });
    mockGetVaultEntry.mockResolvedValue(entry);

    const res = await entryGET(
      makeReq("/api/vault/vault_entry:12", "GET"),
      makeCtx({ id: "vault_entry:12" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decrypted_data).toBe(plaintext);
  });

  it("GET /api/vault/[id] returns raw entry when decryption fails", async () => {
    const entry = {
      id: "vault_entry:13",
      user_id: USER_ID,
      encrypted_data: "corrupted",
      iv: "bad",
      auth_tag: "bad",
    };

    mockVerifySession.mockResolvedValue({ userId: USER_ID, masterKey: MASTER_KEY });
    mockGetVaultEntry.mockResolvedValue(entry);

    const res = await entryGET(
      makeReq("/api/vault/vault_entry:13", "GET"),
      makeCtx({ id: "vault_entry:13" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decrypted_data).toBeUndefined();
  });
});
