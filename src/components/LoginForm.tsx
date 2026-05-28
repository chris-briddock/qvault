"use client";

import { useState } from "react";
import Link from "next/link";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { AuthLayout } from "@/components/AuthLayout";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const { login, loading, error } = usePasskeyAuth();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      await login(username.trim());
      window.location.href = "/dashboard";
    } catch {
      // error is handled by hook
    }
  };

  return (
    <AuthLayout>
      <div className="animate-fade-in-up corner-accent glass-card p-8">
        <h1 className="font-[family-name:var(--font-inter)] text-xl font-bold tracking-wide text-foreground">
          ACCESS VAULT
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Authenticate with your passkey. No password required.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="cyber-input w-full px-4 py-3 text-sm"
              placeholder="Enter your username"
              required
            />
          </div>
          {error && (
            <div className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="cyber-btn w-full px-4 py-3 text-sm disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "UNLOCK WITH PASSKEY"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Need a vault?{" "}
          <Link
            href="/register"
            className="font-medium text-accent transition-colors hover:text-accent-dim"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
