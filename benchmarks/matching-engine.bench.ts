/**
 * Matching Engine Performance Benchmark
 *
 * Benchmarks the raw matching engine performance without HTTP/Redis/DB overhead.
 *
 * KNOWN ENGINE BEHAVIOR (not fixed here — this is a benchmark, not an engine patch):
 * Orderbook.addOrder() re-sorts the full asks/bids array on every call
 * (O(m log m) per order, m = resting orders), instead of sorting once at
 * insertion. Across n orders this makes total cost closer to O(n · m log m)
 * than O(n log n) as the book grows — so throughput is expected to *decay*
 * as the run progresses, and the decay gets worse quadratically with size.
 * Rather than hiding that behind one aggregate number (which is what made
 * the previous version look "stuck" at 1M — it wasn't hung, it was doing
 * legitimate O(n·m log m) work with no visible progress), this version:
 *
 *   1. Reports progress + live throughput every N orders, so a slow run
 *      is visibly *slow*, not indistinguishable from a hang.
 *   2. Buckets the run into segments and reports orders/sec PER SEGMENT,
 *      so the throughput decay curve itself becomes a benchmark result —
 *      this is the evidence for the O(n·m log m) claim, not just an assertion.
 *   3. Tracks resting book depth over time (the "m" in the complexity).
 *   4. Uses adaptive iteration counts + a wall-clock time budget per size,
 *      so 1M orders doesn't attempt 5 full measurement passes.
 *   5. Lets you cap the max size via CLI arg if you don't want to wait
 *      out the full quadratic-ish blowup at 1M.
 *
 * Sizes: 1,000 / 10,000 / 100,000 / 1,000,000 (override with --max=100000)
 */

import { Orderbook } from "../packages/engine/src/trade/Orderbook.js";
import type { Order } from "../packages/engine/src/trade/Orderbook.js";
import { Snowflake } from "../packages/engine/src/trade/Snowflake.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// ============================================================================
// Configuration
// ============================================================================

const ALL_SIZES = [1_000, 10_000, 100_000, 1_000_000];
const SEGMENT_COUNT = 10; // throughput is measured in 10 chunks per run
const PROGRESS_INTERVAL_MS = 2_000; // heartbeat while a run is in flight
const TIME_BUDGET_MS = 60_000; // per-size soft cap on total measurement time
const MAX_ITERATIONS = 5;
const MIN_ITERATIONS = 1;
const WARMUP_CAP = 20_000; // never warm up with more than this many synthetic orders

const cliMax = process.argv.find((a) => a.startsWith("--max="))?.split("=")[1];
const BENCHMARK_SIZES = cliMax
  ? ALL_SIZES.filter((s) => s <= Number(cliMax))
  : ALL_SIZES;

const RESULTS_DIR = join(
  import.meta.dirname ?? ".",
  "../../benchmark-results/engine",
);

// ============================================================================
// Deterministic RNG (same as invariant tests)
// ============================================================================

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }
}

// ============================================================================
// Order Generation
// ============================================================================

interface TestOrder {
  side: "buy" | "sell";
  price: number;
  quantity: number;
  userId: string;
  action: "place" | "cancel";
}

function generateOrderStream(count: number, seed: number): TestOrder[] {
  const rng = new SeededRNG(seed);
  const orders: TestOrder[] = [];
  for (let i = 0; i < count; i++) {
    const action = rng.next() < 0.1 ? "cancel" : "place";
    orders.push({
      side: rng.pick(["buy", "sell"]) as "buy" | "sell",
      price: rng.int(90, 110),
      quantity: rng.int(1, 100),
      userId: `user-${rng.int(1, 50)}`,
      action,
    });
  }
  return orders;
}

// ============================================================================
// Result types
// ============================================================================

interface SegmentStat {
  segmentIndex: number;
  ordersInSegment: number;
  ordersPerSec: number;
  avgRestingBookSize: number; // avg of (asks.length + bids.length) during this segment
}

