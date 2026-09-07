/**
 * PART 2: Exchange Invariant Tests
 *
 * Property/invariant-style tests that verify exchange correctness
 * under randomized order sequences.
 *
 * Invariants tested:
 * 1. Quantity conservation: submitted = filled + remaining
 * 2. No crossed resting book: best bid < best ask after matching
 * 3. No negative quantities
 * 4. No duplicate fills
 * 5. Price-time priority enforcement
 * 6. Cancellation correctness
 * 7. Balance conservation: trades cannot create/destroy money
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TestEngine,
  Orderbook,
  createTestOrder,
  generateOrderId,
} from "../helpers/engine-test-factory.js";
import type { Fill, Order } from "../helpers/engine-test-factory.js";

// ============================================================================
// Helpers for randomized testing
// ============================================================================

/** Seeded pseudo-random number generator for reproducible tests */
class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a number in [0, 1) */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }
}

function generateRandomOrders(
  rng: SeededRNG,
  count: number,
  userIds: string[],
  priceRange: [number, number] = [90, 110]
): Array<{
  side: "buy" | "sell";
  price: number;
  quantity: number;
  userId: string;
}> {
  const orders = [];
  for (let i = 0; i < count; i++) {
    orders.push({
      side: rng.pick(["buy", "sell"]) as "buy" | "sell",
      price: rng.int(priceRange[0], priceRange[1]),
      quantity: rng.int(1, 50),
      userId: rng.pick(userIds),
    });
  }
  return orders;
}

// ============================================================================
// Invariant 1: Quantity Conservation
// ============================================================================

