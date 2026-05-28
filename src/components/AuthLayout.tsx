"use client";

import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="noise-overlay absolute inset-0" />
      
      {/* Animated radial glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.04] blur-[100px] animate-neon-pulse" />

      {/* Floating geometric shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute top-[10%] left-[5%] h-32 w-32 rounded-full border border-accent/10" />
        <div
          className="animate-float absolute top-[20%] right-[10%] h-24 w-24 rotate-45 border border-accent/10"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="animate-float absolute bottom-[15%] left-[8%] h-16 w-16 border border-accent/15"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="animate-float absolute bottom-[20%] right-[5%] h-20 w-20 rounded-full border border-accent/5"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-inter)] text-3xl font-black tracking-wider text-foreground"
          >
            <span className="animate-neon-text text-accent">Q</span>
            <span className="text-foreground">VAULT</span>
          </Link>
          <div className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
            Quantum-Secure Vault
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