interface LatencyResult {
  totalTimeMs: number;
  orderCount: number;
  matchCount: number;
  ordersPerSec: number;
  matchesPerSec: number;
  avgLatencyUs: number;
  p50LatencyUs: number;
  p95LatencyUs: number;
  p99LatencyUs: number;
  maxLatencyUs: number;
  minLatencyUs: number;
  memoryMB: number;
  finalBookSize: number;
  segments: SegmentStat[];
  // Ratio of last-segment throughput to first-segment throughput.
  // 1.0 = no decay. 0.1 = engine is running 10x slower by the end of
  // the run than at the start — direct evidence of the resort cost
  // growing with book size.
  decayRatio: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// Single benchmark run (with progress heartbeat + segmented throughput)
// ============================================================================

function runSingleBenchmark(
  orders: TestOrder[],
  snowflake: Snowflake,
  opts: { label: string; showProgress: boolean },
): LatencyResult {
  const book = new Orderbook("RIL", [], [], 0);
  const latencies: number[] = [];
  let matchCount = 0;
  const restingOrderIds: bigint[] = [];
  const rng = new SeededRNG(1337); // separate stream for cancel selection (deterministic, not Math.random)

  const segmentSize = Math.max(1, Math.ceil(orders.length / SEGMENT_COUNT));
  const segments: SegmentStat[] = [];
  let segStart = performance.now();
  let segOrderCount = 0;
  let segBookSizeSum = 0;

  if (typeof globalThis.gc === "function") globalThis.gc();
  const memBefore = process.memoryUsage();

  const startTotal = performance.now();
  let lastHeartbeat = startTotal;

  for (let i = 0; i < orders.length; i++) {
    const testOrder = orders[i]!;
    const orderId = snowflake.generate();

    if (testOrder.action === "cancel" && restingOrderIds.length > 0) {
      const cancelId =
        restingOrderIds[Math.floor(rng.next() * restingOrderIds.length)]!;
      const startOp = performance.now();

      const askIdx = book.asks.findIndex((o) => o.orderId === cancelId);
      if (askIdx !== -1) {
        book.asks.splice(askIdx, 1);
      } else {
        const bidIdx = book.bids.findIndex((o) => o.orderId === cancelId);
        if (bidIdx !== -1) book.bids.splice(bidIdx, 1);
      }

      const endOp = performance.now();
      latencies.push((endOp - startOp) * 1000);
    } else {
      const order: Order = {
        price: testOrder.price,
        quantity: testOrder.quantity,
        orderId,
        filled: 0,
        side: testOrder.side,
        userId: testOrder.userId,
      };

      const startOp = performance.now();
      const { executedQty, fills } = book.addOrder(order);
      const endOp = performance.now();

      latencies.push((endOp - startOp) * 1000);
      matchCount += fills.length;

      if (executedQty < order.quantity) {
        restingOrderIds.push(orderId);
      }
    }

    segOrderCount++;
    segBookSizeSum += book.asks.length + book.bids.length;

    // Close out a segment
    if (segOrderCount >= segmentSize || i === orders.length - 1) {
      const segEnd = performance.now();
      const segMs = segEnd - segStart;
      segments.push({
        segmentIndex: segments.length,
        ordersInSegment: segOrderCount,
        ordersPerSec: segMs > 0 ? (segOrderCount / segMs) * 1000 : Infinity,
        avgRestingBookSize: segBookSizeSum / segOrderCount,
      });
      segStart = segEnd;
      segOrderCount = 0;
      segBookSizeSum = 0;
    }

    // Heartbeat so a legitimately slow run never looks hung
    if (opts.showProgress) {
      const now = performance.now();
      if (now - lastHeartbeat > PROGRESS_INTERVAL_MS) {
        const pct = (((i + 1) / orders.length) * 100).toFixed(1);
        const elapsed = now - startTotal;
        const rate = (i + 1) / (elapsed / 1000);
        const eta = rate > 0 ? ((orders.length - i - 1) / rate) * 1000 : 0;
        process.stdout.write(
          `\r  [${opts.label}] ${pct}% (${(i + 1).toLocaleString()}/${orders.length.toLocaleString()}) ` +
            `| ${rate.toFixed(0)} ord/s now | book depth ${(
              book.asks.length + book.bids.length
            ).toLocaleString()} | elapsed ${fmtDuration(elapsed)} | ETA ${fmtDuration(
              eta,
            )}   `,
        );
        lastHeartbeat = now;
      }
    }
  }

  if (opts.showProgress) process.stdout.write("\n");

  const endTotal = performance.now();
  const totalTimeMs = endTotal - startTotal;
  const memAfter = process.memoryUsage();
  const memoryMB = (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024);

  latencies.sort((a, b) => a - b);

  const firstSeg = segments[0]?.ordersPerSec ?? 0;
  const lastSeg = segments[segments.length - 1]?.ordersPerSec ?? 0;

  return {
    totalTimeMs,
    orderCount: orders.length,
    matchCount,
    ordersPerSec: (orders.length / totalTimeMs) * 1000,
    matchesPerSec: (matchCount / totalTimeMs) * 1000,
    avgLatencyUs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50LatencyUs: percentile(latencies, 50),
    p95LatencyUs: percentile(latencies, 95),
    p99LatencyUs: percentile(latencies, 99),
    maxLatencyUs: latencies[latencies.length - 1]!,
    minLatencyUs: latencies[0]!,
    memoryMB: Math.max(0, memoryMB),
    finalBookSize: book.asks.length + book.bids.length,
    segments,
    decayRatio: firstSeg > 0 ? lastSeg / firstSeg : 1,
  };
}

// ============================================================================
// Adaptive iteration planning
// ============================================================================

function planIterations(size: number, sampleMs: number): number {
  if (sampleMs <= 0) return MAX_ITERATIONS;
  const projectedFullRun = sampleMs; // sampleMs is already a full run's time
  const affordable = Math.floor(TIME_BUDGET_MS / projectedFullRun);
  return Math.max(MIN_ITERATIONS, Math.min(MAX_ITERATIONS, affordable));
}

// ============================================================================
// Main Benchmark
// ============================================================================

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Exchange Lab — Matching Engine Benchmark");
  console.log("═══════════════════════════════════════════════════════════\n");

