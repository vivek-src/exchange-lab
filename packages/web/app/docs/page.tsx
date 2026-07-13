import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Layers, Zap, Database, Server, Globe, Box } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            System Architecture & Documentation
          </h1>
          <p className="text-sm text-muted-foreground">How XCHG Lab works under the hood</p>
        </div>
      </div>

      <Separator />

      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Layers className="size-4" /> Overview
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Exchange Lab is a highly decoupled, microservices-based stock exchange simulator. 
          The project is structured as a monorepo containing specialized packages that work together to handle user authentication, order placement, order matching, and real-time updates. 
          Communication between services is facilitated by <strong>Redis</strong>, while persistent data is stored in <strong>PostgreSQL</strong>.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Box className="size-4" /> Monorepo Packages
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The system is divided into several discrete packages located in the <code>/packages</code> directory:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Globe className="size-4 text-blue-500" /> web</h3>
            <p className="text-xs text-muted-foreground mt-2">
              Next.js (App Router) frontend. Handles the user interface, NextAuth authentication, charting (lightweight-charts), and interacts with the API and WebSocket server. Built with Tailwind CSS and shadcn/ui.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Server className="size-4 text-green-500" /> api</h3>
            <p className="text-xs text-muted-foreground mt-2">
              Node.js/Express REST API. Acts as the primary gateway for clients to place orders, fetch history, and manage their accounts. Pushes order actions to the Engine via Redis queues.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Zap className="size-4 text-yellow-500" /> engine</h3>
            <p className="text-xs text-muted-foreground mt-2">
              The core matching engine. Maintains an in-memory Orderbook for extreme performance. It consumes order events from Redis, matches them using price-time priority, and publishes trade events back to Redis.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Layers className="size-4 text-purple-500" /> ws</h3>
            <p className="text-xs text-muted-foreground mt-2">
              WebSocket server for real-time communication. Subscribes to Redis pub/sub channels and broadcasts orderbook updates, trades, and user-specific events directly to the frontend clients.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Database className="size-4 text-orange-500" /> db</h3>
            <p className="text-xs text-muted-foreground mt-2">
              The database package using Prisma ORM. Centralizes the PostgreSQL schema and client generation, providing typed database access to the API, Engine, and Web layers.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium flex items-center gap-2"><Box className="size-4 text-gray-500" /> shared</h3>
            <p className="text-xs text-muted-foreground mt-2">
              Contains shared TypeScript types, interfaces, and protocol definitions (e.g., Redis message schemas, WebSocket payloads) to ensure type safety across all microservices.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Life of a Trade
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground leading-relaxed ml-2">
          <li><strong>Placement:</strong> A user places an order via the <strong>Web</strong> frontend, hitting the <strong>API</strong>.</li>
          <li><strong>Queueing:</strong> The API validates the user's wallet balance and pushes an <code>ORDER_PLACE</code> message to a Redis queue.</li>
          <li><strong>Matching:</strong> The <strong>Engine</strong> processes the queue sequentially, updating its in-memory orderbook. If a match occurs, it executes the trade.</li>
          <li><strong>Persistence & Notification:</strong> The Engine persists the trade and balance updates to <strong>PostgreSQL</strong> (via the <code>db</code> package) and publishes the trade events to Redis Pub/Sub.</li>
          <li><strong>Broadcast:</strong> The <strong>WS</strong> (WebSocket) server listens to these Redis channels and forwards the real-time updates to subscribed web clients.</li>
        </ol>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          REST API Endpoints
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The <code>api</code> package exposes several routes for trading and fetching market data:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-blue-500">POST /api/v1/order</h3>
            <p className="text-xs text-muted-foreground mt-2">Places a new order in the specified market.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-red-500">DELETE /api/v1/order</h3>
            <p className="text-xs text-muted-foreground mt-2">Cancels an existing active order.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-green-500">GET /api/v1/order/open</h3>
            <p className="text-xs text-muted-foreground mt-2">Retrieves all open orders for a specific user and market.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-green-500">GET /api/v1/depth</h3>
            <p className="text-xs text-muted-foreground mt-2">Returns the current orderbook depth (bids and asks) for a market.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-green-500">GET /api/v1/trades</h3>
            <p className="text-xs text-muted-foreground mt-2">Returns the most recent executed trades for a given market.</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-green-500">GET /api/v1/klines</h3>
            <p className="text-xs text-muted-foreground mt-2">Fetches candlestick (OHLCV) data for charting in various intervals (1m, 1h, 1d, 1w).</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium font-mono text-sm text-green-500">GET /api/v1/tickers</h3>
            <p className="text-xs text-muted-foreground mt-2">Fetches 24-hour ticker statistics (price change, volume, high, low) for one or all markets.</p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Database Schema Overview
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The database tracks the state of the users and historical trades:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
          <li><strong>User & Account:</strong> Handles authentication (NextAuth).</li>
          <li><strong>Wallet:</strong> Stores user balances and assets. By default, users receive an initial $50,000 balance upon signup.</li>
          <li><strong>Transaction:</strong> An audit trail of every credit and debit (e.g., ORDER_BUY, ORDER_SELL).</li>
          <li><strong>Trades (Hypertable):</strong> A time-series ledger of all executed trades across markets, optimized as a TimescaleDB hypertable.</li>
          <li><strong>Klines (Continuous Aggregates):</strong> Utilizing TimescaleDB, four continuous aggregates (<code>klines_1m</code>, <code>klines_1h</code>, <code>klines_1d</code>, <code>klines_1w</code>) are maintained automatically via refresh policies. These compute OHLCV (Open, High, Low, Close, Volume) data from the trades table for high-performance charting.</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Tech Stack</h2>
        <div className="space-y-2">
          {[
            { label: "Frontend Framework", value: "Next.js (App Router)" },
            { label: "Backend API", value: "Node.js / Express" },
            { label: "Database", value: "PostgreSQL" },
            { label: "ORM", value: "Prisma" },
            { label: "Message Broker", value: "Redis (Pub/Sub & Queues)" },
            { label: "Real-time", value: "Node.js WebSocket" },
            { label: "UI Library", value: "shadcn/ui + Tailwind CSS" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <span className="w-40 text-muted-foreground">{item.label}</span>
              <Badge variant="outline">{item.value}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
