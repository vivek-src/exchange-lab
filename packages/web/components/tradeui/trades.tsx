"use client";

import { useEffect, useState } from "react";
import { getTrades } from "@/lib/utils/apiClient";
import type { Trade } from "@exchange-lab/shared";

interface TradesListProps {
  market: string;
  limit?: number;
}

export function TradesList({ market, limit = 50 }: TradesListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getTrades(market, limit);
        if (!cancelled) setTrades(data);
      } catch (err) {
        console.error(err);
      }
    }

    load();
    const interval = setInterval(load, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [market, limit]);

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 text-xs text-muted-foreground px-3 py-2 border-b border-white/10 shrink-0">
        <span>Price</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-3 text-xs px-3 py-1.5 hover:bg-white/5">
            <span
              className={
                trade.isBuyerMaker ? "text-red-500" : "text-green-500"
              }>
              {Number(trade.price).toFixed(2)}
            </span>
            <span className="text-right">
              {Number(trade.quantity).toFixed(4)}
            </span>
            <span className="text-right text-muted-foreground">
              {new Date(trade.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