  const os = await import("os");
  console.log("System Information:");
  console.log(`  Node.js:  ${process.version}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log(`  CPUs:     ${os.cpus().length}× ${os.cpus()[0]?.model}`);
  console.log(
    `  Memory:   ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
  );
  console.log(`  Date:     ${new Date().toISOString()}`);
  if (cliMax)
    console.log(
      `  Max size: capped at ${Number(cliMax).toLocaleString()} via --max`,
    );
  console.log();

  const allResults: Record<string, LatencyResult> = {};

  for (const size of BENCHMARK_SIZES) {
    console.log(`─── Benchmark: ${size.toLocaleString()} orders ───`);

    console.log("  Generating order stream...");
    const orders = generateOrderStream(size, 42);

    // Warmup: capped, and skipped entirely for huge sizes where even one
    // extra pass eats into the time budget for no benefit.
    const warmupSize = Math.min(size, WARMUP_CAP);
    const warmupOrders =
      warmupSize === size ? orders : generateOrderStream(warmupSize, 43);
    console.log(
      `  Warming up (1 pass, ${warmupSize.toLocaleString()} orders)...`,
    );
    runSingleBenchmark(warmupOrders, new Snowflake(1), {
      label: "warmup",
      showProgress: false,
    });

    // One timed sample run to decide how many measurement iterations we
    // can actually afford within TIME_BUDGET_MS — this is what stops a
    // 1,000,000-order run from silently attempting 5 full passes.
    console.log("  Sampling once to size the run...");
    const sample = runSingleBenchmark(orders, new Snowflake(1), {
      label: `${size.toLocaleString()} sample`,
      showProgress: size >= 50_000,
    });
    const iterations = planIterations(size, sample.totalTimeMs);
    console.log(
      `  Sample took ${fmtDuration(sample.totalTimeMs)} → running ${iterations} ` +
        `measurement iteration(s) (budget ${fmtDuration(TIME_BUDGET_MS)})`,
    );

    const iterationResults: LatencyResult[] = [sample];
    for (let m = 1; m < iterations; m++) {
      const result = runSingleBenchmark(orders, new Snowflake(1), {
        label: `${size.toLocaleString()} run ${m + 1}/${iterations}`,
        showProgress: size >= 50_000,
      });
      iterationResults.push(result);
      console.log(
        `    Iteration ${m + 1}: ${result.ordersPerSec.toFixed(0)} orders/s, ` +
          `${fmtDuration(result.totalTimeMs)}, decay ${result.decayRatio.toFixed(2)}x`,
      );
    }

    iterationResults.sort((a, b) => a.totalTimeMs - b.totalTimeMs);
    const median = iterationResults[Math.floor(iterationResults.length / 2)]!;
    allResults[size.toString()] = median;

    console.log();
    console.log(`  Results (median of ${iterationResults.length} run(s)):`);
    console.log(`    Total time:      ${fmtDuration(median.totalTimeMs)}`);
    console.log(`    Orders/sec:      ${median.ordersPerSec.toFixed(0)}`);
    console.log(`    Matches/sec:     ${median.matchesPerSec.toFixed(0)}`);
    console.log(`    Match count:     ${median.matchCount.toLocaleString()}`);
    console.log(
      `    Final book size: ${median.finalBookSize.toLocaleString()}`,
    );
    console.log(`    Avg latency:     ${median.avgLatencyUs.toFixed(2)} µs`);
    console.log(`    p50 latency:     ${median.p50LatencyUs.toFixed(2)} µs`);
    console.log(`    p95 latency:     ${median.p95LatencyUs.toFixed(2)} µs`);
    console.log(`    p99 latency:     ${median.p99LatencyUs.toFixed(2)} µs`);
    console.log(`    Max latency:     ${median.maxLatencyUs.toFixed(2)} µs`);
    console.log(`    Memory delta:    ${median.memoryMB.toFixed(2)} MB`);
    console.log(
      `    Throughput decay (first seg → last seg): ${median.decayRatio.toFixed(3)}x` +
        (median.decayRatio < 0.5
          ? "  ⚠ significant slowdown as book grows"
          : ""),
    );
    console.log();
  }

