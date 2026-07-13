import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Layers,
  Zap,
  Database,
  Server,
  Globe,
  Box,
} from "lucide-react";

const PACKAGES = [
  {
    title: "web",
    icon: Globe,
    description:
      "Next.js frontend responsible for authentication, trading interface, charting, and communication with the REST API and WebSocket server.",
  },
  {
    title: "api",
    icon: Server,
    description:
      "Express API responsible for validating requests, managing accounts, and forwarding orders to the matching engine.",
  },
  {
    title: "engine",
    icon: Zap,
    description:
      "The core matching engine maintaining an in-memory order book with deterministic price-time priority execution.",
  },
  {
    title: "ws",
    icon: Layers,
    description:
      "WebSocket gateway broadcasting market depth, trades, ticker updates, and private user events.",
  },
  {
    title: "db",
    icon: Database,
    description:
      "Shared Prisma package providing typed access to PostgreSQL and TimescaleDB across every service.",
  },
  {
    title: "shared",
    icon: Box,
    description:
      "Shared TypeScript types, Redis payloads, WebSocket messages, and protocol definitions used throughout the monorepo.",
  },
];

const API_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/order",
    description: "Place a new order.",
  },
  {
    method: "DELETE",
    path: "/api/v1/order",
    description: "Cancel an active order.",
  },
  {
    method: "GET",
    path: "/api/v1/order/open",
    description: "Retrieve open orders.",
  },
  {
    method: "GET",
    path: "/api/v1/depth",
    description: "Fetch market depth.",
  },
  {
    method: "GET",
    path: "/api/v1/trades",
    description: "Retrieve recent trades.",
  },
  {
    method: "GET",
    path: "/api/v1/klines",
    description: "Retrieve OHLCV candle data.",
  },
  {
    method: "GET",
    path: "/api/v1/tickers",
    description: "Retrieve 24-hour ticker statistics.",
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      {/* Hero */}

      <section className="max-w-6xl">
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 text-muted-foreground" />

          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Documentation
          </p>
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          System Architecture
        </h1>

        <p className="mt-6 text-base leading-8 text-muted-foreground">
          This document provides an overview of the architecture behind XCHG
          Lab, including its services, request flow, persistence layer, and
          communication between components.
        </p>
      </section>

      <Separator className="my-20" />

      {/* Overview */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Overview
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            A modular exchange architecture.
          </h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            XCHG Lab is structured as a collection of independent services.
            Orders flow through the REST API into the matching engine, execution
            results are persisted in PostgreSQL and TimescaleDB, while Redis
            distributes events to WebSocket services for real-time market
            updates.
          </p>
        </div>
      </section>

      <Separator className="my-20" />

      {/* Packages */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Monorepo Packages
          </p>

          <h2 className="mt-3 text-2xl font-semibold">Independent services.</h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            Every package is responsible for a single concern, allowing the
            system to remain modular while sharing common types and interfaces.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PACKAGES.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-border p-6 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-muted-foreground" />

                  <h3 className="font-medium">{item.title}</h3>
                </div>

                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator className="my-20" />

      {/* Life of a Trade */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Request Flow
          </p>

          <h2 className="mt-3 text-2xl font-semibold">Life of a trade.</h2>
        </div>

        <div className="mt-12 divide-y divide-border">
          {[
            [
              "1.",
              "Placement",
              "The client submits an order through the trading interface to the REST API.",
            ],
            [
              "2.",
              "Validation",
              "The API validates balances and forwards the request to Redis.",
            ],
            [
              "3.",
              "Matching",
              "The engine processes queued orders sequentially using price-time priority.",
            ],
            [
              "4.",
              "Persistence",
              "Trades and balances are committed to PostgreSQL and TimescaleDB.",
            ],
            [
              "5.",
              "Broadcast",
              "Redis publishes events which are streamed to connected WebSocket clients.",
            ],
          ].map(([step, title, desc]) => (
            <div
              key={step}
              className="grid gap-5 py-8 md:grid-cols-[100px_220px_1fr]">
              <span className="font-mono text-muted-foreground">{step}</span>

              <h3 className="font-medium">{title}</h3>

              <p className="leading-7 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-20" />
      {/* REST API */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            REST API
          </p>

          <h2 className="mt-3 text-2xl font-semibold">Public endpoints.</h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            The REST API acts as the primary entry point for clients. It handles
            authentication, order placement, historical market data, and account
            management before forwarding requests to the matching engine.
          </p>
        </div>

        <div className="mt-14 rounded-xl border border-border overflow-hidden">
          {API_ENDPOINTS.map((endpoint, index) => (
            <div
              key={endpoint.path + endpoint.method}
              className={`grid items-center gap-4 px-6 py-5 md:grid-cols-[100px_260px_1fr] ${
                index !== API_ENDPOINTS.length - 1
                  ? "border-b border-border"
                  : ""
              }`}>
              <Badge
                variant="outline"
                className="w-fit font-mono text-xs tracking-wide">
                {endpoint.method}
              </Badge>

              <code className="text-sm">{endpoint.path}</code>

              <p className="text-sm text-muted-foreground">
                {endpoint.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-20" />

      {/* Database */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Database
          </p>

          <h2 className="mt-3 text-2xl font-semibold">Persistent storage.</h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            PostgreSQL stores user accounts, balances, orders, and transaction
            history, while TimescaleDB extends PostgreSQL with time-series
            capabilities for efficient trade history and candlestick generation.
          </p>
        </div>

        <div className="mt-14 divide-y divide-border">
          {[
            {
              title: "Users & Accounts",
              description:
                "Authentication and user account management powered by NextAuth.",
            },
            {
              title: "Wallets",
              description: "Stores balances and assets available for trading.",
            },
            {
              title: "Transactions",
              description:
                "Maintains a complete audit trail for deposits, withdrawals, and executed trades.",
            },
            {
              title: "Trades",
              description:
                "TimescaleDB hypertable containing every executed trade across all markets.",
            },
            {
              title: "Klines",
              description:
                "Continuous aggregates generate 1m, 1h, 1d, and 1w OHLCV data for charting.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="grid gap-5 py-8 md:grid-cols-[220px_1fr]">
              <h3 className="font-medium">{item.title}</h3>

              <p className="leading-7 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-20" />

      {/* Technology */}

      <section>
        <div className="max-w-6xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Technology Stack
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Built with modern tools.
          </h2>

          <p className="mt-6 leading-8 text-muted-foreground">
            XCHG Lab combines a modern TypeScript stack with real-time
            messaging, relational storage, and an in-memory matching engine to
            simulate the architecture of a modern electronic exchange.
          </p>
        </div>

        <div className="mt-14 divide-y divide-border">
          {[
            {
              label: "Frontend",
              value: "Next.js (App Router), React, Tailwind CSS, shadcn/ui",
            },
            {
              label: "Backend",
              value: "Node.js, Express",
            },
            {
              label: "Database",
              value: "PostgreSQL, TimescaleDB, Prisma ORM",
            },
            {
              label: "Messaging",
              value: "Redis Pub/Sub and Queues",
            },
            {
              label: "Realtime",
              value: "Native WebSockets",
            },
            {
              label: "Language",
              value: "TypeScript",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="grid gap-5 py-8 md:grid-cols-[220px_1fr]">
              <h3 className="font-medium">{item.label}</h3>

              <p className="leading-7 text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-20" />

      {/* Footer */}

      <section className="max-w-6xl">
        <h2 className="text-2xl font-semibold tracking-tight">
          Engineering through implementation.
        </h2>

        <p className="mt-6 leading-8 text-muted-foreground">
          XCHG Lab rebuilds the core systems behind a modern electronic exchange
          to better understand matching engines, market data distribution,
          real-time communication, and distributed backend architecture.
        </p>

        <p className="mt-6 leading-8 text-muted-foreground">
          Every component is designed and implemented independently to explore
          the engineering trade-offs involved in building scalable exchange
          infrastructure from first principles.
        </p>
      </section>
    </main>
  );
}
