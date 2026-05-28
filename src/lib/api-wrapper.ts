/**
 * API route wrapper that adds:
 * - Structured request/response logging
 * - Error handling with sanitized responses
 * - Request timing
 * - Security headers
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export interface ApiContext {
  requestId: string;
  startTime: number;
  params: Promise<Record<string, string>>;
}

export type RouteHandler = (
  req: Request,
  ctx: ApiContext
) => Promise<NextResponse>;

// Next.js App Router expects this signature for route handlers
export type NextJsHandler = (
  req: Request,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeError(error: unknown): { message: string; code: string } {
  if (error instanceof Error) {
    return {
      message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
      code: error.name,
    };
  }
  return { message: "Internal server error", code: "UNKNOWN_ERROR" };
}

export function withApi(handler: RouteHandler): NextJsHandler {
  return async (req: Request, nextContext: { params: Promise<Record<string, string>> }) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const url = new URL(req.url);

    const apiCtx: ApiContext = {
      requestId,
      startTime,
      params: nextContext.params,
    };

    logger.info("Request started", {
      requestId,
      method: req.method,
      path: url.pathname,
      userAgent: req.headers.get("user-agent")?.slice(0, 100),
    });

    try {
      const response = await handler(req, apiCtx);
      const duration = Date.now() - startTime;

      logger.request(req.method, url.pathname, response.status, duration, {
        requestId,
      });

      // Add security headers
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const sanitized = sanitizeError(error);

      logger.error("Request failed", {
        requestId,
        method: req.method,
        path: url.pathname,
        durationMs: duration,
      }, error instanceof Error ? error : new Error(String(error)));

      const response = NextResponse.json(
        {
          error: sanitized.message,
          code: sanitized.code,
          requestId,
        },
        { status: 500 }
      );

      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Content-Type-Options", "nosniff");

      return response;
    }
  };
}

/** Helper to create JSON responses with consistent headers */
export function jsonResponse(
  data: unknown,
  status: number = 200,
  requestId?: string
): NextResponse {
  const response = NextResponse.json(data, { status });
  if (requestId) {
    response.headers.set("X-Request-Id", requestId);
  }
  return response;
}

/** Helper for validation errors */
export function validationError(
  message: string,
  requestId?: string
): NextResponse {
  return jsonResponse({ error: message, code: "VALIDATION_ERROR" }, 400, requestId);
}

/** Helper for auth errors */
export function unauthorizedError(requestId?: string): NextResponse {
  return jsonResponse({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401, requestId);
}
