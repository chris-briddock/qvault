"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";

export default function GeneratorPage() {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let chars = lower;
    if (includeUppercase) chars += upper;
    if (includeNumbers) chars += numbers;
    if (includeSymbols) chars += symbols;

    let result = "";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    setPassword(result);
    setCopied(false);
  }, [length, includeUppercase, includeNumbers, includeSymbols]);

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="GENERATOR" />
      <main className="mx-auto w-full max-w-lg flex-1 p-6">
        <div className="animate-fade-in-up corner-accent glass-card p-8">
          {/* Password Display */}
          <div className="mb-8">
            <label className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
              Generated Password
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 border border-border bg-surface px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-sm text-foreground">
                {password || (
                  <span className="text-muted/30">
                    Click generate to create...
                  </span>
                )}
              </div>
              <button
                onClick={copyToClipboard}
                disabled={!password}
                className="cyber-btn-outline px-4 py-3 text-xs disabled:opacity-30"
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted uppercase">
                  Length
                </label>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-accent">
                  {length}
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="mt-1 flex justify-between font-[family-name:var(--font-jetbrains-mono)] text-xs text-muted/50">
                <span>8</span>
                <span>64</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                  Uppercase Letters
                </span>
                <input
                  type="checkbox"
                  checked={includeUppercase}
                  onChange={(e) => setIncludeUppercase(e.target.checked)}
                  className="h-5 w-5 accent-accent"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                  Numbers
                </span>
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="h-5 w-5 accent-accent"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                  Symbols
                </span>
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="h-5 w-5 accent-accent"
                />
              </label>
            </div>

            <button
              onClick={generate}
              className="cyber-btn w-full px-4 py-3 text-sm"
            >
              GENERATE PASSWORD
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
