/**
 * PART 1: Core Trading Engine Unit Tests
 *
 * Tests the Orderbook class directly (the actual matching engine).
 * No Redis, database, or filesystem dependencies.
 *
 * Covers:
 * - Order insertion
 * - Order cancellation
 * - Limit orders
 * - Price-time priority
 * - Matching
 * - Partial fills
 * - Complete fills
 * - Multiple fills
 * - Remaining quantity
 * - Order-book state
 * - Trade generation
 * - Order state transitions
 * - Invalid orders / edge cases
 * - Precision/decimal handling
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Orderbook,
  createTestOrder,
  generateOrderId,
} from "../../helpers/engine-test-factory.js";
import type { Order, Fill } from "../../helpers/engine-test-factory.js";

describe("Orderbook — Order Insertion", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should add a buy order to bids when no matching asks exist", () => {
    const order = createTestOrder({ side: "buy", price: 100, quantity: 10 });
    const { executedQty, fills } = book.addOrder(order);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0]!.orderId).toBe(order.orderId);
    expect(book.asks).toHaveLength(0);
  });

  it("should add a sell order to asks when no matching bids exist", () => {
    const order = createTestOrder({ side: "sell", price: 100, quantity: 10 });
    const { executedQty, fills } = book.addOrder(order);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0]!.orderId).toBe(order.orderId);
    expect(book.bids).toHaveLength(0);
  });

  it("should add multiple buy orders at different prices", () => {
    const order1 = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "u1",
    });
    const order2 = createTestOrder({
      side: "buy",
      price: 105,
      quantity: 5,
      userId: "u2",
    });
    const order3 = createTestOrder({
      side: "buy",
      price: 95,
      quantity: 15,
      userId: "u3",
    });

    book.addOrder(order1);
    book.addOrder(order2);
    book.addOrder(order3);

    expect(book.bids).toHaveLength(3);
    expect(book.asks).toHaveLength(0);
  });

  it("should add multiple sell orders at different prices", () => {
    const order1 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "u1",
    });
    const order2 = createTestOrder({
      side: "sell",
      price: 105,
      quantity: 5,
      userId: "u2",
    });
    const order3 = createTestOrder({
      side: "sell",
      price: 95,
      quantity: 15,
      userId: "u3",
    });

    book.addOrder(order1);
    book.addOrder(order2);
    book.addOrder(order3);

    expect(book.asks).toHaveLength(3);
    expect(book.bids).toHaveLength(0);
  });

  it("should not add order to book when rest=false and no fill", () => {
    const order = createTestOrder({ side: "buy", price: 100, quantity: 10 });
    const { executedQty, fills } = book.addOrder(order, { rest: false });

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });
});

describe("Orderbook — Limit Order Matching", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should match a buy order against a resting ask at the same price", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(10);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(100);
    expect(fills[0]!.qty).toBe(10);
    expect(fills[0]!.otherUserId).toBe("seller");
    expect(fills[0]!.makerOrderId).toBe(sell.orderId);

    // Both orders should be removed from the book
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });

  it("should match a sell order against a resting bid at the same price", () => {
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    book.addOrder(buy);

    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    const { executedQty, fills } = book.addOrder(sell);

    expect(executedQty).toBe(10);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(100);
    expect(fills[0]!.qty).toBe(10);
    expect(fills[0]!.otherUserId).toBe("buyer");

    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });

  it("should match a buy at a higher price against a lower ask (price improvement)", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 95,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(10);
    expect(fills).toHaveLength(1);
    // Fill price should be the maker's (resting) price
    expect(fills[0]!.price).toBe(95);
    expect(fills[0]!.qty).toBe(10);

    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });

  it("should NOT match a buy at lower price than ask", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 105,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);

    expect(book.bids).toHaveLength(1);
    expect(book.asks).toHaveLength(1);
  });

  it("should NOT match a sell at higher price than bid", () => {
    const buy = createTestOrder({
      side: "buy",
      price: 95,
      quantity: 10,
      userId: "buyer",
    });
    book.addOrder(buy);

    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    const { executedQty, fills } = book.addOrder(sell);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);

    expect(book.bids).toHaveLength(1);
    expect(book.asks).toHaveLength(1);
  });
});

describe("Orderbook — Partial Fills", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should partially fill a buy order when ask has less quantity", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 5,
      userId: "seller",
    });
    book.addOrder(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(5);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.qty).toBe(5);

    // Ask fully consumed, buy remainder on book
    expect(book.asks).toHaveLength(0);
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0]!.filled).toBe(5);
    expect(book.bids[0]!.quantity - book.bids[0]!.filled).toBe(5);
  });

  it("should partially fill a sell order when bid has less quantity", () => {
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 5,
      userId: "buyer",
    });
    book.addOrder(buy);

    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    const { executedQty, fills } = book.addOrder(sell);

    expect(executedQty).toBe(5);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.qty).toBe(5);

    // Bid fully consumed, sell remainder on book
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0]!.filled).toBe(5);
  });

  it("should partially fill an ask when incoming buy quantity is less", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 20,
      userId: "seller",
    });
    book.addOrder(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 8,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(8);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.qty).toBe(8);

    // Buyer fully filled (no remainder to rest), ask partially filled
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0]!.filled).toBe(8);
    expect(book.asks[0]!.quantity - book.asks[0]!.filled).toBe(12);
  });
});

describe("Orderbook — Multiple Fills", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should fill a buy order across multiple ask levels", () => {
    // Place asks at different prices
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 99,
        quantity: 5,
        userId: "seller1",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 5,
        userId: "seller2",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 101,
        quantity: 5,
        userId: "seller3",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 101,
      quantity: 12,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(12);
    expect(fills).toHaveLength(3);

    // Should fill cheapest asks first (price priority)
    expect(fills[0]!.price).toBe(99);
    expect(fills[0]!.qty).toBe(5);
    expect(fills[1]!.price).toBe(100);
    expect(fills[1]!.qty).toBe(5);
    expect(fills[2]!.price).toBe(101);
    expect(fills[2]!.qty).toBe(2);

    // First two asks fully consumed, third partially filled
    expect(book.asks).toHaveLength(1);
    expect(book.asks[0]!.filled).toBe(2);
    expect(book.bids).toHaveLength(0); // Buy fully filled
  });

  it("should fill a sell order across multiple bid levels", () => {
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 101,
        quantity: 5,
        userId: "buyer1",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 100,
        quantity: 5,
        userId: "buyer2",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 99,
        quantity: 5,
        userId: "buyer3",
      })
    );

    const sell = createTestOrder({
      side: "sell",
      price: 99,
      quantity: 12,
      userId: "seller",
    });
    const { executedQty, fills } = book.addOrder(sell);

    expect(executedQty).toBe(12);
    expect(fills).toHaveLength(3);

    // Should fill highest bids first (price priority)
    expect(fills[0]!.price).toBe(101);
    expect(fills[0]!.qty).toBe(5);
    expect(fills[1]!.price).toBe(100);
    expect(fills[1]!.qty).toBe(5);
    expect(fills[2]!.price).toBe(99);
    expect(fills[2]!.qty).toBe(2);

    // First two bids fully consumed, third partially filled
    expect(book.bids).toHaveLength(1);
    expect(book.bids[0]!.filled).toBe(2);
    expect(book.asks).toHaveLength(0); // Sell fully filled
  });
});

describe("Orderbook — Price-Time Priority", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should match the best ask (lowest price) first for buy orders", () => {
    // Add asks in non-sorted order
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 105,
        quantity: 10,
        userId: "seller-high",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 10,
        userId: "seller-low",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 103,
        quantity: 10,
        userId: "seller-mid",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 105,
      quantity: 5,
      userId: "buyer",
    });
    const { fills } = book.addOrder(buy);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(100);
    expect(fills[0]!.otherUserId).toBe("seller-low");
  });

  it("should match the best bid (highest price) first for sell orders", () => {
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 95,
        quantity: 10,
        userId: "buyer-low",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 105,
        quantity: 10,
        userId: "buyer-high",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 100,
        quantity: 10,
        userId: "buyer-mid",
      })
    );

    const sell = createTestOrder({
      side: "sell",
      price: 95,
      quantity: 5,
      userId: "seller",
    });
    const { fills } = book.addOrder(sell);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.price).toBe(105);
    expect(fills[0]!.otherUserId).toBe("buyer-high");
  });

  it("should respect time priority (FIFO) for orders at the same price", () => {
    const first = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller-first",
    });
    book.addOrder(first);

    const second = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller-second",
    });
    book.addOrder(second);

    // Buy only 5 — should fill against the first order inserted
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 5,
      userId: "buyer",
    });
    const { fills } = book.addOrder(buy);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.otherUserId).toBe("seller-first");
    expect(fills[0]!.makerOrderId).toBe(first.orderId);
  });

  it("should fill FIFO across same-price bids", () => {
    const first = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer-first",
    });
    book.addOrder(first);

    const second = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer-second",
    });
    book.addOrder(second);

    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 5,
      userId: "seller",
    });
    const { fills } = book.addOrder(sell);

    expect(fills).toHaveLength(1);
    expect(fills[0]!.otherUserId).toBe("buyer-first");
    expect(fills[0]!.makerOrderId).toBe(first.orderId);
  });
});

describe("Orderbook — Order Cancellation", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should cancel a resting bid order", () => {
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    book.addOrder(buy);
    expect(book.bids).toHaveLength(1);

    const price = book.cancelBid(buy);
    expect(price).toBe(100);
    expect(book.bids).toHaveLength(0);
  });

  it("should cancel a resting ask order", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);
    expect(book.asks).toHaveLength(1);

    const price = book.cancelAsk(sell);
    expect(price).toBe(100);
    expect(book.asks).toHaveLength(0);
  });

  it("should return undefined when cancelling non-existent bid", () => {
    const fakeOrder = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
    });
    const result = book.cancelBid(fakeOrder);
    expect(result).toBeUndefined();
  });

  it("should return undefined when cancelling non-existent ask", () => {
    const fakeOrder = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
    });
    const result = book.cancelAsk(fakeOrder);
    expect(result).toBeUndefined();
  });

  it("cancelled order should not participate in matching", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);
    book.cancelAsk(sell);

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
    expect(book.bids).toHaveLength(1);
    expect(book.asks).toHaveLength(0);
  });

  it("should only cancel the specified order, leaving others intact", () => {
    const sell1 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller1",
    });
    const sell2 = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller2",
    });
    book.addOrder(sell1);
    book.addOrder(sell2);

    book.cancelAsk(sell1);

    expect(book.asks).toHaveLength(1);
    expect(book.asks[0]!.orderId).toBe(sell2.orderId);
  });
});

describe("Orderbook — Depth", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should return empty depth for an empty book", () => {
    const depth = book.getDepth();
    expect(depth.bids).toHaveLength(0);
    expect(depth.asks).toHaveLength(0);
  });

  it("should aggregate multiple orders at the same price level", () => {
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 100,
        quantity: 10,
        userId: "u1",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 100,
        quantity: 15,
        userId: "u2",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 95,
        quantity: 5,
        userId: "u3",
      })
    );

    const depth = book.getDepth();
    expect(depth.bids).toHaveLength(2);

    const price100 = depth.bids.find((b) => b[0] === "100");
    expect(price100).toBeDefined();
    expect(price100![1]).toBe("25"); // 10 + 15

    const price95 = depth.bids.find((b) => b[0] === "95");
    expect(price95).toBeDefined();
    expect(price95![1]).toBe("5");
  });

  it("should not include fully filled orders in depth", () => {
    const sell = createTestOrder({
      side: "sell",
      price: 100,
      quantity: 10,
      userId: "seller",
    });
    book.addOrder(sell);

    // Fully fill the ask
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    book.addOrder(buy);

    const depth = book.getDepth();
    expect(depth.asks).toHaveLength(0);
    expect(depth.bids).toHaveLength(0);
  });
});

describe("Orderbook — Open Orders", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should return open orders for a specific user", () => {
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 100,
        quantity: 10,
        userId: "alice",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 110,
        quantity: 5,
        userId: "alice",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "buy",
        price: 95,
        quantity: 8,
        userId: "bob",
      })
    );

    const aliceOrders = book.getOpenOrder("alice");
    expect(aliceOrders).toHaveLength(2);

    const bobOrders = book.getOpenOrder("bob");
    expect(bobOrders).toHaveLength(1);

    const unknownOrders = book.getOpenOrder("charlie");
    expect(unknownOrders).toHaveLength(0);
  });
});

describe("Orderbook — IOC (Immediate or Cancel) Orders", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should fill what it can and NOT rest on book when rest=false", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 5,
        userId: "seller",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy, { rest: false });

    expect(executedQty).toBe(5);
    expect(fills).toHaveLength(1);
    // Remainder should NOT be on the book
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });

  it("should have zero fills and no resting order when IOC and no match", () => {
    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy, { rest: false });

    expect(executedQty).toBe(0);
    expect(fills).toHaveLength(0);
    expect(book.bids).toHaveLength(0);
  });
});

describe("Orderbook — Trade ID Generation", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should generate unique trade IDs for each fill", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 5,
        userId: "s1",
      })
    );
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 101,
        quantity: 5,
        userId: "s2",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 101,
      quantity: 10,
      userId: "buyer",
    });
    const { fills } = book.addOrder(buy);

    expect(fills).toHaveLength(2);
    expect(fills[0]!.tradeId).not.toBe(fills[1]!.tradeId);
    expect(typeof fills[0]!.tradeId).toBe("bigint");
  });
});

describe("Orderbook — Edge Cases", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should handle exact quantity matches (quantity = 1)", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 1,
        userId: "seller",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 1,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(1);
    expect(fills).toHaveLength(1);
    expect(book.bids).toHaveLength(0);
    expect(book.asks).toHaveLength(0);
  });

  it("should handle large quantities", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 1000000,
        userId: "seller",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 1000000,
      userId: "buyer",
    });
    const { executedQty } = book.addOrder(buy);

    expect(executedQty).toBe(1000000);
  });

  it("should handle fractional quantities", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100.5,
        quantity: 0.5,
        userId: "seller",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 100.5,
      quantity: 0.5,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(0.5);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.qty).toBe(0.5);
    expect(fills[0]!.price).toBe(100.5);
  });

  it("should handle very small price differences", () => {
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100.01,
        quantity: 10,
        userId: "seller",
      })
    );

    // Buy at 100.00 should NOT match ask at 100.01
    const buy = createTestOrder({
      side: "buy",
      price: 100.0,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty } = book.addOrder(buy);
    expect(executedQty).toBe(0);
  });

  it("should handle many orders at the same price level", () => {
    // Place 100 asks at the same price
    for (let i = 0; i < 100; i++) {
      book.addOrder(
        createTestOrder({
          side: "sell",
          price: 100,
          quantity: 1,
          userId: `seller-${i}`,
        })
      );
    }

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 50,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(50);
    expect(fills).toHaveLength(50);
    expect(book.asks).toHaveLength(50); // 50 remaining
  });

  it("should handle self-matching (same userId on both sides)", () => {
    // The engine doesn't prevent self-matching; document this behavior
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 100,
        quantity: 10,
        userId: "same-user",
      })
    );

    const buy = createTestOrder({
      side: "buy",
      price: 100,
      quantity: 10,
      userId: "same-user",
    });
    const { executedQty, fills } = book.addOrder(buy);

    // The orderbook does NOT prevent self-matching
    expect(executedQty).toBe(10);
    expect(fills).toHaveLength(1);
    expect(fills[0]!.otherUserId).toBe("same-user");
  });
});

describe("Orderbook — Floating-Point Precision", () => {
  let book: Orderbook;

  beforeEach(() => {
    book = new Orderbook("RIL", [], [], 0);
  });

  it("should demonstrate potential floating-point imprecision with 0.1 + 0.2", () => {
    // This test documents the known floating-point behavior
    book.addOrder(
      createTestOrder({
        side: "sell",
        price: 0.3,
        quantity: 10,
        userId: "seller",
      })
    );

    // 0.1 + 0.2 !== 0.3 in IEEE 754
    const buy = createTestOrder({
      side: "buy",
      price: 0.1 + 0.2,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty } = book.addOrder(buy);

    // This documents the behavior — 0.1+0.2 = 0.30000000000000004 > 0.3
    // so the buy at 0.30000000000000004 SHOULD match the ask at 0.3
    expect(executedQty).toBe(10);
  });

  it("should handle integer prices without precision issues", () => {
    for (let i = 0; i < 10; i++) {
      book.addOrder(
        createTestOrder({
          side: "sell",
          price: 100 + i,
          quantity: 1,
          userId: `seller-${i}`,
        })
      );
    }

    const buy = createTestOrder({
      side: "buy",
      price: 109,
      quantity: 10,
      userId: "buyer",
    });
    const { executedQty, fills } = book.addOrder(buy);

    expect(executedQty).toBe(10);
    expect(fills).toHaveLength(10);

    // Verify total quantity is exactly 10
    const totalFilled = fills.reduce((sum, f) => sum + f.qty, 0);
    expect(totalFilled).toBe(10);
  });
});
