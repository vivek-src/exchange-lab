import { BASE_CURRENCY } from "@exchange-lab/shared";
import { Snowflake } from "./Snowflake.js";
const snowflake = new Snowflake(1);
export interface Order {
  price: number;
  quantity: number;
  orderId: bigint;
  filled: number;
  side: "buy" | "sell";
  userId: string;
}

export interface Fill {
  tradeId: bigint;
  price: number;
  qty: number;
  otherUserId: string;
  makerOrderId: bigint;
}
export class Orderbook {
  bids: Order[];
  asks: Order[];
  baseAsset: string;
  quoteAsset: string = BASE_CURRENCY;
  currentPrice: number;

  constructor(
    baseAsset: string,
    bids: Order[],
    asks: Order[],
    currentPrice: number,
  ) {
    this.bids = bids;
    this.asks = asks;
    this.baseAsset = baseAsset;
    this.currentPrice = currentPrice || 0;
  }
  ticker() {
    return `${this.baseAsset}_${this.quoteAsset}`;
  }
  getSnapshot() {
    return;
  }
  addOrder(
    order: Order,
    options: { rest?: boolean } = {},
  ): { executedQty: number; fills: Fill[] } {
    const shouldRest = options.rest ?? true;

    let finalExecutedQty = 0;
    let finalFills: Fill[] = [];

    if (order.side == "buy") {
      const { executedQty, fills } = this.matchBuytoAsks(order);
      order.filled = executedQty;
      finalExecutedQty = executedQty;
      finalFills = fills;

      if (shouldRest && executedQty < order.quantity) {
        this.bids.push(order);
      }
    } else {
      const { executedQty, fills } = this.matchSelltoBids(order);
      order.filled = executedQty;
      finalExecutedQty = executedQty;
      finalFills = fills;

      if (shouldRest && executedQty < order.quantity) {
        this.asks.push(order);
      }
    }
    return {
      executedQty: finalExecutedQty,
      fills: finalFills,
    };
  }
  matchBuytoAsks(order: Order): { fills: Fill[]; executedQty: number } {
    const fills: Fill[] = [];
    let executedQty = 0;

    // TODO: Move sorting to order insertion phase to optimize performance
    this.asks.sort((x, y) => x.price - y.price);

    for (let i = 0; i < this.asks.length; i++) {
      const ask = this.asks[i]!;

      // Stop if the seller wants more than the buyer is willing to pay
      if (ask.price > order.price) {
        break;
      }

      const remainingBuy = order.quantity - executedQty;
      const remainingAsk = ask.quantity - ask.filled; // Standardized to executedQty

      const filledQty = Math.min(remainingBuy, remainingAsk);
      executedQty += filledQty;
      ask.filled += filledQty;

      // add to fills
      fills.push({
        price: ask.price,
        qty: filledQty,
        tradeId: snowflake.generate(),
        otherUserId: ask.userId,
        makerOrderId: ask.orderId,
      });

      // Remove fully filled maker order
      if (ask.filled === ask.quantity) {
        this.asks.splice(i, 1);
        i--;
      }

      // Stop if taker order is fully filled
      if (executedQty === order.quantity) break;
    }

    return { fills, executedQty };
  }

  matchSelltoBids(order: Order): { fills: Fill[]; executedQty: number } {
    const fills: Fill[] = [];
    let executedQty = 0;

    // TODO: Move sorting to order insertion phase to optimize performance
    this.bids.sort((x, y) => y.price - x.price);

    for (let i = 0; i < this.bids.length; i++) {
      const bid = this.bids[i]!;

      // Price-Time priority: Stop if the buyer wants to pay less than the seller is asking
      if (bid.price < order.price) {
        break;
      }

      const remainingSell = order.quantity - executedQty;
      const remainingBid = bid.quantity - bid.filled;

      const filledQty = Math.min(remainingSell, remainingBid);
      executedQty += filledQty;
      bid.filled += filledQty;

      fills.push({
        price: bid.price,
        qty: filledQty,
        tradeId: snowflake.generate(),
        otherUserId: bid.userId,
        makerOrderId: bid.orderId,
      });

      if (bid.filled === bid.quantity) {
        this.bids.splice(i, 1);
        i--;
      }

      if (executedQty === order.quantity) {
        break;
      }
    }

    return { fills, executedQty };
  }
  getDepth() {
    // Definign temp Vars
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    // hash for easy matching price
    const bidsObject: { [key: string]: number } = {};
    const asksObject: { [key: string]: number } = {};

    // Aggregating Bids of same price
    for (const order of this.bids) {
      const remainingQty = order.quantity - order.filled;

      if (remainingQty <= 0) continue;

      bidsObject[order.price] = (bidsObject[order.price] ?? 0) + remainingQty;
    }

    // Aggregating asks of same price
    for (const order of this.asks) {
      const remainingQty = order.quantity - order.filled;

      if (remainingQty <= 0) continue;

      asksObject[order.price] = (asksObject[order.price] ?? 0) + remainingQty;
    }

    // Formatting Return Array
    for (const [price, quantity] of Object.entries(bidsObject)) {
      bids.push([price, quantity.toString()]);
    }

    for (const [price, quantity] of Object.entries(asksObject)) {
      asks.push([price, quantity.toString()]);
    }

    // retirn Bids and asks array
    return {
      bids,
      asks,
    };
  }
  getOpenOrder(userId: string): Order[] {
    //Filer order with user ID and return to the user
    const asks = this.asks.filter((x) => x.userId === userId);
    const bids = this.bids.filter((x) => x.userId === userId);
    return [...asks, ...bids];
  }
  cancelBid(order: Order) {
    // get index of the bid go to the index and remove the element at that index from the bids
    const index = this.bids.findIndex((x) => x.orderId === order.orderId);
    if (index !== -1) {
      const price = this.bids[index]!.price;
      this.bids.splice(index, 1);
      return price;
    }
  }
  cancelAsk(order: Order) {
    //Same logic here also
    const index = this.asks.findIndex((x) => x.orderId === order.orderId);
    if (index !== -1) {
      const price = this.asks[index]!.price;
      this.asks.splice(index, 1);
      return price;
    }
  }
}
