import { verifySession } from "@/lib/session";
import { getUserById } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);
  if (!user || !user.username) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader
        title="DASHBOARD"
        action={
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="status-dot active" />
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                {user.username.toUpperCase()}
              </span>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="cyber-btn-outline px-4 py-2 text-xs"
              >
                LOGOUT
              </button>
            </form>
          </div>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <div className="animate-fade-in-up mb-8">
          <h2 className="font-[family-name:var(--font-inter)] text-2xl font-bold tracking-tight text-foreground">
            WELCOME BACK, <span className="text-accent">{user.username.toUpperCase()}</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your vault is secure and ready.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/vault"
            className="animate-fade-in-up delay-100 group corner-accent glass-card p-8 transition-all hover:border-accent/50"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center border border-accent/20 bg-accent/5">
              <svg
                className="h-6 w-6 text-accent"
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
            <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
              PASSWORD VAULT
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Manage your encrypted passwords and secure credentials.
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-accent opacity-0 transition-opacity group-hover:opacity-100">
              OPEN VAULT
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/generator"
            className="animate-fade-in-up delay-200 group corner-accent glass-card p-8 transition-all hover:border-accent/50"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center border border-accent/20 bg-accent/5">
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
              GENERATOR
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Create strong, cryptographically random passwords.
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-accent opacity-0 transition-opacity group-hover:opacity-100">
              GENERATE
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/settings"
            className="animate-fade-in-up delay-300 group corner-accent glass-card p-8 transition-all hover:border-accent/50"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center border border-accent/20 bg-accent/5">
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
              SETTINGS
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Manage your account and security preferences.
            </p>
            <div className="mt-6 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-accent opacity-0 transition-opacity group-hover:opacity-100">
              CONFIGURE
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
