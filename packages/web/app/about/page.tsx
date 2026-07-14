import ContactCard from "@/components/contactCard";

const PRINCIPLES = [
  {
    title: "Matching Engine",
    description:
      "A deterministic price-time priority matching engine built from scratch using in-memory order books for predictable order execution.",
  },
  {
    title: "Real-time Market Data",
    description:
      "Market depth, trades, and ticker updates are streamed over WebSockets with low-latency event delivery.",
  },
  {
    title: "Persistent Storage",
    description:
      "Orders, trades, and historical market data are stored in PostgreSQL and TimescaleDB for analytics and charting.",
  },
  {
    title: "Service-Oriented Design",
    description:
      "Independent services communicate through Redis to keep the platform modular, maintainable, and scalable.",
  },
];

const STACK = [
  "TypeScript",
  "Node.js",
  "Next.js",
  "Express",
  "Redis",
  "PostgreSQL",
  "TimescaleDB",
  "Prisma",
  "WebSocket",
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  // Matches the landing page's "Built for the desk" eyebrow treatment —
  // small brand-cyan dash + mono uppercase label — instead of plain
  // muted-foreground text with no accent.
  return (
    <div className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
      <span className="h-px w-5 bg-[var(--brand-cyan)]" />
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-24">
      {/* Hero */}
      <section className="max-w-6xl">
        <Eyebrow>About</Eyebrow>

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight sm:text-2xl">
          Understanding exchange infrastructure by building it from scratch.
        </h1>

        <div className="mt-8 space-y-6 text-base leading-8 text-muted-foreground">
          <p>
            Most trading platforms expose charts, prices, and order forms while
            the infrastructure underneath remains hidden.
          </p>

          <p>
            <span className="font-medium text-foreground">XCHG Lab</span> is an
            exchange infrastructure project that rebuilds the core systems
            behind a modern electronic exchange—including the matching engine,
            order book, market data pipeline, and trading interface—to explore
            how these components work together.
          </p>
          <blockquote className="border-l-2 border-[var(--brand-cyan)] pl-5 italic text-foreground">
            Build first. Understand every layer. Optimize later.
          </blockquote>
        </div>
      </section>

      {/* Engineering Focus */}
      <section className="mt-24 border-t border-border pt-16">
        <div className="max-w-3xl">
          <Eyebrow>Engineering Focus</Eyebrow>

          <h2 className="mt-3 font-display text-2xl font-semibold">
            Core components of the project.
          </h2>

          <p className="mt-4 leading-7 text-muted-foreground">
            Every subsystem is implemented independently to understand the
            architecture behind modern electronic exchanges instead of relying
            on third-party services.
          </p>
        </div>

        <div className="mt-14 divide-y divide-border">
          {PRINCIPLES.map((item) => (
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

      {/* Technology */}
      <section className="mt-24 border-t border-border pt-16">
        <div className="max-w-3xl">
          <Eyebrow>Technology</Eyebrow>

          <h2 className="mt-3 font-display text-2xl font-semibold">
            Built with modern tools.
          </h2>

          <p className="mt-4 leading-7 text-muted-foreground">
            XCHG Lab is built using a modern TypeScript stack focused on
            real-time communication, reliable persistence, and modular backend
            services.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {STACK.map((tech) => (
            <div key={tech}>
              <span className="text-sm text-muted-foreground transition-colors hover:text-[var(--brand-cyan)]">
                {tech}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Project */}
      <section className="mt-24 border-t border-border pt-16">
        <div className="max-w-3xl">
          <Eyebrow>Project</Eyebrow>

          <h2 className="mt-3 font-display text-2xl font-semibold">
            Built from first principles.
          </h2>

          <div className="mt-6 space-y-6 leading-8 text-muted-foreground">
            <p>
              The matching engine, order book, market data streaming, historical
              storage, and trading interface are all functional and continue to
              evolve as new ideas are explored.
            </p>

            <p>
              The goal isn't to replicate a commercial exchange
              feature-for-feature, but to understand the engineering trade-offs
              involved in building one from first principles.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="pt-16">
        <div className="mt-12 scroll-mt-24" id="contact">
          <ContactCard />
        </div>
        <div className="border-t border-border py-12">
          <p className="max-w-6xl text-sm leading-7 text-muted-foreground">
            XCHG Lab is an Experimental exchange infrastructure project focused
            on exchange infrastructure, distributed systems, and low-latency
            backend architecture. It is intended for research, experimentation,
            and education rather than production trading.
          </p>
        </div>
      </section>
    </main>
  );
}
