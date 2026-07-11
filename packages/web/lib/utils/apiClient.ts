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
  const tickers = await getTickers();

  const ticker = tickers.find((ticker) => ticker.symbol === market);

  if (!ticker) {
    throw new Error(`Ticker not found for market: ${market}`);
  }

  return ticker;
}

export async function getDepth(market: string): Promise<DepthUpdateMessage> {
  const { data } = await api.get<DepthUpdateMessage>("/depth", {
    params: {
      market,
    },
  });

  return data;
}

export async function getTrades(market: string): Promise<Trade[]> {
  const { data } = await api.get<Trade[]>("/trades", {
    params: {
      market,
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
