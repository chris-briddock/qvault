/**
 * Integration tests for vault groups API routes.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/session", () => ({
  verifySession: jest.fn(),
}));

jest.mock("@/lib/vault", () => ({
  listVaultGroups: jest.fn(),
  createVaultGroup: jest.fn(),
}));

import {
  GET as groupsGET,
  POST as groupsPOST,
} from "@/app/api/vault/groups/route";
import { verifySession } from "@/lib/session";
import { listVaultGroups, createVaultGroup } from "@/lib/vault";

const mockVerifySession = verifySession as jest.Mock;
const mockListVaultGroups = listVaultGroups as jest.Mock;
const mockCreateVaultGroup = createVaultGroup as jest.Mock;

const USER_ID = "user:test123";

function makeReq(url: string, method: string, body?: object): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx() {
  return { params: Promise.resolve({} as Record<string, string>) };
}

afterEach(() => jest.clearAllMocks());

describe("GET /api/vault/groups", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await groupsGET(makeReq("/api/vault/groups", "GET"), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns groups for the authenticated user", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const groups = [
      { id: "vault_group:1", user_id: USER_ID, name: "Work" },
      { id: "vault_group:2", user_id: USER_ID, name: "Personal" },
    ];
    mockListVaultGroups.mockResolvedValue(groups);

    const res = await groupsGET(makeReq("/api/vault/groups", "GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Work");
  });

  it("returns empty array when user has no groups", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    mockListVaultGroups.mockResolvedValue([]);

    const res = await groupsGET(makeReq("/api/vault/groups", "GET"), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/vault/groups", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifySession.mockResolvedValue(null);
    const res = await groupsPOST(
      makeReq("/api/vault/groups", "POST", { name: "Work" }),
      makeCtx()
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const res = await groupsPOST(
      makeReq("/api/vault/groups", "POST", {}),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too long", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const res = await groupsPOST(
      makeReq("/api/vault/groups", "POST", { name: "a".repeat(101) }),
      makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("creates and returns a group with status 201", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const created = {
      id: "vault_group:3",
      user_id: USER_ID,
      name: "Finance",
    };
    mockCreateVaultGroup.mockResolvedValue(created);

    const res = await groupsPOST(
      makeReq("/api/vault/groups", "POST", { name: "Finance" }),
      makeCtx()
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Finance");
    expect(body.id).toBe("vault_group:3");
  });

  it("includes optional color in created group", async () => {
    mockVerifySession.mockResolvedValue({ userId: USER_ID });
    const created = {
      id: "vault_group:4",
      user_id: USER_ID,
      name: "Work",
      color: "#00ff00",
    };
    mockCreateVaultGroup.mockResolvedValue(created);

    const res = await groupsPOST(
      makeReq("/api/vault/groups", "POST", { name: "Work", color: "#00ff00" }),
      makeCtx()
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.color).toBe("#00ff00");
  });
});
