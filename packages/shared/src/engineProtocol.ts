import {
  CREATE_ORDER,
  CANCEL_ORDER,
  ON_RAMP,
  GET_DEPTH,
  GET_OPEN_ORDERS,
  DEPTH,
  ORDER_PLACED,
  ORDER_CANCELLED,
  OPEN_ORDERS,
} from "./engineEvents.js";

//  Requests API => Engine

export type EngineRequest =
  | {
      type: typeof CREATE_ORDER;
      data: {
        market: string;
        price: string;
        quantity: string;
        side: "buy" | "sell";
        userId: string;
      };
    }
  | {
      type: typeof CANCEL_ORDER;
      data: {
        orderId: string;
        market: string;
      };
    }
  | {
      type: typeof ON_RAMP;
      data: {
        amount: string;
        userId: string;
        txnId: string;
      };
    }
  | {
      type: typeof GET_DEPTH;
      data: {
        market: string;
      };
    }
  | {
      type: typeof GET_OPEN_ORDERS;
      data: {
        userId: string;
        market: string;
      };
    };

//  Responses Engine => API

export type EngineResponse =
  | {
      type: typeof DEPTH;
      payload: {
        market: string;
        bids: [string, string][];
        asks: [string, string][];
      };
    }
  | {
      type: typeof ORDER_PLACED;
      payload: {
        orderId: string;
        executedQty: number;
        fills: {
          price: string;
          qty: number;
          tradeId: number;
        }[];
      };
    }
  | {
      type: typeof ORDER_CANCELLED;
      payload: {
        orderId: string;
        executedQty: number;
        remainingQty: number;
      };
    }
  | {
      type: typeof OPEN_ORDERS;
      payload: {
        orderId: string;
        executedQty: number;
        price: string;
        quantity: string;
        side: "buy" | "sell";
        userId: string;
      }[];
    };
