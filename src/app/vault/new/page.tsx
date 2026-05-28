"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface VaultGroup {
  id: string;
  name: string;
  color?: string;
}

export default function NewVaultEntryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vault/groups", { credentials: "include" })
      .then((res) => res.json())
      .then((data: VaultGroup[]) => setGroups(data))
      .catch(() => setGroups([]));
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          username,
          password,
          email,
          phone,
          url,
          notes,
          group_id: groupId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Failed to save entry");
      }

      router.push("/vault");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title="NEW ENTRY"
        action={
          <Link
            href="/vault"
            className="cyber-btn-outline px-4 py-2 text-xs"
          >
            BACK
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-lg flex-1 p-6">
        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up corner-accent glass-card p-8"
        >
          <div className="flex flex-col gap-6">
            {error && (
              <div className="border border-danger/30 bg-danger/10 px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-xs text-danger">
                {error}
              </div>
            )}
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="cyber-input w-full px-4 py-3 text-sm"
                placeholder="e.g. GitHub"
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Group
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="cyber-input w-full px-4 py-3 text-sm"
              >
                <option value="">No Group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="cyber-input w-full px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="cyber-input w-full px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input w-full px-4 py-3 text-sm"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="cyber-input w-full px-4 py-3 text-sm"
                placeholder="+1 555-123-4567"
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="cyber-input w-full px-4 py-3 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="cyber-input w-full px-4 py-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="cyber-btn w-full px-4 py-3 text-sm disabled:opacity-50"
            >
              {loading ? "ENCRYPTING..." : "SAVE ENTRY"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
