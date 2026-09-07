/**
 * Engine Test Factory
 *
 * Creates isolated Orderbook instances for unit testing without any
 * Redis, database, or filesystem dependencies.
 *
 * The Engine class has hard dependencies on RedisManager and Prisma,
 * so we test the Orderbook directly (which is the actual matching engine)
 * and create lightweight wrappers that replicate Engine's balance logic
 * without requiring infrastructure.
 */

import { Orderbook } from "../../packages/engine/src/trade/Orderbook.js";
import type {
  Order,
  Fill,
} from "../../packages/engine/src/trade/Orderbook.js";
import { Snowflake } from "../../packages/engine/src/trade/Snowflake.js";

export type { Order, Fill };

// Re-export for convenience
export { Orderbook };

const snowflake = new Snowflake(42); // deterministic worker ID for tests

/**
 * Generates a unique Snowflake ID for test orders.
 */
export function generateOrderId(): bigint {
  return snowflake.generate();
}

/**
 * User balance tracking for test scenarios.
 * Replicates the Engine's balance management without Redis/DB dependencies.
 */
export interface AssetBalance {
  available: number;
  locked: number;
}

export interface UserBalances {
  [asset: string]: AssetBalance;
}

/**
 * Lightweight in-memory trading engine for testing.
 * Replicates the core logic of Engine.ts without Redis/DB/FS dependencies.
 */
export class TestEngine {
  private orderbooks: Map<string, Orderbook> = new Map();
  private balances: Map<string, UserBalances> = new Map();

  constructor(markets: string[] = ["RIL_INR", "TATA_INR", "SOL_INR"]) {
    for (const market of markets) {
      const [baseAsset] = market.split("_");
      if (baseAsset) {
        this.orderbooks.set(market, new Orderbook(baseAsset, [], [], 0));
      }
    }
  }

  /**
   * Initialize a user with starting balances.
   */
  addUser(
    userId: string,
    balances: Record<string, number> = { INR: 100000 }
  ): void {
    const userBalance: UserBalances = {};
    for (const [asset, amount] of Object.entries(balances)) {
      userBalance[asset] = { available: amount, locked: 0 };
    }
    this.balances.set(userId, userBalance);
  }

  /**
   * Get a user's balances.
   */
  getUserBalance(userId: string): UserBalances | undefined {
    return this.balances.get(userId);
  }

  /**
   * Get the orderbook for a market.
   */
  getOrderbook(market: string): Orderbook | undefined {
    return this.orderbooks.get(market);
  }

  /**
   * Parse market string into base and quote assets.
   */
  private parseMarket(market: string): {
    baseAsset: string;
    quoteAsset: string;
  } {
    const [baseAsset, quoteAsset] = market.split("_");
    if (!baseAsset || !quoteAsset) {
      throw new Error(
        `Invalid market format: ${market}. Expected BASE_QUOTE`
      );
    }
    return { baseAsset, quoteAsset };
  }

  /**
   * Lock funds before order placement. Mirrors Engine.checkAndLockFunds.
   */
  private checkAndLockFunds(
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell",
    userId: string,
    price: number,
    quantity: number
  ): void {
    const userWallet = this.balances.get(userId);
    if (!userWallet) {
      throw new Error("User wallet not initialized");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity: ${quantity}`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid price: ${price}`);
    }

