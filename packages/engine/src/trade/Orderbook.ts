import { BASE_CURRENCY } from "@exchange-lab/shared";
export interface Order {
  price: number;
  quantity: number;
  orderId: string;
  filled: number;
  side: "buy" | "sell";
  userId: string;
}

export interface Fill {
  price: string;
  qty: number;
  tradeId: number; // This may cause issue in future
  otherUserId: string;
  markerOrderId: string;
}

export class Orderbook {
  bids: Order[];
  asks: Order[];
  baseAsset: string;
  quoteAsset: string = BASE_CURRENCY;
  lastTradeId: number;
  currentPrice: number;

  constructor(
    baseAsset: string,
    bids: Order[],
    asks: Order[],
    lastTradeId: number,
    currentPrice: number,
  ) {
    this.bids = bids;
    this.asks = asks;
    this.baseAsset = baseAsset;
    this.lastTradeId = lastTradeId || 0;
    this.currentPrice = currentPrice || 0;
  }
  getSnapshot() {
    return;
  }
  addOrder(order: Order): { executedQty: number; fills: Fill[] } {
    let finalExecutedQty = 0;
    let finalFills: Fill[] = [];

    if (order.side == "buy") {
      const { executedQty, fills } = this.matchBuytoAsks(order);
      order.filled = executedQty;
      finalExecutedQty = executedQty;
      finalFills = fills;

      if (executedQty < order.quantity) {
        this.bids.push(order);
      }
    } else {
      const { executedQty, fills } = this.matchSelltoBids(order);
      order.filled = executedQty;
      finalExecutedQty = executedQty;
      finalFills = fills;

      if (executedQty < order.quantity) {
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

    //Sort asks
    this.asks.sort((x, y) => x.price - y.price);

    // Loop through all the sell order on the orderbook
    for (let i = 0; i < this.asks.length; i++) {
      const ask = this.asks[i]!;

      if (ask.price > order.price) {
        break;
      }

      const remainingBuy = order.quantity - executedQty;
      const remainingAsk = ask.quantity - ask.filled;

      const filledQty = Math.min(remainingBuy, remainingAsk);
      executedQty += filledQty;
      ask.filled += filledQty;

      // push filled order to fills arr
      fills.push({
        price: ask.price.toString(),
        qty: filledQty,
        tradeId: this.lastTradeId++,
        otherUserId: ask.userId,
        markerOrderId: ask.orderId,
      });

      // remove order from asks[] fully filled
      if (ask.filled === ask.quantity) {
        this.asks.splice(i, 1);
        i--;
      }

      // stop if order is fully filled
      if (executedQty === order.quantity) break;
    }
    return { fills, executedQty };
  }
  matchSelltoBids(order: Order): { fills: Fill[]; executedQty: number } {
    const fills: Fill[] = [];
    let executedQty = 0;

    this.bids.sort((x, y) => y.price - x.price);

    for (let i = 0; i < this.bids.length; i++) {
      const bid = this.bids[i]!;

      if (bid.price < order.price) {
        break;
      }

      const remainingSell = order.quantity - executedQty;
      const remainingBid = bid.quantity - bid.filled;

      const filledQty = Math.min(remainingSell, remainingBid);
      executedQty += filledQty;
      bid.filled += filledQty;

      fills.push({
        price: bid.price.toString(),
        qty: filledQty,
        tradeId: this.lastTradeId++,
        otherUserId: bid.userId,
        markerOrderId: bid.orderId,
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
    for (let i = 0; i < this.bids.length; i++) {
      const order = this.bids[i]!;
      if (!bidsObject[order.price]) {
        bidsObject[order.price] = 0;
      }
      const currentQty = bidsObject[order.price] || 0;

      bidsObject[order.price] = currentQty + order.quantity;
    }

    // Aggregating asks of same price
    for (let i = 0; i < this.asks.length; i++) {
      const order = this.asks[i]!;
      if (!asksObject[order.price]) {
        asksObject[order.price] = 0;
      }
      const currentQty = asksObject[order.price] || 0;
      asksObject[order.price] = currentQty + order.quantity;
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
  // Relies directly on data hooked to map when matchign happens
  //   getDepth() {
  //     const bids: [string, string][] = [];
  //     const asks: [string, string][] = [];
  //     for (const [price, quantity] of Object.entries(this.bidDepthMap)) {
  //         bids.push([price, quantity.toString()]);
  //     }

  //     for (const [price, quantity] of Object.entries(this.askDepthMap)) {
  //         asks.push([price, quantity.toString()]);
  //     }

  //     return { bids, asks };
  // }
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
