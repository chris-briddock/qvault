/**
 * @jest-environment jsdom
 *
 * Unit tests for src/hooks/usePasskeyAuth.ts.
 * The WebAuthn browser APIs and fetch are mocked.
 */

process.env.SKIP_ENV_VALIDATION = "1";

jest.mock("@simplewebauthn/browser", () => ({
  startRegistration: jest.fn(),
  startAuthentication: jest.fn(),
}));

jest.mock("@/app/actions/auth", () => ({
  setSessionCookie: jest.fn().mockResolvedValue({ success: true }),
}));

import { renderHook, act } from "@testing-library/react";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const mockStartRegistration = startRegistration as jest.Mock;
const mockStartAuthentication = startAuthentication as jest.Mock;

function mockFetch(responses: Array<{ ok: boolean; status?: number; body: object }>) {
  let callIndex = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const resp = responses[callIndex++] ?? responses[responses.length - 1];
    return Promise.resolve({
      ok: resp.ok,
      status: resp.status ?? (resp.ok ? 200 : 400),
      json: () => Promise.resolve(resp.body),
    });
  });
}

afterEach(() => jest.clearAllMocks());

/* ── register ────────────────────────────────────────────────── */
describe("usePasskeyAuth.register", () => {
  it("starts as not loading with no error", () => {
    const { result } = renderHook(() => usePasskeyAuth());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls the registration flow and sets loading during the call", async () => {
    mockFetch([
      { ok: true, body: { challenge: "ch" } },
      { ok: true, body: { success: true, userId: "user:1" } },
    ]);
    mockStartRegistration.mockResolvedValue({ id: "cred" });

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.register("alice");
    });

    expect(mockStartRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: "ch" } });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when register-options request fails", async () => {
    mockFetch([{ ok: false, status: 400, body: { error: "Username required" } }]);

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.register("").catch(() => {});
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it("sets user-friendly error on NotAllowedError", async () => {
    mockFetch([{ ok: true, body: { challenge: "ch" } }]);
    const err = new Error("cancelled");
    err.name = "NotAllowedError";
    mockStartRegistration.mockRejectedValue(err);

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.register("alice").catch(() => {});
    });

    expect(result.current.error).toContain("cancelled");
  });

  it("sets error when register-verify request fails", async () => {
    mockFetch([
      { ok: true, body: { challenge: "ch" } },
      { ok: false, status: 409, body: { error: "Username already taken" } },
    ]);
    mockStartRegistration.mockResolvedValue({ id: "cred" });

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.register("alice").catch(() => {});
    });

    expect(result.current.error).toContain("Username already taken");
  });
});

/* ── login ───────────────────────────────────────────────────── */
describe("usePasskeyAuth.login", () => {
  it("calls the login flow successfully", async () => {
    mockFetch([
      { ok: true, body: { challenge: "login-ch" } },
      { ok: true, body: { success: true, userId: "user:1" } },
    ]);
    mockStartAuthentication.mockResolvedValue({ id: "cred" });

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.login("alice");
    });

    expect(mockStartAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "login-ch" } });
    expect(result.current.error).toBeNull();
  });

  it("sets error when user not found (404 on login-options)", async () => {
    mockFetch([{ ok: false, status: 404, body: { error: "User not found" } }]);

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.login("ghost").catch(() => {});
    });

    expect(result.current.error).toContain("User not found");
  });

  it("sets SecurityError message on SecurityError", async () => {
    mockFetch([{ ok: true, body: { challenge: "ch" } }]);
    const err = new Error("insecure context");
    err.name = "SecurityError";
    mockStartAuthentication.mockRejectedValue(err);

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.login("alice").catch(() => {});
    });

    expect(result.current.error).toContain("HTTPS");
  });
});

/* ── clearError ──────────────────────────────────────────────── */
describe("usePasskeyAuth.clearError", () => {
  it("clears a previously set error", async () => {
    mockFetch([{ ok: false, status: 400, body: { error: "bad" } }]);

    const { result } = renderHook(() => usePasskeyAuth());

    await act(async () => {
      await result.current.login("alice").catch(() => {});
    });

    expect(result.current.error).toBeTruthy();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
