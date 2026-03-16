import fs from "fs";
import { prisma } from "@exchange-lab/db";
import { RedisManager } from "../redisClient.js";
import { ORDER_UPDATE, TRADE_ADDED } from "@exchange-lab/shared";
import { randomUUID } from "crypto";
import {
  CANCEL_ORDER,
  CREATE_ORDER,
  GET_DEPTH,
  GET_OPEN_ORDERS,
  ON_RAMP,
} from "@exchange-lab/shared";
import type { EngineRequest } from "@exchange-lab/shared";
import { Fill, Order, Orderbook } from "./Orderbook";

interface UserBalance {
  [key: string]: {
    available: number;
    locked: number;
  };
}
export const BASE_CURRENCY = "INR";

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
      this.orderbooks = [new Orderbook(`RIL`, [], [], 0, 0)];
      this.setBaseBalances();
    }
    setInterval(() => {
      this.saveSnapshot();
    }, 1000 * 3);
  }
  process({ message, clientId }: { message: EngineRequest; clientId: string }) {
    switch (message.type) {
      case CREATE_ORDER:
        try {
          const { executedQty, fills, orderId } = this.createOrder(
            message.data.market,
            message.data.price,
            message.data.quantity,
            message.data.side,
            message.data.userId,
          );
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId,
              executedQty,
              fills,
            },
          });
        } catch (e) {
          console.log(e);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: "",
              executedQty: 0,
              remainingQty: 0,
            },
          });
        }
        break;
    }
  }
  createOrder(
    market: string,
    price: string,
    quantity: string,
    side: "buy" | "sell",
    userId: string,
  ) {
    const orderbook = this.orderbooks.find(
      (orderbook) => orderbook.ticker() === market,
    );
    const baseAsset = market.split("_")[0];
    const quoteAsset = market.split("_")[1];

    if (!orderbook) {
      throw new Error("No orderbook found");
    }

    this.checkAndLockFunds(
      baseAsset,
      quoteAsset,
      side,
      userId,
      quoteAsset,
      price,
      quantity,
    );

    const order: Order = {
      price: Number(price),
      quantity: Number(quantity),
      orderId: randomUUID(),
      filled: 0,
      side,
      userId,
    };

    const { fills, executedQty } = orderbook.addOrder(order);
    this.updateBalance(userId, baseAsset, quoteAsset, side, fills, executedQty);

    this.createDbTrades(fills, market, userId);
    this.updateDbOrders(order, executedQty, fills, market);
    this.publisWsDepthUpdates(fills, price, side, market);
    this.publishWsTrades(fills, userId, market);
    return { executedQty, fills, orderId: order.orderId };
  }
  saveSnapshot() {
    const snapshotSnapshot = {
      orderbooks: this.orderbooks.map((orderbook) => orderbook.getSnapshot()),
      balances: Array.from(this.balances.entries()),
    };
    fs.writeFileSync("./snapshot.json", JSON.stringify(snapshotSnapshot));
  }
  async setBaseBalances() {
    try {
      const wallets = await prisma.wallet.findMany({
        select: {
          userId: true,
          balance: true,
          assetsHeld: true, // JSON column storing assets
        },
      });

      this.balances.clear();

      for (const wallet of wallets) {
        const userBalances: UserBalance = {};

        // Base currency (INR)
        userBalances[BASE_CURRENCY] = {
          available: Number(wallet.balance ?? 0),
          locked: 0,
        };

        // Assets held (stocks/crypto etc.)
        if (wallet.assetsHeld) {
          const assets =
            typeof wallet.assetsHeld === "string"
              ? JSON.parse(wallet.assetsHeld)
              : wallet.assetsHeld;

          for (const asset of Object.keys(assets)) {
            userBalances[asset] = {
              available: Number(assets[asset].available ?? 0),
              locked: Number(assets[asset].locked ?? 0),
            };
          }
        }

        this.balances.set(wallet.userId, userBalances);
      }

      console.log(`Loaded balances for ${this.balances.size} users`);
    } catch (error) {
      console.error("Failed to fetch balances from DB:", error);
    }
  }
}
