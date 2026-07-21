<div align="center">
  <br />
  <img src="./image/logo.svg" alt="Exchange-Lab Logo" width="250">
  <p><b>A high-performance, full-stack multi-asset exchange simulator designed to explore order book dynamics, real-time matching engines, and high-frequency trading architecture.</b></p>
  <br>

  <!-- Badges -->

  <img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/TimescaleDB-FDB515?style=flat&logo=timescale&logoColor=black" alt="TimescaleDB">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white" alt="Docker">

</div>

---

<p align="center">
  <img src="./image/ui.png" width="49%" alt="Exchange-Lab Web UI Preview" />
  <img src="./image/terminal.png" width="49%" alt="Trade Terminal Interface" />
</p>

## Features

- **Real-Time Matching Engine:** Custom built high-frequency limit order book (LOB) matching engine capable of instant order settlement.
- **Asynchronous Event Handling:** Highly scalable decoupled architecture using Redis Pub/Sub for rapid internal state distribution.
- **Live Market Data:** Sub-millisecond WebSocket streaming for order book updates, recent trades, and live ticker data.
- **Optimized Ledger Processing:** Asynchronous database flushing via dedicated worker threads to prevent main-thread blocking.
- **Advanced Charting:** Edge-optimized Next.js frontend featuring `lightweight-charts` for professional-grade TradingView-like charting experiences.
- **Time-Series Database:** Utilizes TimescaleDB over PostgreSQL for hyper-efficient storing and querying of financial tick data.

## Architecture Deep Dive

If you're exploring the codebase, here are some impressive engineering decisions designed for scale and hiring-grade system design:

- **Custom Snowflake ID Generation:** To avoid heavy database roundtrips for UUID generation and ensure chronological sortability without timestamps, the `engine` microservice implements a custom, bit-shifted [Snowflake ID algorithm](packages/engine/src/trade/Snowflake.ts) (inspired by Twitter). It generates 64-bit `BigInt` IDs using a combination of timestamps, worker IDs, and sequence counters, resolving in under a millisecond.
- **ACID Transaction Ledger Worker:** While the matching engine operates purely in-memory for speed, the persistence layer uses an async Redis queue `brPop` strategy. The [Ledger Worker](packages/db/src/ledgerWorker.ts) safely commits trades to Postgres using strict ACID transactions with row-level locking (`SELECT ... FOR UPDATE` on the Wallet table). This entirely prevents double-spending and race conditions during high-concurrency order settlement.
- **In-Memory Limit Order Book (LOB):** The [Orderbook](packages/engine/src/trade/Orderbook.ts) runs complex Price-Time priority matching in memory. It efficiently handles partial fills, tracks maker/taker flows, and uses hash-map aggregation (`getDepth`) to calculate live liquidity across price levels in `O(N)` time before broadcasting depth snapshots.
- **Microsecond Message Broker:** Core services are strictly decoupled. When the API accepts a trade, it goes straight to a Redis Queue. The engine processes it, then fires execution events over Redis Pub/Sub directly to the WebSocket server, bypassing the database entirely for client-facing updates.

## Tech Stack

### Languages & Frameworks

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Node.js, Express.js
- **Languages:** TypeScript (Strict Mode)

### Core Libraries

- **Real-Time & Networking:** `ws` (WebSockets)
- **Data Visualization:** TradingView Lightweight Charts
- **Validation:** Zod
- **Authentication:** NextAuth.js (with bcrypt & JWT)

### Databases & Infrastructure

- **Database:** PostgreSQL (with TimescaleDB extension)
- **Caching & Message Broker:** Redis
- **ORM:** Prisma
- **DevOps:** Docker, Docker Compose, NPM Workspaces

## Directory Structure

The project utilizes an NPM Workspace monorepo setup to keep services highly cohesive yet decoupled.

```text
packages/                       # NPM Monorepo Root
├── api/                        # REST API Microservice
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── db/                         # PostgreSQL & Prisma Ledger Worker
│   ├── prisma/
│   ├── src/
│   ├── package.json
│   └── prisma.config.ts
├── engine/                     # Core LOB Matching Engine
│   ├── src/
│   ├── snapshot.json
│   ├── package.json
│   └── tsconfig.json
├── shared/                     # Shared Types and Interfaces
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── web/                        # Next.js Web Client
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
├── ws/                         # Real-Time WebSocket Server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── package.json                # Workspaces Configuration
└── start.sh                    # Global Start Script
```

## Getting Started

### Prerequisites

- **Node.js** v20+
- **Docker & Docker Compose** (for running databases and services)

### Environment Variables

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Ensure you have the following essential keys configured (mock values shown):

```env
# Database & Redis
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=exchange_lab
DATABASE_URL=postgresql://postgres:secure_password_here@localhost:5432/exchange_lab?schema=public
REDIS_URL=redis://localhost:6379

# Internal Services
PORT_WEB=3000
PORT_API=3001
PORT_WS=3002

# Public Endpoints
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_REST_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3002
```

### Installation & Local Setup

1. **Install Dependencies:**
   Install packages across all workspaces using NPM:

   ```bash
   cd packages && npm install
   ```

2. **Database Initialization:**
   Start the supporting infrastructure via Docker:

   ```bash
   docker compose up -d postgres redis
   ```

   _Note: Wait a few seconds for TimescaleDB to fully initialize._

3. **Generate Prisma Client & Push Schema:**
   ```bash
   npm run db:generate --workspace=packages/db
   npm run db:push --workspace=packages/db
   ```

### Running the Project

#### Development Mode (Local Services)

You can run all microservices locally on your host machine:

```bash
# Start all internal microservices and frontend in dev mode
cd packages
npm run dev:all
```

_(Alternatively, you can use the provided `./packages/start.sh` to run the built output for backends alongside Next.js)._

#### Production / Full Docker Compose Mode

To run the entire stack (including API, Engine, WS, Web, and Ledger worker) entirely inside Docker:

```bash
docker compose build
docker compose up -d
```

## Architecture Overview

![System Architecture Diagram](./image/architecture.png)

The platform operates on a robust event-driven architecture designed to mimic real-world financial exchanges.

When a user places an order via the **Next.js Web Client**, the request hits the **API Gateway** (`packages/api`). The API validates the order, deducts available balances, and pushes the transaction payload into a **Redis Queue**. The **Matching Engine** (`packages/engine`), running in an isolated execution loop, pops orders off this queue and computes matches against the in-memory Limit Order Book (LOB).

Upon matching, the engine publishes trade execution events over **Redis Pub/Sub**. The **WebSocket Server** (`packages/ws`) intercepts these events and broadcasts live UI updates to connected clients. Concurrently, a decoupled **Ledger Worker** (`packages/db/workers/ledgerWorker.js`) safely persists the updated balances and trade history into **PostgreSQL / TimescaleDB**, ensuring zero-blocking persistence and high throughput.

## Contributing & License

We welcome contributions from the community to make Exchange-Lab a better learning resource. To contribute:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

**License**  
This project is licensed under the **MIT License**. See the `LICENSE` file for details (or refer to the baseline MIT standard terms).

## Social Assets

If you'd like to share or write about Exchange-Lab (e.g., on LinkedIn, Twitter, or blogs), feel free to use the promotional asset below!

<p align="center">
  <img src="./image/banner.png" alt="Exchange-Lab Promo Image" width="80%">
</p>
