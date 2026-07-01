import fs from "fs";
import { prisma } from "@exchange-lab/db";
import { RedisManager } from "../redisClient.js";
import {
  DEPTH,
  NEW_USER,
  OPEN_ORDERS,
  ORDER_UPDATE,
  TRADE_ADDED,
} from "@exchange-lab/shared";
import { randomUUID } from "crypto";
import {
  CANCEL_ORDER,
  CREATE_ORDER,
  GET_DEPTH,
  GET_OPEN_ORDERS,
  ON_RAMP,
} from "@exchange-lab/shared";
import type { EngineRequest } from "@exchange-lab/shared";
import { Orderbook } from "./Orderbook.js";
import type { Fill, Order } from "./Orderbook.js";

interface UserBalance {
  [key: string]: {
    available: number;
    locked: number;
  };
}
export const BASE_CURRENCY = "INR";
export const SUPPORTED_ASSETS = ["RIL", "TATA", "VIVEK"];

export class Engine {
  private orderbooks: Orderbook[] = [];
  private balances: Map<string, UserBalance> = new Map();

  constructor() {
    let snapshot = null;
    try {
      if (process.env.WITH_SNAPSHOT) {
        snapshot = fs.readFileSync("./snapshot.json");
      }
    } catch (e) {
      console.log("No snapshot found");
    }

    if (snapshot) {
      const snapshotSnapshot = JSON.parse(snapshot.toString());
      this.orderbooks = snapshotSnapshot.orderbooks.map(
        (o: any) =>
          new Orderbook(
            o.baseAsset,
            o.bids,
            o.asks,
            o.lastTradeId,
            o.currentPrice,
          ),
      );
      this.balances = new Map(snapshotSnapshot.balances);
    } else {
      this.orderbooks = SUPPORTED_ASSETS.map(
        (asset) => new Orderbook(asset, [], [], 0, 0),
      );
    }
    setInterval(() => {
      this.saveSnapshot();
    }, 1000 * 3);
  }
  process({ message, clientId }: { message: EngineRequest; clientId: string }) {
    switch (message.type) {
      case CREATE_ORDER:
        const newOrderId = randomUUID();
        try {
          const { executedQty, fills } = this.createOrder(
            message.data.market,
            message.data.price,
            message.data.quantity,
            message.data.side,
            message.data.userId,
            newOrderId,
          );
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId: newOrderId,
              executedQty,
              fills: fills.map((fill) => ({
                price: fill.price.toString(),
                qty: fill.qty,
                tradeId: fill.tradeId,
              })),
            },
          });
        } catch (e) {
          console.log(e);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: newOrderId,
              executedQty: 0,
              remainingQty: 0,
              error: e instanceof Error ? e.message : "Unknown error",
            },
          });
        }
        break;
      case CANCEL_ORDER:
        const orderId = message.data.orderId;
        try {
          const market = message.data.market;
          const cancelOrderbook = this.orderbooks.find(
            (order) => order.ticker() === market,
          );
          const baseAsset = market.split("_")[0];
          const quoteAsset = market.split("_")[1];

          if (!baseAsset || !quoteAsset) {
            throw new Error(`Invalid market format: ${market}`);
          }
          if (!cancelOrderbook) {
            throw new Error("No orderbook found.");
          }
          const order =
            cancelOrderbook.asks.find((order) => order.orderId == orderId) ||
            cancelOrderbook.bids.find((order) => order.orderId == orderId);
          if (!order) {
            throw new Error("No order found");
          }

          const userWallet = this.balances.get(order.userId);
          if (!userWallet) {
            throw new Error("User wallet not found");
          }

          if (order.side === "buy") {
            const price = cancelOrderbook.cancelBid(order);
            const remainingQty = order.quantity - order.filled;
            const lockedValue = remainingQty * order.price;

            if (userWallet[quoteAsset]) {
              userWallet[quoteAsset].available += lockedValue;
              userWallet[quoteAsset].locked -= lockedValue;
            }

            if (price) {
              this.sendUpdatedDepthAt(price.toString(), market);
            }
          } else {
            const price = cancelOrderbook.cancelAsk(order);
            const remainingQty = order.quantity - order.filled;

            if (userWallet[baseAsset]) {
              userWallet[baseAsset].available += remainingQty;
              userWallet[baseAsset].locked -= remainingQty;
            }

            if (price) {
              this.sendUpdatedDepthAt(price.toString(), market);
            }
          }

          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId,
              executedQty: 0,
              remainingQty: 0,
            },
          });
        } catch (error) {
          console.log("Error while cancelling order.\n" + error);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: orderId,
              executedQty: 0,
              remainingQty: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
        break;
      case GET_OPEN_ORDERS:
        try {
          const openOrderbook = this.orderbooks.find(
            (order) => order.ticker() === message.data.market,
          );
          if (!openOrderbook) {
            throw new Error("No Orderbook Found");
          }
          const openOrders = openOrderbook?.getOpenOrder(message.data.userId);

          //Format Data Before sendign
          const openOrdersPayload = openOrders.map((order) => ({
            orderId: order.orderId,
            executedQty: order.filled, // Map 'filled' to 'executedQty'
            price: order.price.toString(), // Convert number to string
            quantity: order.quantity.toString(), // Convert number to string
            side: order.side,
            userId: order.userId,
          }));

          //response to FE
          RedisManager.getInstance().sendToApi(clientId, {
            type: OPEN_ORDERS,
            payload: openOrdersPayload,
          });
        } catch (error) {
          console.log("Error Getting open order.\n" + error);
          // Fallback response
          RedisManager.getInstance().sendToApi(clientId, {
            type: OPEN_ORDERS,
            payload: [], // Empty array means no open orders
          });
        }
        break;
      case ON_RAMP:
        try {
          const userId = message.data.userId;
          const amountStr = message.data.amount;
          const txnId = message.data.txnId;

          const amount = Number(amountStr);

          // Execute the deposit
          this.onRamp(userId, amount);

          // Send success receipt back to the frontend
          RedisManager.getInstance().sendToApi(clientId, {
            type: ON_RAMP,
            payload: {
              status: "success",
              message: `Successfully deposited ${amount} ${BASE_CURRENCY}`,
              txnId: txnId,
            },
          });
        } catch (error) {
          console.log(
            `Error during ON_RAMP for txn ${message.data?.txnId}:\n`,
            error,
          );

          // Fail Response
          RedisManager.getInstance().sendToApi(clientId, {
            type: ON_RAMP,
            payload: {
              status: "error",
              message: "Failed to process deposit",
              txnId: message.data?.txnId || "UNKNOWN",
            },
          });
        }
        break;
      case "ADD_USER":
        try {
          const { userId } = message.data;
          this.loadWalletIntoMemory(userId);
          console.log(`Engine loaded balances for new user: ${userId}`);

          RedisManager.getInstance().sendToApi(clientId, {
            type: NEW_USER,
            payload: {
              status: "success",
            },
          });
        } catch (error) {
          RedisManager.getInstance().sendToApi(clientId, {
            type: NEW_USER,
            payload: {
              status: "error",
            },
          });
        }
        break;
      case GET_DEPTH:
        try {
          const market = message.data.market;
          const orderBook = this.orderbooks.find(
            (ob) => ob.ticker() === market,
          );
          if (!orderBook) {
            throw new Error("No Orderbook Found");
          }

          const depth = orderBook.getDepth();

          // Construct the payload to exactly match the expected Type
          RedisManager.getInstance().sendToApi(clientId, {
            type: "DEPTH",
            payload: {
              market: market,
              // Map through the array [price, quantity] and convert to strings
              bids: depth.bids.map((b) => [b[0].toString(), b[1].toString()]),
              asks: depth.asks.map((a) => [a[0].toString(), a[1].toString()]),
            },
          });
        } catch (error) {
          console.log("Error Getting Depth of Orderbook.\n" + error);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "DEPTH",
            payload: {
              market: message.data.market,
              bids: [],
              asks: [],
            },
          });
        }
        break;
    }
  }
  addOrderbook(orderbook: Orderbook) {
    this.orderbooks.push(orderbook);
  }
  createOrder(
    market: string,
    price: string,
    quantity: string,
    side: "buy" | "sell",
    userId: string,
    newOrderId: string,
  ) {
    const orderbook = this.orderbooks.find(
      (orderbook) => orderbook.ticker() === market,
    );
    const baseAsset = market.split("_")[0];
    const quoteAsset = market.split("_")[1];

    if (!baseAsset || !quoteAsset) {
      throw new Error(
        `Invalid market format: ${market}. Expected format is BASE_QUOTE (e.g., RIL_INR)`,
      );
    }

    if (!orderbook) {
      throw new Error("No orderbook found");
    }

    this.checkAndLockFunds(
      baseAsset,
      quoteAsset,
      side,
      userId,
      price,
      quantity,
    );

    const order: Order = {
      price: Number(price),
      quantity: Number(quantity),
      orderId: newOrderId,
      filled: 0,
      side,
      userId,
    };

    const { fills, executedQty } = orderbook.addOrder(order);
    this.updateBalance(userId, baseAsset, quoteAsset, side, fills);

    this.createDbTrades(fills, market, side, userId);
    this.updateDbOrders(order, executedQty, fills, market);
    this.publishWsDepthUpdates(fills, price, side, market);
    this.publishWsTrades(fills, market, side);
    return { executedQty, fills, orderId: order.orderId };
  }
  saveSnapshot() {
    const snapshotSnapshot = {
      orderbooks: this.orderbooks.map((orderbook) => orderbook.getSnapshot()),
      balances: Array.from(this.balances.entries()),
    };
    fs.writeFileSync("./snapshot.json", JSON.stringify(snapshotSnapshot));
  }
  loadWalletIntoMemory(wallet: any) {
    const userBalances: UserBalance = {};

    userBalances[BASE_CURRENCY] = {
      available: Number(wallet.balance?.toString() ?? "0"),
      locked: 0,
    };

    if (wallet.assetsHeld) {
      const assets =
        typeof wallet.assetsHeld === "string"
          ? JSON.parse(wallet.assetsHeld)
          : wallet.assetsHeld;

      for (const [ticker, assetData] of Object.entries(assets)) {
        if (typeof assetData === "number") {
          userBalances[ticker] = { available: assetData, locked: 0 };
        } else if (assetData && typeof assetData === "object") {
          userBalances[ticker] = {
            available: Number((assetData as any).available ?? 0),
            locked: Number((assetData as any).locked ?? 0),
          };
        }
      }
    }

    this.balances.set(wallet.userId, userBalances);
  }
  async setBaseBalances() {
    try {
      const wallets = await prisma.wallet.findMany();

      this.balances.clear();
      for (const wallet of wallets) {
        this.loadWalletIntoMemory(wallet);
      }
      console.log(`Loaded balances for ${this.balances.size} users`);
    } catch (error) {
      console.error("Failed to fetch balances from DB:", error);
    }
  }
  checkAndLockFunds(
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell",
    userId: string,
    price: string,
    quantity: string,
  ) {
    const userWallet = this.balances.get(userId);
    if (!userWallet) {
      throw new Error("User wallet profile not initialized");
    }

    // avoid floating point Trap
    const qty = Number(quantity);
    const prc = Number(price);

    if (side === "buy") {
      const totalCost = qty * prc;
      const asset = userWallet[quoteAsset];

      if (!asset) {
        throw new Error(`User does not hold: ${quoteAsset}`);
      }
      if (asset.available < totalCost) {
        throw new Error("Insufficient Funds");
      }

      asset.available -= totalCost;
      asset.locked += totalCost;
    } else {
      const asset = userWallet[baseAsset];

      if (!asset) {
        throw new Error(`User does not hold: ${baseAsset}`);
      }
      if (asset.available < qty) {
        throw new Error(`Insufficient ${baseAsset} qty for this sell order`);
      }

      asset.available -= qty;
      asset.locked += qty;
    }
  }
  updateBalance(
    userId: string,
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell",
    fills: Fill[],
  ) {
    const userWallet = this.balances.get(userId);
    if (!userWallet) {
      throw new Error(`User wallet ${userId} not initialized`);
    }

    if (!userWallet[baseAsset])
      userWallet[baseAsset] = { available: 0, locked: 0 };
    if (!userWallet[quoteAsset])
      userWallet[quoteAsset] = { available: 0, locked: 0 };

    for (const fill of fills) {
      const otherWallet = this.balances.get(fill.otherUserId);
      if (!otherWallet)
        throw new Error(`Counter-party wallet ${fill.otherUserId} not found`);

      if (!otherWallet[baseAsset])
        otherWallet[baseAsset] = { available: 0, locked: 0 };
      if (!otherWallet[quoteAsset])
        otherWallet[quoteAsset] = { available: 0, locked: 0 };

      const fillCost = fill.qty * fill.price;

      if (side === "buy") {
        userWallet[quoteAsset].locked -= fillCost;
        userWallet[baseAsset].available += fill.qty;
        otherWallet[baseAsset].locked -= fill.qty;
        otherWallet[quoteAsset].available += fillCost;
      } else {
        userWallet[baseAsset].locked -= fill.qty;
        userWallet[quoteAsset].available += fillCost;
        otherWallet[quoteAsset].locked -= fillCost;
        otherWallet[baseAsset].available += fill.qty;
      }
    }
  }
  onRamp(userId: string, amount: number) {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }

    //  check userWallet Exsist
    let userWallet = this.balances.get(userId);

    if (!userWallet) {
      userWallet = {};
      this.balances.set(userId, userWallet);
    }

    // Initialize the basecurrecny if the user doesn't have it yet
    if (!userWallet[BASE_CURRENCY]) {
      userWallet[BASE_CURRENCY] = { available: 0, locked: 0 };
    }

    // update balance
    userWallet[BASE_CURRENCY].available += amount;
  }
  updateDbOrders(
    order: Order,
    executedQty: number,
    fills: Fill[],
    market: string,
  ) {
    // Broadcast Incoming Order Update
    RedisManager.getInstance().pushMessage({
      type: ORDER_UPDATE,
      data: {
        orderId: order.orderId,
        executedQty: executedQty, // Total filled qty for the incoming order
        market: market,
        price: order.price.toString(), // Kept as string for DB safety
        quantity: order.quantity.toString(),
        side: order.side,
      },
    });

    // Broadcast Maker (Resting) Orders Updates
    for (const fill of fills) {
      RedisManager.getInstance().pushMessage({
        type: ORDER_UPDATE,
        data: {
          orderId: fill.makerOrderId,
          executedQty: fill.qty, // The amount this specific resting order was filled by
        },
      });
    }
  }
  createDbTrades(
    fills: Fill[],
    market: string,
    side: "buy" | "sell",
    userId: string,
  ) {
    for (const fill of fills) {
      // Logic: If the Taker is buying, the Maker (otherUser) is selling, and vice versa.
      const buyerId = side === "buy" ? userId : fill.otherUserId;
      const sellerId = side === "sell" ? userId : fill.otherUserId;

      RedisManager.getInstance().pushMessage({
        type: TRADE_ADDED,
        data: {
          market: market,
          id: fill.tradeId.toString(),
          isBuyerMaker: side === "sell", // If taker is selling, the maker was the buyer
          price: fill.price.toString(),
          quantity: fill.qty.toString(),
          quoteQuantity: (fill.qty * fill.price).toString(),
          timestamp: Date.now(),
          buyerId: buyerId, // <-- NOW INCLUDED
          sellerId: sellerId, // <-- NOW INCLUDED
        },
      });
    }
  }
  publishWsTrades(fills: Fill[], market: string, side: "buy" | "sell") {
    for (const fill of fills) {
      RedisManager.getInstance().publishMessage(`trade@${market}`, {
        stream: `trade@${market}`,
        data: {
          e: "trade",
          t: fill.tradeId,
          m: side === "sell",
          p: fill.price.toString(),
          q: fill.qty.toString(),
          s: market,
        },
      });
    }
  }
  publishWsDepthUpdates(
    fills: Fill[],
    price: string,
    side: "buy" | "sell",
    market: string,
  ) {
    const orderbook = this.orderbooks.find((o) => o.ticker() === market);
    if (!orderbook) {
      return;
    }

    const depth = orderbook.getDepth();
    const changedPrices = new Set(fills.map((f) => f.price.toString()));

    if (side === "buy") {
      const updatedAsks = depth?.asks.filter((x) => changedPrices.has(x[0]));
      const updatedBid = depth?.bids.find((x) => x[0] === price);

      RedisManager.getInstance().publishMessage(`depth@${market}`, {
        stream: `depth@${market}`,
        data: {
          a: updatedAsks || [],
          b: updatedBid ? [updatedBid] : [],
          e: "depth",
        },
      });
    }

    if (side === "sell") {
      const updatedBids = depth?.bids.filter((x) => changedPrices.has(x[0]));
      const updatedAsk = depth?.asks.find((x) => x[0] === price);

      RedisManager.getInstance().publishMessage(`depth@${market}`, {
        stream: `depth@${market}`,
        data: {
          a: updatedAsk ? [updatedAsk] : [],
          b: updatedBids || [],
          e: "depth",
        },
      });
    }
  }
  sendUpdatedDepthAt(price: string, market: string) {
    const orderbook = this.orderbooks.find((o) => o.ticker() === market);
    if (!orderbook) return;

    const depth = orderbook.getDepth();
    if (!depth) return;

    //Use .find() instead of .filter()
    const updatedBid = depth.bids.find((x) => x[0] === price);
    const updatedAsk = depth.asks.find((x) => x[0] === price);

    RedisManager.getInstance().publishMessage(`depth@${market}`, {
      stream: `depth@${market}`,
      data: {
        a: updatedAsk ? [updatedAsk] : [[price, "0"]],
        b: updatedBid ? [updatedBid] : [[price, "0"]],
        e: "depth",
      },
    });
  }
}
