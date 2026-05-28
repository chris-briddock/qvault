"use client";

import { useState, useEffect } from "react";
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

const PRESET_COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const [groupFormError, setGroupFormError] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const fetchEntries = async (groupId?: string) => {
    const url = groupId ? `/api/vault?group=${groupId}` : "/api/vault";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return [];
    return (await res.json()) as VaultEntry[];
  };

  useEffect(() => {
    Promise.all([
      fetchEntries(selectedGroup || undefined),
      fetch("/api/vault/groups", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([entriesData, groupsData]) => {
        setEntries(entriesData || []);
        setGroups(groupsData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedGroup]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE", credentials: "include" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setGroupFormError(null);
    try {
      const res = await fetch("/api/vault/groups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), color: newGroupColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || "Failed to create group");
      }
      const group = (await res.json()) as VaultGroup;
      setGroups((prev) => [...prev, group]);
      setNewGroupName("");
      setShowGroupForm(false);
    } catch (err) {
      setGroupFormError(err instanceof Error ? err.message : "Failed to create group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group? Entries will be ungrouped.")) return;
    setDeletingGroup(groupId);
    try {
      await fetch(`/api/vault/groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedGroup === groupId) setSelectedGroup(null);
      setEntries((prev) =>
        prev.map((e) => (e.group_id === groupId ? { ...e, group_id: undefined } : e))
      );
    } catch {
      // ignore
    } finally {
      setDeletingGroup(null);
    }
  };

  const groupById = new Map(groups.map((g) => [g.id, g]));

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PageHeader title="VAULT" />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm tracking-widest text-muted uppercase">
              Decrypting Vault...
            </span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title="VAULT"
        action={
          <Link
            href="/vault/new"
            className="cyber-btn flex items-center gap-2 px-4 py-2 text-xs"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            ADD ENTRY
          </Link>
        }
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 p-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
              Groups
            </h3>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-accent transition-colors hover:text-accent-dim"
            >
              + NEW
            </button>
          </div>

          {showGroupForm && (
            <div className="corner-accent glass-card p-3">
              {groupFormError && (
                <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-danger">
                  {groupFormError}
                </p>
              )}
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name..."
                className="cyber-input mb-2 w-full px-2 py-1.5 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") setShowGroupForm(false);
                }}
              />
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewGroupColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition-all ${
                      newGroupColor === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateGroup} className="cyber-btn flex-1 py-1.5 text-[10px]">
                  CREATE
                </button>
                <button
                  onClick={() => setShowGroupForm(false)}
                  className="flex-1 border border-danger/30 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-danger hover:bg-danger/10"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setSelectedGroup(null)}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-left font-[family-name:var(--font-jetbrains-mono)] text-xs transition-all ${
              selectedGroup === null
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full border border-muted/30 bg-transparent" />
            All Entries
            <span className="ml-auto font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-muted/60">
              {entries.length}
            </span>
          </button>

          {groups.map((group) => {
            const count = entries.filter((e) => e.group_id === group.id).length;
            return (
              <div key={group.id} className="group relative flex items-center">
                <button
                  onClick={() => setSelectedGroup(group.id)}
                  className={`flex flex-1 items-center gap-2 rounded border px-3 py-2 text-left font-[family-name:var(--font-jetbrains-mono)] text-xs transition-all ${
                    selectedGroup === group.id
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color || "var(--accent)" }}
                  />
                  <span className="truncate">{group.name}</span>
                  <span className="ml-auto shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-muted/60">
                    {count}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  disabled={deletingGroup === group.id}
                  className="ml-1.5 shrink-0 rounded border border-danger/20 p-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-danger opacity-0 transition-all hover:bg-danger/10 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete group"
                >
                  ×
                </button>
              </div>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex-1">
          {entries.length === 0 ? (
            <div className="animate-fade-in-up flex flex-col items-center justify-center corner-accent glass-card py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center border border-accent/20 bg-accent/5">
                <svg
                  className="h-8 w-8 text-accent/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-sm tracking-widest text-muted uppercase">
                Vault is Empty
              </p>
              <Link
                href="/vault/new"
                className="mt-4 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-accent transition-colors hover:text-accent-dim"
              >
                ADD FIRST ENTRY
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map((entry, i) => {
                let decryptedInfo: { username?: string; url?: string } = {};
                if (entry.decrypted_data) {
                  try {
                    decryptedInfo = JSON.parse(entry.decrypted_data);
                  } catch {
                    // ignore
                  }
                }
                const group = entry.group_id ? groupById.get(entry.group_id) : undefined;
                return (
                  <div
                    key={entry.id}
                    className="animate-fade-in-up group flex items-center justify-between corner-accent glass-card px-6 py-4 transition-all hover:border-accent/50"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center border border-accent/20 bg-accent/5">
                        <svg
                          className="h-5 w-5 text-accent"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-[family-name:var(--font-inter)] text-sm font-semibold tracking-wide text-foreground">
                            {entry.title || "UNTITLED"}
                          </h3>
                          {group && (
                            <span
                              className="inline-flex h-5 items-center gap-1 rounded border border-accent/20 bg-accent/5 px-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] tracking-wider text-accent/80 uppercase"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: group.color || "var(--accent)" }}
                              />
                              {group.name}
                            </span>
                          )}
                        </div>
                        {decryptedInfo.username && (
                          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-muted/70">
                            {decryptedInfo.username}
                          </p>
                        )}
                        {entry.decrypted_data ? (
                          <span className="mt-1 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-wider text-accent/60 uppercase">
                            PQ-ENCRYPTED
                          </span>
                        ) : (
                          <span className="mt-1 inline-block font-[family-name:var(--font-jetbrains-mono)] text-[10px] tracking-wider text-muted/40 uppercase">
                            ENCRYPTED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/vault/${entry.id}`}
                        className="cyber-btn-outline px-3 py-1.5 text-xs"
                      >
                        VIEW
                      </Link>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="border border-danger/30 px-3 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-wider text-danger transition-all hover:bg-danger/10"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
