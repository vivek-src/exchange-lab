import { useEffect, useState } from "react";
import { DEPTH, type EngineResponse } from "@exchange-lab/shared";
import { getDepth, getTicker } from "@/lib/utils/apiClient";

type DepthPayload = Extract<EngineResponse, { type: typeof DEPTH }>["payload"];

type Row = {
  price: string;
  qty: string;
  total: number;
};

export function OrderBook({ market }: { market: string }) {
  const [depth, setDepth] = useState<DepthPayload | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [depthData, ticker] = await Promise.all([
          getDepth(market),
          getTicker(market),
        ]);

        //@ts-expect-error
        setDepth(depthData);
        setLastPrice(Number(ticker.lastPrice));
      } catch (err) {
        console.error(err);
      }
    }

    load();
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
          <span className="text-base font-semibold tabular-nums text-emerald-400">
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
