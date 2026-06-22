/**
 * Integration tests for GET /api/health.
 * The DB client is mocked so no live SurrealDB is required.
 */

process.env.SKIP_ENV_VALIDATION = "1";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-chars!!";
process.env.SERVER_SECRET = "test-server-secret-that-is-at-least-32-chars!!";

jest.mock("@/lib/db", () => ({
  checkDbHealth: jest.fn(),
  getDb: jest.fn(),
}));

import { GET } from "@/app/api/health/route";
import { checkDbHealth } from "@/lib/db";

const mockCheckDbHealth = checkDbHealth as jest.Mock;

describe("GET /api/health", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 200 and status=healthy when DB is healthy", async () => {
    mockCheckDbHealth.mockResolvedValue({ healthy: true, latencyMs: 5 });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.database.healthy).toBe(true);
    expect(typeof body.latencyMs).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns 503 and status=unhealthy when DB is unhealthy", async () => {
    mockCheckDbHealth.mockResolvedValue({
      healthy: false,
      latencyMs: 0,
      error: "connection refused",
    });

    const res = await GET();
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.healthy).toBe(false);
  });

  it("sets Cache-Control: no-store", async () => {
    mockCheckDbHealth.mockResolvedValue({ healthy: true, latencyMs: 1 });

    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
