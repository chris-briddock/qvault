"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-inter)] text-xl font-black tracking-wider text-foreground"
          >
            <span className="animate-neon-text text-accent">Q</span>
            <span className="text-foreground">VAULT</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-medium tracking-wide text-muted transition-colors hover:text-foreground uppercase"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="cyber-btn px-5 py-2 text-xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-20">
        {/* Background effects */}
        <div className="absolute inset-0 grid-bg" />
        <div className="noise-overlay absolute inset-0" />

        {/* Floating geometric shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-[15%] left-[10%] h-32 w-32 rounded-full border border-accent/10" />
          <div
            className="animate-float absolute top-[25%] right-[15%] h-24 w-24 border border-accent/10"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="animate-float absolute bottom-[20%] left-[20%] h-16 w-16 rotate-45 border border-accent/10"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="animate-float absolute bottom-[30%] right-[10%] h-40 w-40 rounded-full border border-accent/5"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="animate-float absolute top-[60%] left-[50%] h-8 w-8 border border-accent/20"
            style={{ animationDelay: "1.5s" }}
          />
        </div>

        {/* Radial glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.03] blur-3xl animate-neon-pulse" />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-surface-raised/50 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-accent uppercase">
              Post-Quantum Cryptography
            </span>
          </div>

          <h1 className="animate-fade-in-up delay-100 font-[family-name:var(--font-inter)] text-5xl font-black leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            SECRETS THAT
            <br />
            <span className="animate-neon-text text-accent">OUTLAST TIME</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            The first password vault built for the quantum era. Military-grade
            encryption meets biometric authentication. Your data, invincible.
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="cyber-btn px-8 py-4 text-sm"
            >
              CREATE VAULT
            </Link>
            <Link
              href="/login"
              className="cyber-btn-outline px-8 py-4 text-sm"
            >
              ACCESS VAULT
            </Link>
          </div>

          {/* Stats row */}
          <div className="animate-fade-in-up delay-400 mt-20 grid grid-cols-3 gap-8 border-t border-border/50 pt-10">
            <div className="text-center">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-3xl font-bold text-accent sm:text-4xl">
                ML-KEM
              </div>
              <div className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                Encryption
              </div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-3xl font-bold text-accent sm:text-4xl">
                FIDO2
              </div>
              <div className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                Passkey Auth
              </div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-3xl font-bold text-accent sm:text-4xl">
                ZERO
              </div>
              <div className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted uppercase">
                Knowledge
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-t border-border bg-surface px-6 py-32">
        <div className="noise-overlay absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mb-20">
            <h2 className="animate-slide-in-left font-[family-name:var(--font-inter)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              BUILT FOR THE
              <br />
              <span className="text-accent">THREATS OF TOMORROW</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="animate-fade-in-up delay-100 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
                QUANTUM RESISTANT
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Powered by ML-KEM, the NIST-standardized post-quantum key
                encapsulation mechanism. Your secrets remain safe even against
                future quantum computers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="animate-fade-in-up delay-200 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                    d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.44-1.64 7.5h-1.368A7.5 7.5 0 0116.5 10.5c0-2.92.556-5.44 1.64-7.5H19.5a7.5 7.5 0 00-11.636 0zM12 16.5a6 6 0 100-12 6 6 0 000 12z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
                PASSKEY AUTH
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                No passwords to remember, no passwords to steal. FIDO2 WebAuthn
                passkeys use your device's biometrics for seamless,
                unphishable authentication.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="animate-fade-in-up delay-300 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                ZERO KNOWLEDGE
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                We cannot read your data. Ever. Everything is encrypted on your
                device before it reaches our servers. You hold the keys.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="animate-fade-in-up delay-100 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
                NO MASTER PASSWORD
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Forget the single point of failure. Your vault unlocks with your
                fingerprint or face, tied cryptographically to your device.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="animate-fade-in-up delay-200 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                PASSWORD GENERATOR
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Generate cryptographically strong passwords with adjustable
                entropy. Never reuse or weakly generate a password again.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="animate-fade-in-up delay-300 group corner-accent glass-card p-8 transition-all hover:border-accent/50">
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
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
              </div>
              <h3 className="font-[family-name:var(--font-inter)] text-lg font-bold tracking-wide text-foreground">
                OPEN SOURCE CORE
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Transparency is trust. Our cryptographic implementations are
                auditable and built on battle-tested open standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative border-t border-border px-6 py-32">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="noise-overlay absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <h2 className="animate-fade-in-up font-[family-name:var(--font-inter)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              HOW IT <span className="text-accent">WORKS</span>
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="animate-slide-in-left delay-100 relative">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-6xl font-black text-accent/10">
                01
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-inter)] text-xl font-bold tracking-wide text-foreground">
                REGISTER
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Choose a username. Your device generates a unique passkey pair
                using hardware-backed cryptography. No password required.
              </p>
              <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-accent/30 to-transparent md:block" />
            </div>

            <div className="animate-fade-in-up delay-200 relative">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-6xl font-black text-accent/10">
                02
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-inter)] text-xl font-bold tracking-wide text-foreground">
                ENCRYPT
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Add passwords to your vault. Each entry is encrypted with
                ML-KEM on your device before ever touching the network.
              </p>
              <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-accent/30 to-transparent md:block" />
            </div>

            <div className="animate-slide-in-right delay-300 relative">
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-6xl font-black text-accent/10">
                03
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-inter)] text-xl font-bold tracking-wide text-foreground">
                AUTHENTICATE
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Unlock with your biometrics. The passkey challenge-response
                proves your identity without ever transmitting a secret.
              </p>
              <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-accent/30 to-transparent md:block" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-border bg-surface px-6 py-32">
        <div className="noise-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="animate-fade-in-up font-[family-name:var(--font-inter)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            THE FUTURE OF SECURITY
            <br />
            <span className="text-accent">IS ALREADY HERE</span>
          </h2>
          <p className="animate-fade-in-up delay-100 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Join the next generation of digital security. Your vault awaits.
          </p>
          <div className="animate-fade-in-up delay-200 mt-10">
            <Link
              href="/register"
              className="cyber-btn inline-block px-10 py-5 text-sm"
            >
              CREATE YOUR VAULT
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="font-[family-name:var(--font-inter)] text-lg font-black tracking-wider text-foreground">
            <span className="text-accent">Q</span>VAULT
          </div>
          <div className="flex items-center gap-8">
            <Link
              href="/login"
              className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted transition-colors hover:text-foreground uppercase"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="font-[family-name:var(--font-jetbrains-mono)] text-xs font-medium tracking-widest text-muted transition-colors hover:text-foreground uppercase"
            >
              Register
            </Link>
          </div>
          <div className="font-[family-name:var(--font-jetbrains-mono)] text-xs tracking-widest text-muted">
            © 2026 QVAULT
          </div>
        </div>
      </footer>
    </div>
  );
}