  // ==========================================================================
  // Save results
  // ==========================================================================

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const jsonPath = join(RESULTS_DIR, `engine-benchmark-${timestamp}.json`);
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        node_version: process.version,
        platform: `${process.platform} ${process.arch}`,
        time_budget_ms: TIME_BUDGET_MS,
        results: allResults,
      },
      null,
      2,
    ),
  );
  console.log(`Results saved to: ${jsonPath}`);

  const csvPath = join(RESULTS_DIR, `engine-benchmark-${timestamp}.csv`);
  const csvHeader =
    "orders,total_ms,orders_per_sec,matches_per_sec,match_count,final_book_size,avg_us,p50_us,p95_us,p99_us,max_us,memory_mb,decay_ratio\n";
  const csvRows = Object.entries(allResults)
    .map(([size, r]) =>
      [
        size,
        r.totalTimeMs.toFixed(2),
        r.ordersPerSec.toFixed(0),
        r.matchesPerSec.toFixed(0),
        r.matchCount,
        r.finalBookSize,
        r.avgLatencyUs.toFixed(2),
        r.p50LatencyUs.toFixed(2),
        r.p95LatencyUs.toFixed(2),
        r.p99LatencyUs.toFixed(2),
        r.maxLatencyUs.toFixed(2),
        r.memoryMB.toFixed(2),
        r.decayRatio.toFixed(3),
      ].join(","),
    )
    .join("\n");
  writeFileSync(csvPath, csvHeader + csvRows + "\n");
  console.log(`CSV saved to: ${csvPath}`);

  // Segment-level throughput CSV — this is the file that actually shows the
  // O(n·m log m) degradation as a curve, per size.
  const segCsvPath = join(
    RESULTS_DIR,
    `engine-benchmark-segments-${timestamp}.csv`,
  );
  const segHeader =
    "orders,segment_index,orders_per_sec,avg_resting_book_size\n";
  const segRows = Object.entries(allResults)
    .flatMap(([size, r]) =>
      r.segments.map(
        (s) =>
          `${size},${s.segmentIndex},${s.ordersPerSec.toFixed(0)},${s.avgRestingBookSize.toFixed(0)}`,
      ),
    )
    .join("\n");
  writeFileSync(segCsvPath, segHeader + segRows + "\n");
  console.log(`Segment CSV saved to: ${segCsvPath}`);

  // Markdown report — readable summary + a plain-ASCII decay sparkline per size,
  // so you don't need to open a spreadsheet to see the degradation.
  const mdPath = join(RESULTS_DIR, `engine-benchmark-${timestamp}.md`);
  writeFileSync(mdPath, buildMarkdownReport(allResults, timestamp));
  console.log(`Markdown report saved to: ${mdPath}`);

  console.log();
  printSummaryTable(allResults);
}