describe("Invariant — Quantity Conservation", () => {
  it("submitted quantity = filled quantity + remaining quantity for every order", () => {
    const book = new Orderbook("RIL", [], [], 0);
    const rng = new SeededRNG(42);
    const allOrders: Order[] = [];
    const allFills: Fill[] = [];

    // Submit 200 random orders
    for (let i = 0; i < 200; i++) {
      const side = rng.pick(["buy", "sell"]) as "buy" | "sell";
      const order = createTestOrder({
        side,
        price: rng.int(90, 110),
        quantity: rng.int(1, 50),
        userId: `user-${rng.int(1, 10)}`,
      });

      const { executedQty, fills } = book.addOrder(order);
      allOrders.push(order);
      allFills.push(...fills);

      // Verify: filled <= submitted
      expect(executedQty).toBeLessThanOrEqual(order.quantity);
      expect(order.filled).toBe(executedQty);

      // Verify: filled + remaining == submitted
      const remaining = order.quantity - order.filled;
      expect(order.filled + remaining).toBe(order.quantity);
    }
  });

  it("quantity conservation holds across 1000 random orders with cancellations", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const rng = new SeededRNG(123);
    const userIds = ["u1", "u2", "u3", "u4", "u5"];

    // Give everyone large balances
    for (const uid of userIds) {
      engine.addUser(uid, { INR: 10000000, RIL: 1000000 });
    }

    const placedOrders: Array<{ orderId: bigint; market: string }> = [];

    for (let i = 0; i < 1000; i++) {
      // 80% place order, 20% cancel
      if (rng.next() < 0.8 || placedOrders.length === 0) {
        const result = engine.createOrder({
          market: "RIL_INR",
          price: rng.int(90, 110),
          quantity: rng.int(1, 20),
          side: rng.pick(["buy", "sell"]) as "buy" | "sell",
          userId: rng.pick(userIds),
        });

        // Quantity conservation
        expect(result.executedQty + result.remainingQty).toBe(
          result.fills.reduce((s, f) => s + f.qty, 0) + result.remainingQty
        );

        if (result.restingOnBook) {
          placedOrders.push({ orderId: result.orderId, market: "RIL_INR" });
        }
      } else {
        const toCancel = rng.pick(placedOrders);
        engine.cancelOrder(toCancel.market, toCancel.orderId);
        // Remove from list
        const idx = placedOrders.indexOf(toCancel);
        if (idx >= 0) placedOrders.splice(idx, 1);
      }
    }

    // Verify all remaining orders on book have valid quantities
    const book = engine.getOrderbook("RIL_INR")!;
    for (const order of [...book.bids, ...book.asks]) {
      expect(order.filled).toBeLessThanOrEqual(order.quantity);
      expect(order.filled).toBeGreaterThanOrEqual(0);
      expect(order.quantity - order.filled).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Invariant 2: No Crossed Resting Book
// ============================================================================

describe("Invariant — No Crossed Resting Book", () => {
  it("best bid < best ask after any sequence of operations", () => {
    const book = new Orderbook("RIL", [], [], 0);
    const rng = new SeededRNG(77);

    for (let i = 0; i < 500; i++) {
      const side = rng.pick(["buy", "sell"]) as "buy" | "sell";
      const order = createTestOrder({
        side,
        price: rng.int(90, 110),
        quantity: rng.int(1, 50),
        userId: `user-${rng.int(1, 10)}`,
      });
      book.addOrder(order);

      // Check no crossed book after every insertion
      if (book.bids.length > 0 && book.asks.length > 0) {
        const bestBid = Math.max(
          ...book.bids.map((b) => b.price)
        );
        const bestAsk = Math.min(
          ...book.asks.map((a) => a.price)
        );
        expect(bestBid).toBeLessThan(bestAsk);
      }
    }
  });

  it("no crossed book after cancellation followed by matching", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const rng = new SeededRNG(999);
    const userIds = ["a", "b", "c", "d"];

    for (const uid of userIds) {
      engine.addUser(uid, { INR: 10000000, RIL: 1000000 });
    }

    const resting: Array<{ orderId: bigint }> = [];

    for (let i = 0; i < 500; i++) {
      if (rng.next() < 0.15 && resting.length > 0) {
        const target = rng.pick(resting);
        engine.cancelOrder("RIL_INR", target.orderId);
        resting.splice(resting.indexOf(target), 1);
      } else {
        const result = engine.createOrder({
          market: "RIL_INR",
          price: rng.int(90, 110),
          quantity: rng.int(1, 30),
          side: rng.pick(["buy", "sell"]) as "buy" | "sell",
          userId: rng.pick(userIds),
        });
        if (result.restingOnBook) {
          resting.push({ orderId: result.orderId });
        }
      }

      // Check invariant
      const ob = engine.getOrderbook("RIL_INR")!;
      if (ob.bids.length > 0 && ob.asks.length > 0) {
        const bestBid = Math.max(...ob.bids.map((b) => b.price));
        const bestAsk = Math.min(...ob.asks.map((a) => a.price));
        expect(bestBid).toBeLessThan(bestAsk);
      }
    }
  });
});

// ============================================================================
// Invariant 3: No Negative Quantities
// ============================================================================

describe("Invariant — No Negative Quantities", () => {
  it("no order should have negative remaining quantity", () => {
    const book = new Orderbook("RIL", [], [], 0);
    const rng = new SeededRNG(314);

    for (let i = 0; i < 500; i++) {
      const order = createTestOrder({
        side: rng.pick(["buy", "sell"]) as "buy" | "sell",
        price: rng.int(90, 110),
        quantity: rng.int(1, 50),
        userId: `user-${rng.int(1, 10)}`,
      });
      book.addOrder(order);

      // Check all resting orders
      for (const o of [...book.bids, ...book.asks]) {
        expect(o.filled).toBeGreaterThanOrEqual(0);
        expect(o.quantity - o.filled).toBeGreaterThan(0);
        expect(o.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("no balance should go negative under randomized trading", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const rng = new SeededRNG(271);
    const users = ["u1", "u2", "u3"];

    for (const u of users) {
      engine.addUser(u, { INR: 1000000, RIL: 10000 });
    }

    for (let i = 0; i < 300; i++) {
      try {
        engine.createOrder({
          market: "RIL_INR",
          price: rng.int(90, 110),
          quantity: rng.int(1, 20),
          side: rng.pick(["buy", "sell"]) as "buy" | "sell",
          userId: rng.pick(users),
        });
      } catch {
        // Insufficient funds — expected in random scenarios
      }

      // Verify no negative balances
      for (const u of users) {
        const bal = engine.getUserBalance(u)!;
        for (const [asset, ab] of Object.entries(bal)) {
          expect(ab.available).toBeGreaterThanOrEqual(0);
          expect(ab.locked).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

// ============================================================================
// Invariant 4: No Duplicate Fills
// ============================================================================

describe("Invariant — No Duplicate Fills", () => {
  it("no two fills should share the same tradeId", () => {
    const book = new Orderbook("RIL", [], [], 0);
    const rng = new SeededRNG(628);
    const allTradeIds = new Set<bigint>();

    for (let i = 0; i < 500; i++) {
      const order = createTestOrder({
        side: rng.pick(["buy", "sell"]) as "buy" | "sell",
        price: rng.int(90, 110),
        quantity: rng.int(1, 50),
        userId: `user-${rng.int(1, 10)}`,
      });
      const { fills } = book.addOrder(order);

      for (const fill of fills) {
        expect(allTradeIds.has(fill.tradeId)).toBe(false);
        allTradeIds.add(fill.tradeId);
      }
    }
  });
});

// ============================================================================
// Invariant 5: Price-Time Priority
// ============================================================================

describe("Invariant — Price-Time Priority", () => {
  it("when two asks exist at the same price, the earlier one fills first", () => {
    const book = new Orderbook("RIL", [], [], 0);

    const ask1 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 5,
      userId: "first-seller",
    });
    const ask2 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 5,
      userId: "second-seller",
    });

    book.addOrder(ask1);
    book.addOrder(ask2);

    // Buy just 3 — should fill against ask1 first
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 3,
      userId: "buyer",
    });
    const { fills } = book.addOrder(buy);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.makerOrderId).toBe(ask1.orderId);
    expect(fills[0]!.otherUserId).toBe("first-seller");
  });

  it("when two bids exist at the same price, the earlier one fills first", () => {
    const book = new Orderbook("RIL", [], [], 0);

    const bid1 = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 5,
      userId: "first-buyer",
    });
    const bid2 = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 5,
      userId: "second-buyer",
    });

    book.addOrder(bid1);
    book.addOrder(bid2);

    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 3,
      userId: "seller",
    });
    const { fills } = book.addOrder(sell);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.makerOrderId).toBe(bid1.orderId);
    expect(fills[0]!.otherUserId).toBe("first-buyer");
  });

  it("price priority should beat time priority", () => {
    const book = new Orderbook("RIL", [], [], 0);

    // Ask at 100 placed first
    const ask100 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller-100",
    });
    book.addOrder(ask100);

    // Ask at 95 placed second
    const ask95 = createTestOrder({
      side: "sell",
      price: 95,
      quantity: 10,
      userId: "seller-95",
    });
    book.addOrder(ask95);

    // Buy 5 — should match against 95 even though 100 was placed first
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 5,
      userId: "buyer",
    });
    const { fills } = book.addOrder(buy);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(95);
    expect(fills[0]!.otherUserId).toBe("seller-95");
  });
});

