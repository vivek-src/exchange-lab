<div align="center">
  <br />
  <img src="./image/logo.svg" alt="Exchange-Lab Logo" width="220">

  <p>
    A production-inspired cryptocurrency/equity exchange simulator - a custom in-memory matching engine,
    event-driven settlement, live WebSocket market data, and TradingView-style charting -
    built to explore low-latency system design and exchange infrastructure.
  </p>

  <p>
    <a href="https://xchg.viveksahu.com"><b>Live Demo</b></a> ·
    <a href="#architecture"><b>Architecture</b></a> ·
    <a href="#getting-started"><b>Getting Started</b></a>
  </p>

  <br>

<img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js">
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white" alt="Express.js">
<img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/TimescaleDB-FDB515?style=flat&logo=timescale&logoColor=black" alt="TimescaleDB">
<img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis">
<img src="https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white" alt="Docker">
<img src="https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma">
<img src="https://img.shields.io/badge/WebSocket-010101?style=flat&logo=socketdotio&logoColor=white" alt="WebSocket">

</div>

---

<p align="center">
  <img src="./image/ui.png" width="49%" alt="Exchange-Lab trading dashboard - markets overview and live pricing" />
  <img src="./image/terminal.png" width="49%" alt="Exchange-Lab trade terminal - order entry, order book, and trade tape" />
</p>

<!--
  Recommended: replace/add a 15-20s GIF here showing login → place order →
  order book update → chart update → balance update. This is the single
  highest-impact addition for a resume-linked README - a reader will watch
  a GIF far more readily than they'll read prose.
-->

## Table of Contents

