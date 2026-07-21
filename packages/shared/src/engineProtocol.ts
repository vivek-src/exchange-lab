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
  ADD_USER,
  NEW_USER,
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
        orderType: "limit" | "market";
        executionType?: "ioc" | undefined;
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
    }
  | {
      type: typeof ADD_USER;
      data: {
        userId: string;
        wallet: {
          userId: string;
          balance: any;
          assetsHeld: any;
        };
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
        remainingQty: number;
        restingOnBook: boolean;
        fills: {
          price: string;
          qty: number;
          tradeId: string;
        }[];
      };
    }
  | {
      type: typeof ORDER_CANCELLED;
      payload: {
        orderId: string;
        executedQty: number;
        remainingQty: number;
        error?: string;
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
    }
  | {
      type: typeof ON_RAMP;
      payload: {
        status: "success" | "error";
        message: string;
        txnId?: string;
      };
    }
  | {
      type: typeof NEW_USER;
      payload: {
        status: "success" | "error";
      };
    };
