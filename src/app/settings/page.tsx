"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  const { logout } = usePasskeyAuth();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      setError(null);
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // Step 1: Get authentication options from server
      const optionsRes = await fetch("/api/auth/delete-account/options", {
        method: "POST",
        credentials: "include",
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Failed to start passkey verification");
      }

      const options = await optionsRes.json();

      // Step 2: Trigger passkey authentication
      const assertion = await startAuthentication({ optionsJSON: options });

      // Step 3: Verify and delete
      const verifyRes = await fetch("/api/auth/delete-account/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Passkey verification failed");
      }

      // Step 4: Redirect on success
      window.location.href = "/";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Account deletion failed";
      setError(message);
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="SETTINGS" />
      <main className="mx-auto w-full max-w-lg flex-1 p-6">
        <div className="animate-fade-in-up space-y-6">
          {/* Account Section */}
          <div className="corner-accent glass-card p-8">
            <h2 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
              ACCOUNT
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Manage your session and authentication.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={logout}
                className="w-full border border-danger/30 px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest text-danger transition-all hover:bg-danger/10 uppercase"
              >
                Terminate Session
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="corner-accent glass-card border-danger/20 p-8">
            <h2 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-danger">
              DANGER ZONE
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              These actions are irreversible. All vault data will be permanently lost.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {showConfirm && (
                <div className="border border-danger/30 bg-danger/10 px-4 py-3">
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-danger">
                    This will permanently delete your account and all vault entries.
                    You must confirm with your passkey to proceed.
                  </p>
                </div>
              )}
              {error && (
                <div className="border border-danger/30 bg-danger/10 px-4 py-3">
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-danger">
                    {error}
                  </p>
                </div>
              )}
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full border border-danger/50 bg-danger/10 px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest text-danger transition-all hover:bg-danger/20 uppercase disabled:opacity-50"
              >
                {deleting ? "VERIFYING PASSKEY..." : showConfirm ? "CONFIRM WITH PASSKEY" : "DELETE ACCOUNT"}
              </button>
              {showConfirm && (
                <button
                  onClick={() => { setShowConfirm(false); setError(null); }}
                  className="w-full border border-border px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-widest text-muted transition-all hover:bg-surface uppercase"
                >
                  CANCEL
                </button>
              )}
            </div>
          </div>

          {/* Security Info */}
          <div className="corner-accent glass-card p-8">
            <h2 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
              SECURITY
            </h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                    Encryption
                  </div>
                  <div className="mt-1 text-sm text-foreground">ML-KEM</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center border border-accent/20 bg-accent/5">
                  <div className="status-dot active" />
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                    Authentication
                  </div>
                  <div className="mt-1 text-sm text-foreground">FIDO2 / WebAuthn</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center border border-accent/20 bg-accent/5">
                  <div className="status-dot active" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                    Architecture
                  </div>
                  <div className="mt-1 text-sm text-foreground">Zero Knowledge</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center border border-accent/20 bg-accent/5">
                  <div className="status-dot active" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
