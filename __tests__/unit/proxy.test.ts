/**
 * Unit tests for src/proxy.ts middleware.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function makeRequest(pathname: string, sessionCookie?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = new Headers();
  if (sessionCookie) {
    headers.set("cookie", `session=${sessionCookie}`);
  }

  return {
    nextUrl: { pathname },
    url,
    cookies: {
      get: (name: string) =>
        name === "session" && sessionCookie
          ? { name: "session", value: sessionCookie }
          : undefined,
    },
  } as unknown as NextRequest;
}

describe("proxy middleware", () => {
  describe("unprotected routes", () => {
    const publicPaths = ["/", "/login", "/register", "/about", "/api/health"];

    it.each(publicPaths)(
      "allows access to %s without a session",
      (path) => {
        const req = makeRequest(path);
        const res = proxy(req);
        expect(res).toEqual(NextResponse.next());
      }
    );
  });

  describe("protected routes — no session", () => {
    const protectedPaths = [
      "/dashboard",
      "/vault",
      "/vault/new",
      "/vault/entry:1",
      "/generator",
      "/settings",
    ];

    it.each(protectedPaths)(
      "redirects %s to /login when no session cookie",
      (path) => {
        const req = makeRequest(path);
        const res = proxy(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login");
      }
    );
  });

  describe("protected routes — with session", () => {
    const protectedPaths = ["/dashboard", "/vault", "/generator", "/settings"];

    it.each(protectedPaths)(
      "allows access to %s when session cookie is present",
      (path) => {
        const req = makeRequest(path, "valid-token");
        const res = proxy(req);
        expect(res.status).not.toBe(307);
      }
    );
  });
});
