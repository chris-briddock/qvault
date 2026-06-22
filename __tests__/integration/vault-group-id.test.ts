/**
 * Integration tests for vault group [id] routes:
 *   GET  /api/vault/groups/[id]
 *   PUT  /api/vault/groups/[id]
 *   DELETE /api/vault/groups/[id]
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/session", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/vault", () => ({
  getVaultGroup: jest.fn(),
  updateVaultGroup: jest.fn(),
  deleteVaultGroup: jest.fn(),
}));

import {
  GET as groupGET,
  PUT as groupPUT,
  DELETE as groupDELETE,
} from "@/app/api/vault/groups/[id]/route";
import { verifySession } from "@/lib/session";
import { getVaultGroup, updateVaultGroup, deleteVaultGroup } from "@/lib/vault";

const mockVerifySession = verifySession as jest.Mock;
const mockGetVaultGroup = getVaultGroup as jest.Mock;
const mockUpdateVaultGroup = updateVaultGroup as jest.Mock;
const mockDeleteVaultGroup = deleteVaultGroup as jest.Mock;

const USER_ID = "user:test";

function makeReq(url: string, method: string, body?: object): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

afterEach(() => jest.clearAllMocks());

/* ── GET /api/vault/groups/[id] ──────────────────────────────── */
describe("GET /api/vault/groups/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await groupGET(
      makeReq("/api/vault/groups/vault_group:1", "GET"),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when group not found", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockGetVaultGroup.mockResolvedValue(null);
    const res = await groupGET(
      makeReq("/api/vault/groups/vault_group:99", "GET"),
      makeCtx({ id: "vault_group:99" })
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with the group when found", async () => {
    const group = { id: "vault_group:1", user_id: USER_ID, name: "Work" };
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockGetVaultGroup.mockResolvedValue(group);

    const res = await groupGET(
      makeReq("/api/vault/groups/vault_group:1", "GET"),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Work");
  });
});

/* ── PUT /api/vault/groups/[id] ──────────────────────────────── */
describe("PUT /api/vault/groups/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await groupPUT(
      makeReq("/api/vault/groups/vault_group:1", "PUT", { name: "Personal" }),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is too long", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const res = await groupPUT(
      makeReq("/api/vault/groups/vault_group:1", "PUT", { name: "a".repeat(101) }),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when group not found", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockUpdateVaultGroup.mockResolvedValue(null);
    const res = await groupPUT(
      makeReq("/api/vault/groups/vault_group:99", "PUT", { name: "Renamed" }),
      makeCtx({ id: "vault_group:99" })
    );
    expect(res.status).toBe(404);
  });

  it("updates and returns the group", async () => {
    const updated = { id: "vault_group:1", user_id: USER_ID, name: "Personal" };
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockUpdateVaultGroup.mockResolvedValue(updated);

    const res = await groupPUT(
      makeReq("/api/vault/groups/vault_group:1", "PUT", { name: "Personal" }),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Personal");
  });

  it("accepts optional color update", async () => {
    const updated = { id: "vault_group:1", user_id: USER_ID, name: "Work", color: "#ff0000" };
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockUpdateVaultGroup.mockResolvedValue(updated);

    const res = await groupPUT(
      makeReq("/api/vault/groups/vault_group:1", "PUT", { color: "#ff0000" }),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(200);
  });
});

/* ── DELETE /api/vault/groups/[id] ───────────────────────────── */
describe("DELETE /api/vault/groups/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await groupDELETE(
      makeReq("/api/vault/groups/vault_group:1", "DELETE"),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(401);
  });

  it("deletes and returns success", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockDeleteVaultGroup.mockResolvedValue(true);

    const res = await groupDELETE(
      makeReq("/api/vault/groups/vault_group:1", "DELETE"),
      makeCtx({ id: "vault_group:1" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDeleteVaultGroup).toHaveBeenCalledWith("vault_group:1", USER_ID);
  });
});
