"use client";

import { useEffect, useRef, useState } from "react";
import type { Trade } from "@exchange-lab/shared";
import { getTrades } from "@/lib/utils/apiClient";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";

export function TradesList({
  market,
  limit = 50,
}: {
  market: string;
  limit?: number;
}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    getTrades(market, limit)
      .then((data) => {
        if (isMountedRef.current) setTrades(data);
      })
      .catch((err) =>
        console.error(`Failed to fetch trades for ${market}:`, err),
      );

    const manager = MarketDataManager.getInstance();
    const callbackId = `TRADES-${market}`;

    manager.registerCallback("trade", callbackId, (payload: any) => {
      if (!isMountedRef.current) return;
      if (payload.symbol !== market) return;

      const trade: Trade = {
        id: payload.id,
        market: payload.symbol,
        price: payload.price,
        quantity: payload.quantity,
        quoteQuantity: (
          Number(payload.price) * Number(payload.quantity)
        ).toString(),
        isBuyerMaker: payload.isBuyerMaker,
        timestamp: payload.timestamp,
      };

      setTrades((prev) => [trade, ...prev].slice(0, limit));
    });

    manager.sendMessage({
      method: "SUBSCRIBE",
      params: [`trade@${market}`],
    });

    return () => {
      isMountedRef.current = false;
      manager.deRegisterCallback("trade", callbackId);
      manager.sendMessage({
        method: "UNSUBSCRIBE",
        params: [`trade@${market}`],
      });
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
        {trades.map((trade, i) => (
          <div
            key={trade.id ?? i}
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
              {new Date(Number(trade.timestamp)).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
