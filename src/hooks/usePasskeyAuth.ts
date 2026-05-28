"use client";

import { useState, useCallback } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { setSessionCookie } from "@/app/actions/auth";

/* ── Error name constants ───────────────────────────────────────── */
const ERR_NOT_ALLOWED = "NotAllowedError";
const ERR_SECURITY = "SecurityError";
const ERR_ABORT = "AbortError";
const ERR_INVALID_STATE = "InvalidStateError";
const ERR_NOT_SUPPORTED = "NotSupportedError";

const MSG_NOT_ALLOWED = "Authentication was cancelled or not allowed by your device.";
const MSG_SECURITY = "This operation is not allowed in the current context. Ensure you are using HTTPS or localhost.";
const MSG_ABORT = "Authentication was aborted.";
const MSG_INVALID_STATE = "A passkey already exists for this device. Try signing in instead.";
const MSG_NOT_SUPPORTED = "Your browser or device does not support passkeys.";
const MSG_CIRCUIT_BREAKER = "Service temporarily unavailable. Please try again in a moment.";
const MSG_NETWORK = "Network error. Please check your connection and try again.";

/** Extract a user-friendly error message from an API or passkey error */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    switch (err.name) {
      case ERR_NOT_ALLOWED:
        return MSG_NOT_ALLOWED;
      case ERR_SECURITY:
        return MSG_SECURITY;
      case ERR_ABORT:
        return MSG_ABORT;
      case ERR_INVALID_STATE:
        return MSG_INVALID_STATE;
      case ERR_NOT_SUPPORTED:
        return MSG_NOT_SUPPORTED;
    }

    // API / network error messages
    if (err.message.includes("circuit breaker")) {
      return MSG_CIRCUIT_BREAKER;
    }
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return MSG_NETWORK;
    }

    return err.message;
  }
  return fallback;
}

/** Retry a fetch with exponential backoff */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, credentials: "include" });
      // Retry on 5xx or network-like errors
      if (res.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Network request failed after retries");
}

export function usePasskeyAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const optionsRes = await fetchWithRetry("/api/auth/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!optionsRes.ok) {
        const err = await optionsRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to get registration options");
      }
      const options = await optionsRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetchWithRetry("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, response: attestation }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Registration verification failed");
      }
      const result = await verifyRes.json();
      // Set session cookie via Server Action (bypasses Route Handler cookie issues)
      await setSessionCookie(result.userId);
      return result;
    } catch (err) {
      const message = getErrorMessage(err, "Registration failed");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const optionsRes = await fetchWithRetry("/api/auth/login-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!optionsRes.ok) {
        const err = await optionsRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to get login options");
      }
      const options = await optionsRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetchWithRetry("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, response: assertion }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Login verification failed");
      }
      const result = await verifyRes.json();
      // Set session cookie via Server Action (bypasses Route Handler cookie issues)
      await setSessionCookie(result.userId);
      return result;
    } catch (err) {
      const message = getErrorMessage(err, "Login failed");
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithRetry("/api/auth/logout", { method: "POST" }, 1);
    } catch {
      // Even if logout fails server-side, clear client state
    } finally {
      window.location.href = "/login";
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { register, login, logout, loading, error, clearError };
}
