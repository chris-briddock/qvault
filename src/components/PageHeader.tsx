"use client";

import Link from "next/link";

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-inter)] text-lg font-black tracking-wider text-foreground transition-colors hover:text-accent"
          >
            <span className="text-accent">Q</span>VAULT
          </Link>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <h1 className="hidden font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold tracking-widest text-muted uppercase sm:block">
            {title}
          </h1>
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>
    </header>
  );
}
