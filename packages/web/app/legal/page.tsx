import { Separator } from "@/components/ui/separator";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
      <span className="h-px w-5 bg-[var(--brand-cyan)]" />
      {children}
    </div>
  );
}

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      {/* Hero */}
      <section className="max-w-6xl">
        <div className="flex items-center gap-3">
          <Eyebrow>Legal</Eyebrow>
        </div>

        <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight">
          Terms & Privacy
        </h1>

        <p className="mt-6 text-base leading-8 text-muted-foreground">
          XCHG Lab is an experimental exchange infrastructure project intended for research and educational purposes. Please read our terms and privacy policy carefully, as they reflect the non-production nature of this platform.
        </p>
      </section>

      <Separator className="my-20" />

      {/* Terms of Service */}
      <section className="scroll-mt-24" id="terms">
        <div className="max-w-6xl">
          <Eyebrow>Terms of Service</Eyebrow>

          <h2 className="mt-3 font-display text-2xl font-semibold">
            Educational use only.
          </h2>
          <p className="mt-6 leading-8 text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="mt-14 divide-y divide-border">
          {[
            {
              title: "1. Experimental Platform",
              description: "XCHG Lab is built from scratch to explore exchange infrastructure. It is NOT a real trading platform. All assets, balances, and trades on this platform are simulated and have no real-world value.",
            },
            {
              title: "2. No Financial Liability",
              description: "Because this is an educational project, we accept no liability for any perceived financial loss, data loss, or service interruption. The platform may be reset, modified, or taken offline at any time without notice.",
            },
            {
              title: "3. User Conduct",
              description: "You agree not to abuse the API, attempt to exploit the matching engine, or overload the WebSocket servers intentionally. While this is an experimental playground, please be respectful of the shared infrastructure.",
            },
            {
              title: "4. Account Termination",
              description: "We reserve the right to suspend or terminate access to any account that disrupts the platform or violates these terms, to ensure a stable environment for other researchers and users.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="grid gap-5 py-8 md:grid-cols-[240px_1fr]">
              <h3 className="font-medium text-foreground">{item.title}</h3>

              <p className="leading-7 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-20" />

      {/* Privacy Policy */}
      <section className="scroll-mt-24" id="privacy">
        <div className="max-w-6xl">
          <Eyebrow>Privacy Policy</Eyebrow>

          <h2 className="mt-3 font-display text-2xl font-semibold">
            Data collection and usage.
          </h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="mt-14 divide-y divide-border">
          {[
            {
              title: "1. Information We Collect",
              description: "When you sign up, we collect basic authentication information such as your name and email address. We also store your simulated balances, order history, and trade execution data in our PostgreSQL and TimescaleDB databases.",
            },
            {
              title: "2. How We Use Your Data",
              description: "Your data is used solely to facilitate the simulated exchange environment. Order and trade data are processed by the matching engine and broadcasted to other users to maintain the public order book and recent trades feed.",
            },
            {
              title: "3. Public Market Data",
              description: "Please be aware that like a real exchange, orders placed on the order book and executed trades are public data. While they are not directly linked to your email publicly, the order prices, sizes, and timestamps are broadcasted via WebSockets and REST APIs.",
            },
            {
              title: "4. Data Retention and Deletion",
              description: "As this is an experimental project, databases may be wiped periodically. If you wish to have your account and associated data manually deleted, please contact the maintainer via the GitHub or LinkedIn links in the footer.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="grid gap-5 py-8 md:grid-cols-[240px_1fr]">
              <h3 className="font-medium text-foreground">{item.title}</h3>

              <p className="leading-7 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