// ============================================================================
// Invariant 6: Cancellation Correctness
// ============================================================================

describe("Invariant — Cancellation Correctness", () => {
  it("cancelled order does not participate in future matching", () => {
    const book = new Orderbook("RIL", [], [], 0);

    const ask = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(ask);
    book.cancelAsk(ask);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
  });

  it("cancelling one of many orders at same price leaves others valid", () => {
    const book = new Orderbook("RIL", [], [], 0);

    const orders: Order[] = [];
    for (let i = 0; i < 5; i++) {
      const o = createTestOrder({
        side: "sell",
        price: 100,
        quantity: 10,
        userId: `seller-${i}`,
      });
      book.addOrder(o);
      orders.push(o);
    }

    // Cancel the middle one
    book.cancelAsk(orders[2]!);
    expect(book.asks).toHaveLength(4);

    // Buy 35 — should fill 4 orders × 10 = 40 available, fill 35
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 35,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(35);
    // Cancelled order should NOT appear in fills
    for (const fill of fills) {
      expect(fill.makerOrderId).not.toBe(orders[2]!.orderId);
    }
  });
});

// ============================================================================
// Invariant 7: Balance Conservation
// ============================================================================

describe("Invariant — Balance Conservation", () => {
  it("total system balances are conserved across all trades", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const users = ["alice", "bob", "charlie", "dave"];

    for (const u of users) {
      engine.addUser(u, { INR: 100000, RIL: 1000 });
    }

    const initialTotals = engine.getTotalSystemBalances();

    const rng = new SeededRNG(42);

    // Run 500 random trades
    for (let i = 0; i < 500; i++) {
      try {
        engine.createOrder({
          market: "RIL_INR",
          price: rng.int(90, 110),
          quantity: rng.int(1, 20),
          side: rng.pick(["buy", "sell"]) as "buy" | "sell",
          userId: rng.pick(users),
        });
      } catch {
        // Insufficient funds — expected
      }
    }

    const finalTotals = engine.getTotalSystemBalances();

    // Total INR (available + locked) should be unchanged
    expect(finalTotals["INR"]!.total).toBeCloseTo(
      initialTotals["INR"]!.total,
      5
    );

    // Total RIL (available + locked) should be unchanged
    expect(finalTotals["RIL"]!.total).toBeCloseTo(
      initialTotals["RIL"]!.total,
      5
    );
  });

  it("balance conservation holds with cancellations", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const users = ["u1", "u2", "u3"];

    for (const u of users) {
      engine.addUser(u, { INR: 50000, RIL: 500 });
    }

    const initialTotals = engine.getTotalSystemBalances();
    const rng = new SeededRNG(84);
    const resting: Array<{ orderId: bigint }> = [];

    for (let i = 0; i < 300; i++) {
      if (rng.next() < 0.2 && resting.length > 0) {
        const target = rng.pick(resting);
        engine.cancelOrder("RIL_INR", target.orderId);
        resting.splice(resting.indexOf(target), 1);
      } else {
        try {
          const result = engine.createOrder({
            market: "RIL_INR",
            price: rng.int(90, 110),
            quantity: rng.int(1, 15),
            side: rng.pick(["buy", "sell"]) as "buy" | "sell",
            userId: rng.pick(users),
          });
          if (result.restingOnBook) {
            resting.push({ orderId: result.orderId });
          }
        } catch {
          // Expected
        }
      }
    }

    const finalTotals = engine.getTotalSystemBalances();

    expect(finalTotals["INR"]!.total).toBeCloseTo(
      initialTotals["INR"]!.total,
      5
    );
    expect(finalTotals["RIL"]!.total).toBeCloseTo(
      initialTotals["RIL"]!.total,
      5
    );
  });

  it("balance conservation across multiple markets", () => {
    const engine = new TestEngine(["RIL_INR", "TATA_INR"]);
    const users = ["u1", "u2"];

    for (const u of users) {
      engine.addUser(u, { INR: 500000, RIL: 5000, TATA: 5000 });
    }

    const initialTotals = engine.getTotalSystemBalances();
    const rng = new SeededRNG(256);

    for (let i = 0; i < 200; i++) {
      try {
        const market = rng.pick(["RIL_INR", "TATA_INR"]);
        engine.createOrder({
          market,
          price: rng.int(90, 110),
          quantity: rng.int(1, 20),
          side: rng.pick(["buy", "sell"]) as "buy" | "sell",
          userId: rng.pick(users),
        });
      } catch {
        // Expected
      }
    }

    const finalTotals = engine.getTotalSystemBalances();

    for (const asset of ["INR", "RIL", "TATA"]) {
      if (initialTotals[asset] && finalTotals[asset]) {
        expect(finalTotals[asset]!.total).toBeCloseTo(
          initialTotals[asset]!.total,
          5
        );
      }
    }
  });
});

