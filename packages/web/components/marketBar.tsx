"use client";
import { useEffect, useState } from "react";
import type { Ticker } from "@exchange-lab/shared";
import { getTicker } from "@/lib/utils/apiClient";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";

export const MarketBar = ({ market }: { market: string }) => {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    getTicker(market).then(setTicker);

    const manager = MarketDataManager.getInstance();
    const callbackId = `TICKER-${market}`;

    manager.registerCallback("ticker", callbackId, (data: Partial<Ticker>) => {
      setTicker((prevTicker) => {
        return {
          ...(prevTicker || {}),
          ...data,
        } as Ticker;
      });
    });

    manager.sendMessage({ method: "SUBSCRIBE", params: [`ticker.${market}`] });

    return () => {
      manager.deRegisterCallback("ticker", callbackId);
      manager.sendMessage({
        method: "UNSUBSCRIBE",
        params: [`ticker.${market}`],
      });
    };
  }, [market]);

  const isPositive = Number(ticker?.priceChange ?? 0) >= 0;
  const trendColor = isPositive ? "text-green-400" : "text-red-400";

  return (
    <div className="border-b border-neutral-800 bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center gap-10 overflow-x-auto no-scrollbar">
          <MarketDisplay market={market} />

          <div className="flex items-center gap-10 shrink-0 text-sm">
            {/* Current Price */}
            <div className="flex flex-col justify-center">
              <span className="text-xs text-neutral-500 mb-0.5">Price</span>
              <span className={`font-medium tabular-nums ${trendColor}`}>
                ${ticker?.lastPrice ?? "--"}
              </span>
            </div>

            {/* Change */}
            <div className="flex flex-col justify-center">
              <span className="text-xs text-neutral-500 mb-0.5">
                24h Change
              </span>
              <span className={`font-medium tabular-nums ${trendColor}`}>
                {isPositive ? "+" : ""}
                {ticker?.priceChange ?? "0.00"}{" "}
                <span className="opacity-75">
                  ({Number(ticker?.priceChangePercent ?? 0).toFixed(2)}%)
                </span>
              </span>
            </div>

            {/* High */}
            <div className="flex flex-col justify-center">
              <span className="text-xs text-neutral-500 mb-0.5">24h High</span>
              <span className="font-medium tabular-nums text-neutral-200">
                {ticker?.high ?? "--"}
              </span>
            </div>

            {/* Low */}
            <div className="flex flex-col justify-center">
              <span className="text-xs text-neutral-500 mb-0.5">24h Low</span>
              <span className="font-medium tabular-nums text-neutral-200">
                {ticker?.low ?? "--"}
              </span>
            </div>

            {/* Volume */}
            <div className="flex flex-col justify-center">
              <span className="text-xs text-neutral-500 mb-0.5">24h Vol</span>
              <span className="font-medium tabular-nums text-neutral-200">
                {ticker?.volume ?? "--"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function MarketDisplay({ market }: { market: string }) {
  const [baseAsset, quoteAsset] = market.split("_");

  return (
    <div className="flex items-center shrink-0 pr-4">
      <span className="text-lg font-medium text-neutral-100">{baseAsset}</span>
      <span className="text-lg font-light text-neutral-600 mx-1.5">/</span>
      <span className="text-sm font-medium text-neutral-400">{quoteAsset}</span>
    </div>
  );
}
