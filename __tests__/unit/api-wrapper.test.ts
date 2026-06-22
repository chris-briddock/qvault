/**
 * Unit tests for the API wrapper helpers (src/lib/api-wrapper.ts).
 */

import { NextResponse } from "next/server";
import {
  withApi,
  jsonResponse,
  validationError,
  unauthorizedError,
} from "@/lib/api-wrapper";

describe("jsonResponse", () => {
  it("returns JSON with the given status", async () => {
    const res = jsonResponse({ ok: true }, 200);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("sets X-Request-Id header when provided", async () => {
    const res = jsonResponse({ ok: true }, 200, "req-123");
    expect(res.headers.get("X-Request-Id")).toBe("req-123");
  });

  it("defaults to status 200", async () => {
    const res = jsonResponse({ x: 1 });
    expect(res.status).toBe(200);
  });
});

describe("validationError", () => {
  it("returns 400 with VALIDATION_ERROR code", async () => {
    const res = validationError("Bad input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Bad input");
  });
});

describe("unauthorizedError", () => {
  it("returns 401 with UNAUTHORIZED code", async () => {
    const res = unauthorizedError();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.error).toBe("Unauthorized");
  });
});

describe("withApi", () => {
  const makeReq = (url = "http://localhost/api/test", method = "GET") =>
    new Request(url, { method });

  const makeCtx = () => ({
    params: Promise.resolve({} as Record<string, string>),
  });

  it("calls the handler and forwards its response", async () => {
    const handler = withApi(async (_req, ctx) =>
      jsonResponse({ result: "ok" }, 200, ctx.requestId)
    );

    const res = await handler(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("ok");
  });

  it("injects security headers on every response", async () => {
    const handler = withApi(async () => jsonResponse({}, 200));
    const res = await handler(makeReq(), makeCtx());

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("injects X-Request-Id on every response", async () => {
    const handler = withApi(async () => jsonResponse({}, 200));
    const res = await handler(makeReq(), makeCtx());
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("returns 500 with sanitized error when handler throws", async () => {
    const handler = withApi(async () => {
      throw new Error("database exploded");
    });

    const res = await handler(makeReq(), makeCtx());
    expect(res.status).toBe(500);
    const body = await res.json();
    // In non-production, the message is surfaced
    expect(typeof body.error).toBe("string");
    expect(body.requestId).toBeTruthy();
  });
});
