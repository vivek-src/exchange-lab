import { Ticker } from "@exchange-lab/shared";

export const BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:3001";

type EventType = "ticker" | "depth" | string;
type SubscriberId = string;
type CallbackFunction = (data: any) => void;

export class MarketDataManager {
  private ws: WebSocket | null = null;
  private static instance: MarketDataManager;
  private bufferedMessages: object[] = [];
  private msgId: number = 1;

  private callbacks: Map<EventType, Map<SubscriberId, CallbackFunction>> =
    new Map();

  private constructor() {
    this.connect();
  }

  public static getInstance(): MarketDataManager {
    if (!this.instance) {
      this.instance = new MarketDataManager();
    }
    return this.instance;
  }

  private connect() {
    this.ws = new WebSocket(BASE_URL);

    this.ws.onopen = () => {
      // Flush buffered messages once connected
      while (this.bufferedMessages.length > 0) {
        const msg = this.bufferedMessages.shift();
        if (msg) this.ws?.send(JSON.stringify(msg));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (!message?.data?.e) return;

        const type = message.data.e as EventType;
        const typeCallbacks = this.callbacks.get(type);

        if (!typeCallbacks || typeCallbacks.size === 0) return;

        let parsedPayload: any = null;

        if (type === "ticker") {
          parsedPayload = {
            lastPrice: message.data.c,
            high: message.data.h,
            low: message.data.l,
            volume: message.data.v,
            quoteVolume: message.data.V,
            symbol: message.data.s,
          } as Partial<Ticker>;
        } else if (type === "depth") {
          parsedPayload = {
            bids: message.data.b,
            asks: message.data.a,
          };
        }

        if (parsedPayload) {
          typeCallbacks.forEach((callback) => callback(parsedPayload));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.warn("WebSocket disconnected. Attempting to reconnect...");
      // Simple auto-reconnect logic
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  public sendMessage(message: object) {
    const messageToSend = {
      ...message,
      id: this.msgId++,
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(messageToSend));
    } else {
      this.bufferedMessages.push(messageToSend);
    }
  }

  public registerCallback(
    type: EventType,
    id: SubscriberId,
    callback: CallbackFunction,
  ) {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Map());
    }
    this.callbacks.get(type)?.set(id, callback);
  }

  public deRegisterCallback(type: EventType, id: SubscriberId) {
    const typeCallbacks = this.callbacks.get(type);
    if (typeCallbacks) {
      typeCallbacks.delete(id);
      if (typeCallbacks.size === 0) {
        this.callbacks.delete(type);
      }
    }
  }
}
