"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

interface VaultEntry {
  id: string;
  title?: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  created_at?: string;
  decrypted_data?: string;
  group_id?: string;
}

interface VaultGroup {
  id: string;
  name: string;
  color?: string;
}

export default function VaultEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/vault/${id}`, { credentials: "include" }).then((res) => res.json()),
      fetch("/api/vault/groups", { credentials: "include" }).then((res) => res.json()),
    ])
      .then(([entryData, groupsData]) => {
        setEntry(entryData);
        setSelectedGroup(entryData.group_id || "");
        setGroups(groupsData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this entry permanently?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/vault");
  };

  const handleGroupUpdate = async () => {
    if (!entry) return;
    const plaintext = entry.decrypted_data || "{}";
    let info: Record<string, string> = {};
    try {
      info = JSON.parse(plaintext);
    } catch {
      // ignore
    }

    const res = await fetch(`/api/vault/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: entry.title || "Untitled",
        username: info.username || "",
        password: info.password || "",
        email: info.email || "",
        phone: info.phone || "",
        url: info.url || "",
        notes: info.notes || "",
        group_id: selectedGroup || undefined,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setEntry(updated);
      setEditingGroup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PageHeader title="ENTRY" />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm tracking-widest text-muted uppercase">
              Loading...
            </span>
          </div>
        </main>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PageHeader title="ENTRY" />
        <main className="mx-auto w-full max-w-lg flex-1 p-6">
          <div className="corner-accent glass-card p-8 text-center">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm tracking-widest text-muted uppercase">
              Entry Not Found
            </p>
            <Link href="/vault" className="mt-4 inline-block cyber-btn px-4 py-2 text-xs">
              BACK TO VAULT
            </Link>
          </div>
        </main>
      </div>
    );
  }

  let decryptedInfo: { username?: string; password?: string; url?: string; notes?: string; email?: string; phone?: string } = {};
  if (entry.decrypted_data) {
    try {
      decryptedInfo = JSON.parse(entry.decrypted_data);
    } catch {
      // ignore
    }
  }

  const currentGroup = groups.find((g) => g.id === entry.group_id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title={entry.title?.toUpperCase() || "ENTRY"}
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
        <div className="animate-fade-in-up corner-accent glass-card p-8">
          <div className="mb-6 text-center">
            <h2 className="font-[family-name:var(--font-inter)] text-xl font-semibold tracking-wide text-foreground">
              {entry.title || "Untitled"}
            </h2>
            {entry.decrypted_data ? (
              <span className="mt-2 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-wider text-accent/60 uppercase">
                PQ-ENCRYPTED
              </span>
            ) : (
              <span className="mt-2 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-wider text-muted/40 uppercase">
                ENCRYPTED
              </span>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {editingGroup ? (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Group
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="cyber-input flex-1 px-3 py-2 text-sm"
                  >
                    <option value="">No Group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleGroupUpdate} className="cyber-btn px-3 py-2 text-xs">
                    SAVE
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroup(false);
                      setSelectedGroup(entry.group_id || "");
                    }}
                    className="border border-danger/30 px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-xs text-danger hover:bg-danger/10"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-widest text-muted uppercase">
                  Group:
                </span>
                {currentGroup ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded border border-accent/20 bg-accent/5 px-2 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-wider text-accent uppercase"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: currentGroup.color || "var(--accent)" }}
                    />
                    {currentGroup.name}
                  </span>
                ) : (
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-muted/50">
                    No Group
                  </span>
                )}
                <button
                  onClick={() => setEditingGroup(true)}
                  className="ml-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-accent/60 transition-colors hover:text-accent"
                >
                  EDIT
                </button>
              </div>
            )}

            {decryptedInfo.username && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground">
                    {decryptedInfo.username}
                  </code>
                  <button
                    onClick={() => copyToClipboard(decryptedInfo.username!, "username")}
                    className="cyber-btn-outline px-3 py-2 text-xs"
                  >
                    {copied === "username" ? "COPIED" : "COPY"}
                  </button>
                </div>
              </div>
            )}

            {decryptedInfo.password && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground">
                    {showPassword ? decryptedInfo.password : "•".repeat(16)}
                  </code>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="cyber-btn-outline px-3 py-2 text-xs"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(decryptedInfo.password!, "password")}
                    className="cyber-btn-outline px-3 py-2 text-xs"
                  >
                    {copied === "password" ? "COPIED" : "COPY"}
                  </button>
                </div>
              </div>
            )}

            {decryptedInfo.email && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground">
                    {decryptedInfo.email}
                  </code>
                  <button
                    onClick={() => copyToClipboard(decryptedInfo.email!, "email")}
                    className="cyber-btn-outline px-3 py-2 text-xs"
                  >
                    {copied === "email" ? "COPIED" : "COPY"}
                  </button>
                </div>
              </div>
            )}

            {decryptedInfo.phone && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Phone
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground">
                    {decryptedInfo.phone}
                  </code>
                  <button
                    onClick={() => copyToClipboard(decryptedInfo.phone!, "phone")}
                    className="cyber-btn-outline px-3 py-2 text-xs"
                  >
                    {copied === "phone" ? "COPIED" : "COPY"}
                  </button>
                </div>
              </div>
            )}

            {decryptedInfo.url && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  URL
                </label>
                <a
                  href={decryptedInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-accent transition-colors hover:text-accent-dim"
                >
                  {decryptedInfo.url}
                </a>
              </div>
            )}

            {decryptedInfo.notes && (
              <div>
                <label className="mb-1 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tracking-widest text-muted uppercase">
                  Notes
                </label>
                <div className="rounded border border-border bg-surface px-3 py-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground whitespace-pre-wrap">
                  {decryptedInfo.notes}
                </div>
              </div>
            )}

            {!entry.decrypted_data && (
              <div className="border border-accent/20 bg-accent/5 px-4 py-3">
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-accent/80">
                  This entry is encrypted with post-quantum cryptography.
                  The master key is not available in this session.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleDelete}
                className="border border-danger/30 px-4 py-2 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-wider text-danger transition-all hover:bg-danger/10"
              >
                DELETE ENTRY
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
