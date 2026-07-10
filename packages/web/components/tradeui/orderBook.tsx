import { useEffect, useRef, useState } from "react";
import { DEPTH, type EngineResponse } from "@exchange-lab/shared";
import { getDepth, getTicker } from "@/lib/utils/apiClient";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";

type DepthPayload = Extract<EngineResponse, { type: typeof DEPTH }>["payload"];
type Level = [string, string];
type Row = {
  price: string;
  qty: string;
  total: number;
};

// Depth updates are incremental: a quantity of "0" means the price level
// should be removed. Anything else means "set/replace this level".
function mergeLevels(existing: Level[], updates: Level[]): Level[] {
  const book = new Map(existing.map(([price, qty]) => [price, qty]));
  for (const [price, qty] of updates) {
    if (Number(qty) === 0) {
      book.delete(price);
    } else {
      book.set(price, qty);
    }
  }
  return Array.from(book.entries());
}

export function OrderBook({ market }: { market: string }) {
  const [depth, setDepth] = useState<DepthPayload | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");
  const lastPriceRef = useRef<number | null>(null);

  // Tracks whether the initial REST snapshot has landed yet, and buffers
  // any ws updates that arrive before it does so nothing gets dropped.
  const snapshotReadyRef = useRef(false);
  const pendingUpdatesRef = useRef<DepthPayload[]>([]);

  useEffect(() => {
    let isMounted = true;
    const manager = MarketDataManager.getInstance();
    const subscriberId = `orderbook-${market}`;
    const depthStream = `depth@${market}`;
    const tradeStream = `trade@${market}`;

    setDepth(null);
    setLastPrice(null);
    setTrend("flat");
    lastPriceRef.current = null;
    snapshotReadyRef.current = false;
    pendingUpdatesRef.current = [];

    function applyUpdate(update: DepthPayload) {
      setDepth((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          asks: mergeLevels(prev.asks as Level[], update.asks as Level[]),
          bids: mergeLevels(prev.bids as Level[], update.bids as Level[]),
        } as DepthPayload;
      });
    }

    manager.registerCallback(
      "depth",
      subscriberId,
      (payload: DepthPayload & { symbol?: string }) => {
        if (payload.symbol && payload.symbol !== market) return;
        if (!snapshotReadyRef.current) {
          pendingUpdatesRef.current.push(payload);
          return;
        }
        applyUpdate(payload);
      },
    );

    manager.registerCallback(
      "trade",
      subscriberId,
      (payload: { symbol?: string; lastPrice?: string }) => {
        if (payload.symbol && payload.symbol !== market) return;

        const newPrice = Number(payload.lastPrice);
        if (Number.isNaN(newPrice)) return;

        if (lastPriceRef.current !== null) {
          if (newPrice > lastPriceRef.current) setTrend("up");
          else if (newPrice < lastPriceRef.current) setTrend("down");
        }
        lastPriceRef.current = newPrice;
        setLastPrice(newPrice);
      },
    );

    // Adjust this shape to whatever your backend actually expects for
    // subscribing — this mirrors the "depth@{market}" naming you described.
    manager.sendMessage({ method: "SUBSCRIBE", params: [depthStream] });
    manager.sendMessage({ method: "SUBSCRIBE", params: [tradeStream] });

    async function loadSnapshot() {
      try {
        const [depthData, ticker] = await Promise.all([
          getDepth(market),
          getTicker(market),
        ]);
        if (!isMounted) return;

        //@ts-expect-error - REST response shape vs shared DepthPayload
        setDepth(depthData);
        const initialPrice = Number(ticker.lastPrice);
        if (!Number.isNaN(initialPrice)) {
          lastPriceRef.current = initialPrice;
          setLastPrice(initialPrice);
        }

        snapshotReadyRef.current = true;
        const queued = pendingUpdatesRef.current;
        pendingUpdatesRef.current = [];
        queued.forEach(applyUpdate);
      } catch (err) {
        console.error(err);
      }
    }
    loadSnapshot();

    return () => {
      isMounted = false;
      manager.sendMessage({ method: "UNSUBSCRIBE", params: [depthStream] });
      manager.sendMessage({ method: "UNSUBSCRIBE", params: [tradeStream] });
      manager.deRegisterCallback("depth", subscriberId);
      manager.deRegisterCallback("trade", subscriberId);
    };
  }, [market]);

  if (!depth) {
    return (
      <div className="flex h-full items-center justify-center">Loading...</div>
    );
  }

  // Sort prices from highest to lowest
  const sortedAsks = [...depth.asks].sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );
  const sortedBids = [...depth.bids].sort(
    (a, b) => Number(b[0]) - Number(a[0]),
  );

  // Keep only the prices nearest the spread
  const asks = sortedAsks.slice(-10);
  const bids = sortedBids.slice(0, 10);

  function calculateTotals(orders: [string, string][], reverse = false): Row[] {
    let runningTotal = 0;
    const source = reverse ? [...orders].reverse() : orders;
    const rows = source.map(([price, qty]) => {
      runningTotal += Number(qty);
      return {
        price,
        qty,
        total: runningTotal,
      };
    });
    return reverse ? rows.reverse() : rows;
  }

  const askRows = calculateTotals(asks, true);
  const bidRows = calculateTotals(bids);
  const maxTotal = Math.max(
    askRows.at(-1)?.total ?? 0,
    bidRows.at(-1)?.total ?? 0,
    1,
  );

  function renderRows(rows: Row[], color: "red" | "green") {
    return rows.map((row) => (
      <div
        key={row.price}
        className="relative grid grid-cols-3 px-3 py-1 text-xs tabular-nums">
        <div
          className={`absolute inset-y-0 right-0 ${
            color === "red" ? "bg-red-500/10" : "bg-emerald-500/10"
          }`}
          style={{
            width: `${(row.total / maxTotal) * 100}%`,
          }}
        />
        <span
          className={`relative ${
            color === "red" ? "text-red-400" : "text-emerald-400"
          }`}>
          {Number(row.price).toFixed(2)}
        </span>
        <span className="relative text-right">
          {Number(row.qty).toFixed(4)}
        </span>
        <span className="relative text-right text-muted-foreground">
          {row.total.toFixed(4)}
        </span>
      </div>
    ));
  }

  return (
    <div className="flex h-full flex-col text-neutral-200">
      <div className="grid grid-cols-3 border-b border-white/10 px-3 py-2 text-xs text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderRows(askRows, "red")}
        <div className="border-y border-white/10 px-3 py-2">
          <span
            className={`text-base font-semibold tabular-nums transition-colors duration-300 ${
              trend === "down" ? "text-red-400" : "text-emerald-400"
            }`}>
            {lastPrice?.toFixed(2) ?? "—"}
          </span>
        </div>
        {renderRows(bidRows, "green")}
        {bidRows.length === 0 && (
          <div className="py-3 text-center text-xs text-neutral-600">
            No bids
          </div>
        )}
      </div>
    </div>
  );
}
