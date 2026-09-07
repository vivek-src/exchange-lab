/**
 * PART 1 (continued): TestEngine Unit Tests
 *
 * Tests the full Engine flow including balance management,
 * fund locking, fund reconciliation, and order lifecycle.
 * Uses TestEngine (isolated replica of Engine without Redis/DB).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TestEngine,
  generateOrderId,
} from "../../helpers/engine-test-factory.js";

describe("TestEngine — Balance Management", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine(["RIL_INR"]);
    engine.addUser("buyer", { INR: 100000, RIL: 0 });
    engine.addUser("seller", { INR: 0, RIL: 100 });
  });

  it("should lock quote asset funds for a buy order", () => {
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    const balance = engine.getUserBalance("buyer")!;
    // 100000 - (100*10) locked for resting order = 99000 available
    expect(balance["INR"]!.available).toBe(99000);
    expect(balance["INR"]!.locked).toBe(1000);
  });

  it("should lock base asset funds for a sell order", () => {
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "sell",
      userId: "seller",
    });

    const balance = engine.getUserBalance("seller")!;
    expect(balance["RIL"]!.available).toBe(90);
    expect(balance["RIL"]!.locked).toBe(10);
  });

  it("should transfer assets on fill (buyer gets base, seller gets quote)", () => {
    // Seller places ask
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "sell",
      userId: "seller",
    });

    // Buyer places matching bid
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    expect(result.executedQty).toBe(10);

    const buyerBal = engine.getUserBalance("buyer")!;
    const sellerBal = engine.getUserBalance("seller")!;

    // Buyer: spent 1000 INR, got 10 RIL
    expect(buyerBal["INR"]!.available).toBe(99000);
    expect(buyerBal["INR"]!.locked).toBe(0);
    expect(buyerBal["RIL"]!.available).toBe(10);

    // Seller: sold 10 RIL, got 1000 INR
    expect(sellerBal["RIL"]!.available).toBe(90);
    expect(sellerBal["RIL"]!.locked).toBe(0);
    expect(sellerBal["INR"]!.available).toBe(1000);
  });

  it("should reject order when insufficient funds", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 100,
        quantity: 2000,
        side: "buy",
        userId: "buyer",
      })
    ).toThrow("Insufficient Funds");
  });

  it("should reject sell order when insufficient base asset", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 100,
        quantity: 200,
        side: "sell",
        userId: "seller",
      })
    ).toThrow("Insufficient RIL qty");
  });

  it("should reject order for uninitialized user", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 100,
        quantity: 10,
        side: "buy",
        userId: "ghost",
      })
    ).toThrow("User wallet not initialized");
  });

  it("should reject order with invalid price (zero)", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 0,
        quantity: 10,
        side: "buy",
        userId: "buyer",
      })
    ).toThrow("Invalid price");
  });

  it("should reject order with negative quantity", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 100,
        quantity: -5,
        side: "buy",
        userId: "buyer",
      })
    ).toThrow("Invalid quantity");
  });

  it("should reject order with NaN price", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: NaN,
        quantity: 10,
        side: "buy",
        userId: "buyer",
      })
    ).toThrow("Invalid price");
  });

  it("should reject order with Infinity quantity", () => {
    expect(() =>
      engine.createOrder({
        market: "RIL_INR",
        price: 100,
        quantity: Infinity,
        side: "buy",
        userId: "buyer",
      })
    ).toThrow("Invalid quantity");
  });
});

describe("TestEngine — Price Improvement & Reconciliation", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine(["RIL_INR"]);
    engine.addUser("buyer", { INR: 100000, RIL: 0 });
    engine.addUser("seller", { INR: 0, RIL: 100 });
  });

  it("should return price improvement surplus to buyer", () => {
    // Seller places ask at 90
    engine.createOrder({
      market: "RIL_INR",
      price: 90,
      quantity: 10,
      side: "sell",
      userId: "seller",
    });

    // Buyer places bid at 100 — matched at 90 (maker's price)
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    expect(result.executedQty).toBe(10);
    expect(result.fills[0]!.price).toBe(90);

    const buyerBal = engine.getUserBalance("buyer")!;
    // Locked 100*10 = 1000 INR, but only spent 90*10 = 900
    // Surplus of 100 should be returned
    expect(buyerBal["INR"]!.available).toBe(100000 - 900);
    expect(buyerBal["INR"]!.locked).toBe(0);
    expect(buyerBal["RIL"]!.available).toBe(10);
  });

  it("should correctly handle partial fill with resting remainder", () => {
    // Seller places ask at 100 for qty 5
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 5,
      side: "sell",
      userId: "seller",
    });

    // Buyer places bid at 100 for qty 10 — fills 5, rests 5
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    expect(result.executedQty).toBe(5);
    expect(result.restingOnBook).toBe(true);

    const buyerBal = engine.getUserBalance("buyer")!;
    // Locked 1000 total. Spent 500 on fill. 500 still locked for resting order.
    expect(buyerBal["INR"]!.available).toBe(99000);
    expect(buyerBal["INR"]!.locked).toBe(500);
    expect(buyerBal["RIL"]!.available).toBe(5);
  });

  it("should unlock funds for IOC order with unfilled remainder", () => {
    // Seller places ask at 100 for qty 5
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 5,
      side: "sell",
      userId: "seller",
    });

    // Buyer places IOC bid at 100 for qty 10 — fills 5, cancels rest
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
      executionType: "ioc",
    });

    expect(result.executedQty).toBe(5);
    expect(result.restingOnBook).toBe(false);

    const buyerBal = engine.getUserBalance("buyer")!;
    // Locked 1000. Spent 500 on fill. 500 returned (not resting).
    expect(buyerBal["INR"]!.available).toBe(99500);
    expect(buyerBal["INR"]!.locked).toBe(0);
    expect(buyerBal["RIL"]!.available).toBe(5);
  });
});

describe("TestEngine — Order Cancellation with Balances", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine(["RIL_INR"]);
    engine.addUser("buyer", { INR: 100000, RIL: 0 });
    engine.addUser("seller", { INR: 0, RIL: 100 });
  });

  it("should unlock funds when cancelling a buy order", () => {
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    const balBefore = engine.getUserBalance("buyer")!;
    expect(balBefore["INR"]!.locked).toBe(1000);

    const cancel = engine.cancelOrder("RIL_INR", result.orderId);
    expect(cancel.success).toBe(true);

    const balAfter = engine.getUserBalance("buyer")!;
    expect(balAfter["INR"]!.available).toBe(100000);
    expect(balAfter["INR"]!.locked).toBe(0);
  });

  it("should unlock funds when cancelling a sell order", () => {
    const result = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "sell",
      userId: "seller",
    });

    const balBefore = engine.getUserBalance("seller")!;
    expect(balBefore["RIL"]!.locked).toBe(10);

    const cancel = engine.cancelOrder("RIL_INR", result.orderId);
    expect(cancel.success).toBe(true);

    const balAfter = engine.getUserBalance("seller")!;
    expect(balAfter["RIL"]!.available).toBe(100);
    expect(balAfter["RIL"]!.locked).toBe(0);
  });

  it("should return error for non-existent order cancellation", () => {
    const cancel = engine.cancelOrder("RIL_INR", 9999999n);
    expect(cancel.success).toBe(false);
    expect(cancel.error).toBe("No order found");
  });

  it("should return error for cancellation on non-existent market", () => {
    const cancel = engine.cancelOrder("FAKE_INR", 1n);
    expect(cancel.success).toBe(false);
    expect(cancel.error).toBe("No orderbook found");
  });

  it("should correctly unlock partially filled order on cancel", () => {
    // Seller places ask at 100 for qty 5
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 5,
      side: "sell",
      userId: "seller",
    });

    // Buyer places bid at 100 for qty 10 — fills 5, rests 5
    const buyResult = engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "buyer",
    });

    expect(buyResult.executedQty).toBe(5);
    expect(buyResult.restingOnBook).toBe(true);

    // Cancel the resting remainder
    const cancel = engine.cancelOrder("RIL_INR", buyResult.orderId);
    expect(cancel.success).toBe(true);

    const buyerBal = engine.getUserBalance("buyer")!;
    // Started with 100000. Spent 500. Remaining 500 unlocked. = 99500 available
    expect(buyerBal["INR"]!.available).toBe(99500);
    expect(buyerBal["INR"]!.locked).toBe(0);
    expect(buyerBal["RIL"]!.available).toBe(5);
  });
});

describe("TestEngine — Multiple Markets", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine(["RIL_INR", "TATA_INR", "SOL_INR"]);
    engine.addUser("trader", { INR: 1000000, RIL: 1000, TATA: 1000, SOL: 1000 });
    engine.addUser("counterparty", { INR: 1000000, RIL: 1000, TATA: 1000, SOL: 1000 });
  });

  it("should maintain separate orderbooks for each market", () => {
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "trader",
    });
    engine.createOrder({
      market: "TATA_INR",
      price: 200,
      quantity: 5,
      side: "sell",
      userId: "trader",
    });

    const rilBook = engine.getOrderbook("RIL_INR")!;
    const tataBook = engine.getOrderbook("TATA_INR")!;

    expect(rilBook.bids).toHaveLength(1);
    expect(rilBook.asks).toHaveLength(0);
    expect(tataBook.bids).toHaveLength(0);
    expect(tataBook.asks).toHaveLength(1);
  });

  it("should not cross-match orders from different markets", () => {
    engine.createOrder({
      market: "RIL_INR",
      price: 100,
      quantity: 10,
      side: "sell",
      userId: "counterparty",
    });

    // Buy on different market should not match
    const result = engine.createOrder({
      market: "TATA_INR",
      price: 100,
      quantity: 10,
      side: "buy",
      userId: "trader",
    });

    expect(result.executedQty).toBe(0);
    expect(result.fills).toHaveLength(0);
  });
});

describe("TestEngine — Depth Queries", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine(["RIL_INR"]);
    engine.addUser("u1", { INR: 1000000, RIL: 1000 });
    engine.addUser("u2", { INR: 1000000, RIL: 1000 });
  });

  it("should return aggregated depth", () => {
    engine.createOrder({ market: "RIL_INR", price: 100, quantity: 10, side: "buy", userId: "u1" });
    engine.createOrder({ market: "RIL_INR", price: 100, quantity: 15, side: "buy", userId: "u2" });
    engine.createOrder({ market: "RIL_INR", price: 95, quantity: 5, side: "buy", userId: "u1" });
    engine.createOrder({ market: "RIL_INR", price: 110, quantity: 8, side: "sell", userId: "u1" });

    const depth = engine.getDepth("RIL_INR")!;

    expect(depth.bids).toHaveLength(2);
    expect(depth.asks).toHaveLength(1);

    const bid100 = depth.bids.find(b => b[0] === "100");
    expect(bid100![1]).toBe("25");
  });
});
