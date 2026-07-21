import axios from "axios";
import type {
  DepthUpdateMessage,
  KLine,
  Ticker,
  Trade,
  EngineRequest,
  EngineResponse,
} from "@exchange-lab/shared";

// Extract the exact types from your Engine definitions
export type CreateOrderPayload = Extract<
  EngineRequest,
  { type: "CREATE_ORDER" }
>["data"];
export type OrderPlacedResponse = Extract<
  EngineResponse,
  { type: "ORDER_PLACED" }
>["payload"];

const BASE_URL =
  process.env.NEXT_PUBLIC_REST_API_URL ?? "http://localhost:3001/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getTickers(): Promise<Ticker[]> {
  try {
    const { data } = await api.get<Ticker[]>("/tickers");
    return data;
  } catch (error) {
    console.error("Failed to fetch tickers:", error);
    return [];
  }
}

export async function getTicker(market: string): Promise<Ticker> {
  try {
    const { data } = await api.get<Ticker[]>("/tickers", {
      params: { market },
    });

    if (!data.length) {
      throw new Error(`Ticker not found for market: ${market}`);
    }

    return data[0];
  } catch (error) {
    console.error(`Failed to fetch ticker for ${market}:`, error);
    throw error;
  }
}

export async function getDepth(market: string): Promise<DepthUpdateMessage> {
  const { data } = await api.get<DepthUpdateMessage>("/depth", {
    params: {
      market,
    },
  });

  return data;
}

export async function getTrades(market: string, limit?: number): Promise<Trade[]> {
  const { data } = await api.get<Trade[]>("/trades", {
    params: {
      market,
      limit,
    },
  });

  return data;
}

export async function getKlines(
  market: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<KLine[]> {
  const { data } = await api.get<KLine[]>("/klines", {
    params: {
      symbol: market,
      interval,
      startTime,
      endTime,
    },
  });

  return data.sort((a, b) => Number(a.end) - Number(b.end));
}

// Added placeOrder without touching the original Axios config
export async function placeOrder(
  payload: CreateOrderPayload,
): Promise<OrderPlacedResponse> {
  const { data } = await api.post<OrderPlacedResponse>("/order", payload, {
    timeout: 20_000,
  });
  return data;
}

export async function getOpenOrders(
  userId: string,
  market: string,
): Promise<Extract<EngineResponse, { type: "OPEN_ORDERS" }>["payload"]> {
  const { data } = await api.get<
    Extract<EngineResponse, { type: "OPEN_ORDERS" }>["payload"]
  >("/order/open", {
    params: {
      userId,
      market,
    },
  });
  return data;
}

export async function cancelOrder(
  orderId: string,
  market: string,
): Promise<Extract<EngineResponse, { type: "ORDER_CANCELLED" }>["payload"]> {
  const { data } = await api.delete<
    Extract<EngineResponse, { type: "ORDER_CANCELLED" }>["payload"]
  >("/order", {
    // Axios requires body payloads for DELETE requests to be nested inside the `data` config property
    data: {
      orderId,
      market,
    },
  });
  return data;
}