- [Highlights](#highlights)
- [Try It Live](#try-it-live)
- [Why I Built This](#why-i-built-this)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Engineering Decisions](#engineering-decisions)
- [Engineering Challenges](#engineering-challenges)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Performance](#performance)
- [Roadmap](#roadmap)
- [Contributing & License](#contributing--license)

## Highlights

- Custom price-time priority matching engine, running fully in memory
- Event-driven microservice architecture - every service communicates only through Redis
- Redis queue for order intake, Redis Pub/Sub for state distribution
- Live WebSocket market data streaming (order book, trades, ticker)
- ACID-compliant ledger worker with row-level locking for settlement
- Custom Snowflake ID generation for sortable, collision-free order IDs
- TimescaleDB for time-series storage of trades and OHLCV candles
- TradingView-style charting via Lightweight Charts
- JWT-based authentication (NextAuth + bcrypt)
- Fully Dockerized, deployed behind Nginx on a self-managed Linux VM

## Try It Live

The hosted demo gives every visitor a virtual ₹50,000 balance, no signup required to browse, and no real money involved - the point is to practice against realistic order matching and slippage, not to risk anything.

Live markets: **RIL/INR** ([trade now](https://xchg.viveksahu.com/trade/RIL_INR)) · **TATA/INR** · **SOL/INR**

Each terminal includes a live price ticker (24H high/low, volume), candlestick charts across four timeframes, limit and market order types, a live order book, a trade tape, and portfolio/wallet tracking once logged in.

## Why I Built This

I wanted to understand how a real exchange keeps order matching fast while keeping account balances consistent under concurrent load - that intersection of low-latency systems and correctness is genuinely hard to get right, and reading about it isn't the same as building it.

The focus areas were:

- Matching engine design (price-time priority, partial fills, maker/taker tracking)
- Event-driven architecture and service decoupling
- Concurrency-safe settlement (no double-spends, no lost updates)
- Real-time data delivery over WebSockets
- Time-series data modeling for financial tick data

## Features

- **Matching engine** - in-memory, price-time priority order book with partial fill support.
- **Event-driven core** - services communicate exclusively via Redis queue + Pub/Sub, no direct service-to-service calls.
- **Live market data** - WebSocket streaming for order book depth, trade tape, and ticker updates.
- **Async settlement** - a dedicated ledger worker persists trades under ACID transactions, off the matching engine's hot path.
- **Charting** - TradingView-style candlestick charts via Lightweight Charts, backed by TimescaleDB continuous aggregates.
- **Auth** - JWT-based session auth via NextAuth, with bcrypt password hashing.

## Tech Stack

| Category           | Technologies                                     |
| ------------------ | ------------------------------------------------ |
| **Frontend**       | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| **Backend**        | Node.js, Express.js, TypeScript                  |
| **Messaging**      | Redis (queue + Pub/Sub)                          |
| **Database**       | PostgreSQL, TimescaleDB extension                |
| **ORM**            | Prisma                                           |
| **Charts**         | TradingView Lightweight Charts                   |
| **Auth**           | NextAuth.js, bcrypt, JWT                         |
| **Validation**     | Zod                                              |
| **Infrastructure** | Docker, Docker Compose, Nginx, npm workspaces    |

## Architecture

![System Architecture Diagram](./image/architecture.png)

**Order flow, step by step:**

1. User submits an order via the **Next.js** client
2. Request hits the **API** (an independent Express/Node process)
3. API pushes the order onto a **Redis queue**, tagged with a snowflake ID
4. The **Engine** (continuous while-loop) pops the order off the queue
5. Engine validates it against current balances/assets, then matches it against the in-memory order book
6. Engine publishes the result over **Redis Pub/Sub**
7. **API** (subscribed on that snowflake ID) resolves the original client request
8. **WebSocket server** (subscribed independently) broadcasts the update to connected clients
9. **Ledger Worker** (also subscribed independently) persists the trade to **PostgreSQL** under an ACID transaction
10. A **TimescaleDB worker** syncs trade data into a kline-optimized hypertable, which the **Chart Manager** consumes to drive live charts

**Why this shape:** steps 7, 8, and 9 all react to the _same_ published event, independently, with no awareness of each other. That's the core design choice - the API doesn't wait on the database, the WebSocket server doesn't wait on the ledger, and the ledger doesn't block client-facing latency. Each piece can be scaled, restarted, or replaced without touching the others.

**Auth path:** registration and login are handled by **Next.js** via NextAuth, writing user records to PostgreSQL - which the Engine reads from for balance/asset validation during order processing.

## Engineering Decisions

- **Redis queue for order intake, not a direct function call** - the API can acknowledge a submitted order immediately without waiting on the engine to finish matching it, keeping client-facing latency decoupled from matching throughput.
- **In-memory order book** - matching needs to happen without a database round-trip in the hot path; the book lives in the engine's memory, and persistence happens asynchronously afterward.
- **Snowflake IDs over UUIDs** - IDs need to be chronologically sortable without a timestamp column and generated without a database round-trip; a bit-shifted snowflake ID (timestamp + worker ID + sequence counter) gives both in one 64-bit `BigInt`, resolving in under a millisecond. ([`Snowflake.ts`](packages/engine/src/trade/Snowflake.ts))
- **Row-level locking in the ledger worker** - concurrent trades touching the same wallet could otherwise race; `SELECT ... FOR UPDATE` inside an ACID transaction closes that gap. ([`ledgerWorker.ts`](packages/db/src/ledgerWorker.ts))
- **Pub/Sub fan-out instead of a shared callback** - the WebSocket server and ledger worker both need to react to the same trade event, but neither needs to know the other exists; Pub/Sub lets them subscribe independently rather than chaining calls.
- **TimescaleDB over plain PostgreSQL** - OHLCV/kline queries over large tick-data volumes are dramatically cheaper with continuous aggregates than computing candles on read from a raw trades table.

## Engineering Challenges

- **Maintaining price-time priority** while handling partial fills and maker/taker tracking correctly, without letting book state drift from what's been persisted.
- **Avoiding race conditions** in balance settlement when multiple trades against the same wallet can arrive concurrently - solved with row-level locking in the ledger worker rather than trusting application-level checks.
- **Keeping matching entirely in-memory** while still guaranteeing every trade eventually lands durably in Postgres - the two halves of the system (fast in-memory execution, slower durable persistence) had to stay correct independently.
- **Synchronizing live UI state** across order book depth, trade tape, ticker, and charts, all fed by the same event stream, without the frontend polling anything.
- **Preventing double-spending** during high-concurrency settlement - the same problem real exchanges solve with transactional guarantees, tackled here at a smaller scale.
- **BigInt serialization** - trade IDs and balances as `BigInt` don't serialize to JSON by default, which needed explicit handling across the API/WebSocket boundary.
- **A Prisma `DateTime` vs. `timestamptz` mismatch** that was silently producing future-dated trade timestamps until traced back to timezone handling in the schema.

## Directory Structure

```text
exchange-lab/
├── packages/
│   ├── api/       # REST API (Express) - orders, klines, trades, ticker
│   ├── engine/    # In-memory matching engine
│   ├── ws/        # WebSocket server - live market data broadcast
│   ├── db/        # Prisma schema + trades ledger worker
│   ├── web/       # Next.js frontend
│   └── shared/    # Shared types/interfaces across services
├── docker-compose.yml
├── nginx-sites.conf       # Reverse proxy routing
├── nginx-upstream.conf    # Upstream service definitions
└── .env.example
```

## Getting Started

### Prerequisites

- **Node.js** v20+
- **Docker & Docker Compose**

### Setup

```bash
# 1. Configure environment
cp .env.example .env

# 2. Install dependencies across all workspaces
cd packages && npm install

# 3. Start Postgres + Redis
docker compose up -d postgres redis
# (wait a few seconds for TimescaleDB to initialize)

# 4. Generate Prisma client and push schema
npm run db:generate --workspace=packages/db
npm run db:push --workspace=packages/db
```

Key environment variables (see `.env.example` for the full list):

```env
DATABASE_URL=postgresql://postgres:secure_password_here@localhost:5432/exchange_lab?schema=public
REDIS_URL=redis://localhost:6379
PORT_WEB=3000
PORT_API=3001
PORT_WS=3002
```

### Running

**Development** (all services on the host):

```bash
cd packages && npm run dev:all
```

_(or `./packages/start.sh` to run built output for backend services alongside Next.js)_

**Production** (fully Dockerized):

```bash
docker compose build && docker compose up -d
```

## Deployment

The live demo runs on a self-managed **Linux VM**, with services orchestrated via **Docker Compose** and **Nginx** as the single public-facing reverse proxy (`nginx-sites.conf`, `nginx-upstream.conf`).

Nginx handles routing to the correct internal service, TLS termination, and upgrading/proxying WebSocket connections through to the `ws` service. Internal service ports are never exposed directly to the internet.

## Performance

No formal load testing has been run yet - treat the following as architectural reasoning, not benchmarks:

- **Order-to-publish latency:** likely low single-digit milliseconds under light load, dominated by Redis round-trips rather than the in-memory matching step itself.
- **Throughput:** a single engine process could plausibly handle hundreds to low thousands of orders/sec before the Redis queue or the single-threaded matching loop becomes the bottleneck.
- **Concurrent WebSocket clients:** likely comfortable into the low thousands on a single small VM before `ws` needs to be scaled horizontally.

Real benchmarks (order processing latency, Redis publish latency, WebSocket round-trip time, memory footprint under load) are the top item on the roadmap below - until then, these numbers shouldn't be quoted as measured facts.

## Roadmap

- [ ] Automated test coverage - unit tests for the matching engine, integration tests for the settlement flow
- [ ] CI pipeline (build/lint/test on PRs)
- [ ] Load testing to replace the estimates above with measured numbers
- [ ] Additional order types (stop, IOC/FOK)
- [ ] Multi-asset order book support beyond the current pairs
- [ ] Historical backtesting mode

## Contributing & License

Contributions are welcome:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push and open a pull request

Licensed under the **MIT License** - see [`LICENSE`](./LICENSE).

<p align="center">
  <img src="./image/banner.png" alt="Exchange-Lab Promo Image" width="90%">
</p>
