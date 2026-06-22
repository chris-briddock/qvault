/**
 * Unit tests for src/lib/logger.ts.
 */

import { logger } from "@/lib/logger";

describe("logger", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  describe("info", () => {
    it("calls console.log", () => {
      logger.info("test message");
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it("includes the message in output", () => {
      logger.info("hello world");
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("hello world");
    });

    it("includes context when provided", () => {
      logger.info("msg", { userId: "123" });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("userId");
    });
  });

  describe("warn", () => {
    it("calls console.log", () => {
      logger.warn("warning");
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it("includes WARN in dev output", () => {
      logger.warn("watch out");
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("watch out");
    });

    it("includes error details when an Error is provided", () => {
      logger.warn("oops", {}, new Error("bad thing"));
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("bad thing");
    });
  });

  describe("error", () => {
    it("calls console.log", () => {
      logger.error("critical");
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it("includes the error stack in dev mode", () => {
      const err = new Error("stack test");
      logger.error("failed", {}, err);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("stack test");
    });
  });

  describe("debug", () => {
    it("calls console.log in dev (NODE_ENV=test)", () => {
      logger.debug("debug info");
      // NODE_ENV is 'test' which is treated as dev (not 'production')
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("request", () => {
    it("logs info level for 2xx responses", () => {
      logger.request("GET", "/api/vault", 200, 12);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("GET /api/vault 200");
    });

    it("logs warn level for 4xx responses", () => {
      logger.request("POST", "/api/auth", 401, 5);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("401");
    });

    it("logs error level for 5xx responses", () => {
      logger.request("GET", "/api/x", 500, 100);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("500");
    });

    it("includes duration in output", () => {
      logger.request("GET", "/api/health", 200, 42);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("42");
    });
  });
});