// ============================================================================
// Reporting helpers
// ============================================================================

function sparkline(values: number[]): string {
  const blocks = "▁▂▃▄▅▆▇█";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map(
      (v) =>
        blocks[
          Math.min(
            blocks.length - 1,
            Math.floor(((v - min) / range) * (blocks.length - 1)),
          )
        ],
    )
    .join("");
}

function printSummaryTable(allResults: Record<string, LatencyResult>) {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");

  const rows = Object.entries(allResults);
  const col = (s: string, w: number) => s.padStart(w);

  console.log(
    `| ${col("Orders", 9)} | ${col("Orders/s", 10)} | ${col("p50 µs", 8)} | ${col(
      "p99 µs",
      8,
    )} | ${col("Max µs", 8)} | ${col("Mem MB", 8)} | ${col("Decay", 7)} | Throughput trend`,
  );
  console.log(
    "|" +
      "-".repeat(9 + 2) +
      "|" +
      "-".repeat(12) +
      "|" +
      "-".repeat(10) +
      "|" +
      "-".repeat(10) +
      "|" +
      "-".repeat(10) +
      "|" +
      "-".repeat(10) +
      "|" +
      "-".repeat(9) +
      "|" +
      "-".repeat(18),
  );

  for (const [size, r] of rows) {
    const trend = sparkline(r.segments.map((s) => s.ordersPerSec));
    console.log(
      `| ${col(Number(size).toLocaleString(), 9)} | ${col(r.ordersPerSec.toFixed(0), 10)} | ${col(
        r.p50LatencyUs.toFixed(1),
        8,
      )} | ${col(r.p99LatencyUs.toFixed(1), 8)} | ${col(r.maxLatencyUs.toFixed(1), 8)} | ${col(
        r.memoryMB.toFixed(1),
        8,
      )} | ${col(r.decayRatio.toFixed(2) + "x", 7)} | ${trend}`,
    );
  }
  console.log();
  console.log(
    "Throughput trend reads left→right across the run (10 segments). A flat/rising\n" +
      "bar pattern means steady throughput; a falling one is the per-order resort\n" +
      "cost (O(m log m) on every addOrder) biting harder as the resting book grows.",
  );
}

function buildMarkdownReport(
  allResults: Record<string, LatencyResult>,
  timestamp: string,
): string {
  const lines: string[] = [];
  lines.push(`# Matching Engine Benchmark — ${timestamp}\n`);
  lines.push(
    "Known bottleneck under test: `Orderbook.addOrder()` re-sorts the full " +
      "resting book on every call instead of sorting once at insertion. The " +
      "**Throughput decay** column and per-size sparkline below are the " +
      "evidence for that, not a claim taken on faith.\n",
  );
  lines.push(
    "| Orders | Orders/sec | p50 (µs) | p95 (µs) | p99 (µs) | Max (µs) | Memory (MB) | Decay (last/first segment) |",
  );
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const [size, r] of Object.entries(allResults)) {
    lines.push(
      `| ${Number(size).toLocaleString()} | ${r.ordersPerSec.toFixed(0)} | ${r.p50LatencyUs.toFixed(
        1,
      )} | ${r.p95LatencyUs.toFixed(1)} | ${r.p99LatencyUs.toFixed(1)} | ${r.maxLatencyUs.toFixed(
        1,
      )} | ${r.memoryMB.toFixed(1)} | ${r.decayRatio.toFixed(3)}x |`,
    );
  }
  lines.push("\n## Throughput decay per size (10 segments per run)\n");
  for (const [size, r] of Object.entries(allResults)) {
    lines.push(`**${Number(size).toLocaleString()} orders:**`);
    lines.push(
      "```\n" +
        r.segments
          .map(
            (s) =>
              `seg ${s.segmentIndex}: ${s.ordersPerSec.toFixed(0).padStart(8)} ord/s   avg book depth ${s.avgRestingBookSize.toFixed(0)}`,
          )
          .join("\n") +
        "\n```",
    );
  }
  return lines.join("\n");
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exitCode = 1;
});