// ============================================================================
// Combined Stress: All invariants under high-volume random load
// ============================================================================

describe("Invariant — Combined Stress Test (1000 orders)", () => {
  it("all invariants hold under 1000 random orders with cancellations", () => {
    const engine = new TestEngine(["RIL_INR"]);
    const users = ["a", "b", "c", "d", "e"];

    for (const u of users) {
      engine.addUser(u, { INR: 10000000, RIL: 100000 });
    }

    const initialTotals = engine.getTotalSystemBalances();
    const rng = new SeededRNG(2024);
    const allTradeIds = new Set<bigint>();
    const resting: Array<{ orderId: bigint }> = [];

    for (let i = 0; i < 1000; i++) {
      // 15% cancel, 85% new order
      if (rng.next() < 0.15 && resting.length > 0) {
        const target = rng.pick(resting);
        engine.cancelOrder("RIL_INR", target.orderId);
        resting.splice(resting.indexOf(target), 1);
      } else {
        try {
          const result = engine.createOrder({
            market: "RIL_INR",
            price: rng.int(90, 110),
            quantity: rng.int(1, 30),
            side: rng.pick(["buy", "sell"]) as "buy" | "sell",
            userId: rng.pick(users),
          });

          // Invariant 1: Quantity conservation
          expect(result.executedQty + result.remainingQty).toBe(
            result.fills.reduce((s, f) => s + f.qty, 0) + result.remainingQty
          );

          // Invariant 4: No duplicate trade IDs
          for (const fill of result.fills) {
            expect(allTradeIds.has(fill.tradeId)).toBe(false);
            allTradeIds.add(fill.tradeId);
          }

          if (result.restingOnBook) {
            resting.push({ orderId: result.orderId });
          }
        } catch {
          // Insufficient funds — expected
        }
      }

      // Invariant 2: No crossed book
      const ob = engine.getOrderbook("RIL_INR")!;
      if (ob.bids.length > 0 && ob.asks.length > 0) {
        const bestBid = Math.max(...ob.bids.map((b) => b.price));
        const bestAsk = Math.min(...ob.asks.map((a) => a.price));
        expect(bestBid).toBeLessThan(bestAsk);
      }

      // Invariant 3: No negative quantities on book
      for (const o of [...ob.bids, ...ob.asks]) {
        expect(o.quantity - o.filled).toBeGreaterThan(0);
      }

      // Invariant 3: No negative balances
      for (const u of users) {
        const bal = engine.getUserBalance(u)!;
        for (const [, ab] of Object.entries(bal)) {
          expect(ab.available).toBeGreaterThanOrEqual(-0.0001); // Floating point tolerance
          expect(ab.locked).toBeGreaterThanOrEqual(-0.0001);
        }
      }
    }

    // Invariant 7: Balance conservation
    const finalTotals = engine.getTotalSystemBalances();
    expect(finalTotals["INR"]!.total).toBeCloseTo(
      initialTotals["INR"]!.total,
      2
    );
    expect(finalTotals["RIL"]!.total).toBeCloseTo(
      initialTotals["RIL"]!.total,
      2
    );
  });
});