    if (side === "buy") {
      const totalCost = quantity * price;
      const asset = userWallet[quoteAsset];
      if (!asset) throw new Error(`User does not hold: ${quoteAsset}`);
      if (asset.available < totalCost) throw new Error("Insufficient Funds");
      asset.available -= totalCost;
      asset.locked += totalCost;
    } else {
      const asset = userWallet[baseAsset];
      if (!asset) throw new Error(`User does not hold: ${baseAsset}`);
      if (asset.available < quantity)
        throw new Error(
          `Insufficient ${baseAsset} qty for this sell order`
        );
      asset.available -= quantity;
      asset.locked += quantity;
    }
  }

  /**
   * Update balances after fills. Mirrors Engine.updateBalance.
   */
  private updateBalance(
    userId: string,
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell",
    fills: Fill[]
  ): void {
    const userWallet = this.balances.get(userId);
    if (!userWallet) throw new Error(`User wallet ${userId} not initialized`);

    if (!userWallet[baseAsset])
      userWallet[baseAsset] = { available: 0, locked: 0 };
    if (!userWallet[quoteAsset])
      userWallet[quoteAsset] = { available: 0, locked: 0 };

    for (const fill of fills) {
      const otherWallet = this.balances.get(fill.otherUserId);
      if (!otherWallet)
        throw new Error(
          `Counter-party wallet ${fill.otherUserId} not found`
        );

      if (!otherWallet[baseAsset])
        otherWallet[baseAsset] = { available: 0, locked: 0 };
      if (!otherWallet[quoteAsset])
        otherWallet[quoteAsset] = { available: 0, locked: 0 };

      const fillCost = fill.qty * fill.price;

      if (side === "buy") {
        userWallet[quoteAsset]!.locked -= fillCost;
        userWallet[baseAsset]!.available += fill.qty;
        otherWallet[baseAsset]!.locked -= fill.qty;
        otherWallet[quoteAsset]!.available += fillCost;
      } else {
        userWallet[baseAsset]!.locked -= fill.qty;
        userWallet[quoteAsset]!.available += fillCost;
        otherWallet[quoteAsset]!.locked -= fillCost;
        otherWallet[baseAsset]!.available += fill.qty;
      }
    }
  }

  /**
   * Reconcile locked funds after matching. Mirrors Engine.reconcileLockedFunds.
   */
  private reconcileLockedFunds(
    userId: string,
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell",
    price: number,
    executedQty: number,
    remainingQty: number,
    restingOnBook: boolean,
    fills: Fill[]
  ): void {
    const userWallet = this.balances.get(userId);
    if (!userWallet) return;

    if (side === "buy") {
      const reservedForFilled = executedQty * price;
      const actuallySpent = fills.reduce(
        (sum, f) => sum + f.qty * f.price,
        0
      );
      const favorableSurplus = reservedForFilled - actuallySpent;
      const remainderReserve = restingOnBook ? 0 : remainingQty * price;
      const toRelease = favorableSurplus + remainderReserve;

      if (toRelease > 0) {
        const asset = userWallet[quoteAsset];
        if (asset) {
          asset.locked -= toRelease;
          asset.available += toRelease;
        }
      }
    } else {
      if (!restingOnBook && remainingQty > 0) {
        const asset = userWallet[baseAsset];
        if (asset) {
          asset.locked -= remainingQty;
          asset.available += remainingQty;
        }
      }
    }
  }

  /**
   * Submit an order. Full flow matching Engine.createOrder.
   */
  createOrder(params: {
    market: string;
    price: number;
    quantity: number;
    side: "buy" | "sell";
    userId: string;
    orderId?: bigint;
    orderType?: "limit" | "market";
    executionType?: "ioc";
  }): {
    executedQty: number;
    fills: Fill[];
    orderId: bigint;
    remainingQty: number;
    restingOnBook: boolean;
  } {
    const {
      market,
      price,
      quantity,
      side,
      userId,
      orderId = generateOrderId(),
      orderType = "limit",
      executionType,
    } = params;

    const { baseAsset, quoteAsset } = this.parseMarket(market);
    const orderbook = this.orderbooks.get(market);
    if (!orderbook) throw new Error("No orderbook found");

    this.checkAndLockFunds(
      baseAsset,
      quoteAsset,
      side,
      userId,
      price,
      quantity
    );

    const order: Order = {
      price,
      quantity,
      orderId,
      filled: 0,
      side,
      userId,
    };

    const shouldRest = orderType === "limit" && executionType !== "ioc";
    const { fills, executedQty } = orderbook.addOrder(order, {
      rest: shouldRest,
    });
    this.updateBalance(userId, baseAsset, quoteAsset, side, fills);

    const remainingQty = quantity - executedQty;
    const restingOnBook = shouldRest && remainingQty > 0;

    this.reconcileLockedFunds(
      userId,
      baseAsset,
      quoteAsset,
      side,
      price,
      executedQty,
      remainingQty,
      restingOnBook,
      fills
    );

    return { executedQty, fills, orderId, remainingQty, restingOnBook };
  }

  /**
   * Cancel an order. Mirrors Engine.process CANCEL_ORDER.
   */
  cancelOrder(
    market: string,
    orderId: bigint
  ): { success: boolean; error?: string } {
    const { baseAsset, quoteAsset } = this.parseMarket(market);
    const orderbook = this.orderbooks.get(market);
    if (!orderbook) return { success: false, error: "No orderbook found" };

    const order =
      orderbook.asks.find((o) => o.orderId === orderId) ||
      orderbook.bids.find((o) => o.orderId === orderId);
    if (!order) return { success: false, error: "No order found" };

    const userWallet = this.balances.get(order.userId);
    if (!userWallet)
      return { success: false, error: "User wallet not found" };

    if (order.side === "buy") {
      orderbook.cancelBid(order);
      const remainingQty = order.quantity - order.filled;
      const lockedValue = remainingQty * order.price;
      if (userWallet[quoteAsset]) {
        userWallet[quoteAsset]!.available += lockedValue;
        userWallet[quoteAsset]!.locked -= lockedValue;
      }
    } else {
      orderbook.cancelAsk(order);
      const remainingQty = order.quantity - order.filled;
      if (userWallet[baseAsset]) {
        userWallet[baseAsset]!.available += remainingQty;
        userWallet[baseAsset]!.locked -= remainingQty;
      }
    }

    return { success: true };
  }

  /**
   * Get depth for a market.
   */
  getDepth(market: string): { bids: [string, string][]; asks: [string, string][] } | undefined {
    const orderbook = this.orderbooks.get(market);
    if (!orderbook) return undefined;
    return orderbook.getDepth();
  }

  /**
   * Calculate total system balances across all users for conservation checks.
   */
  getTotalSystemBalances(): Record<string, { available: number; locked: number; total: number }> {
    const totals: Record<string, { available: number; locked: number; total: number }> = {};
    for (const [, userBalance] of this.balances) {
      for (const [asset, balance] of Object.entries(userBalance)) {
        if (!totals[asset]) totals[asset] = { available: 0, locked: 0, total: 0 };
        totals[asset]!.available += balance.available;
        totals[asset]!.locked += balance.locked;
        totals[asset]!.total += balance.available + balance.locked;
      }
    }
    return totals;
  }
}

/**
 * Helper to create a simple order object for Orderbook-only tests.
 */
export function createTestOrder(
  overrides: Partial<Order> & { side: "buy" | "sell" }
): Order {
  return {
    price: 100,
    quantity: 10,
    orderId: generateOrderId(),
    filled: 0,
    userId: "test-user",
    ...overrides,
  };
}
