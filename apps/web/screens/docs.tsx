import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Documentation
          </h1>
          <p className="text-sm text-muted-foreground">How XCHG Lab works</p>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Exchange Lab is a simulated stock exchange built to understand how
          real-world exchanges work under the hood. It is not connected to real
          markets and uses virtual money only. The goal is to learn by doing —
          place orders, watch them get matched, and track your portfolio in real
          time.
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Getting Started
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign up with your email and password. Every new account is credited
          with <span className="text-foreground font-medium">$10,000</span> in
          virtual balance automatically. Once logged in, head to the trading
          page, pick a ticker, and place your first order. When your order is
          matched you will see it in your Orders page and your wallet balance
          will update accordingly.
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Orderbook & Matching Engine
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The orderbook lives entirely in memory. When you place an order it is
          added as either a bid (buy) or an ask (sell). The matching engine
          continuously scans the book and pairs orders where the buy price is
          greater than or equal to the sell price — this is known as price-time
          priority matching.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When a match is found both the buyer and the seller have their wallets
          updated and the trade is written to the transaction table. Orders that
          have not yet been matched remain in the orderbook until they are
          filled or cancelled. Because the orderbook is in-memory it resets if
          the server restarts — only filled orders are persisted to the
          database.
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Virtual Balance
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every account starts with $10,000 stored in the Wallet table. When you
          buy, the trade amount is debited from your balance. When you sell, the
          proceeds are credited back. Every movement is recorded in the
          Transaction table giving you a full audit trail of every debit and
          credit. Your available balance reflects funds not tied up in open
          orders.
        </p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Authentication</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Authentication is handled by NextAuth with support for manual email
          and password signup. Passwords are hashed with bcrypt before being
          stored. Sessions are JWT-based and all protected routes are guarded by
          middleware so unauthenticated users are redirected to the login page
          automatically. Email verification is stubbed out and not active in the
          current build.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Tech Stack</h2>
        <div className="space-y-2">
          {[
            { label: "Framework", value: "Next.js (App Router)" },
            { label: "Auth", value: "NextAuth" },
            { label: "Database", value: "PostgreSQL via Prisma" },
            { label: "UI", value: "shadcn/ui + Tailwind CSS" },
            { label: "Orderbook", value: "In-memory (Node.js)" },
            { label: "Matching Engine", value: "Price-time priority" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <span className="w-36 text-muted-foreground">{item.label}</span>
              <Badge variant="outline">{item.value}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
