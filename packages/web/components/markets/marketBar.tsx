"use client";

import { useEffect, useRef, useState } from "react";
import type { Ticker } from "@exchange-lab/shared";
import { getTicker } from "@/lib/utils/apiClient";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const MarketBar = ({ market }: { market: string }) => {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");
  const lastPriceRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    getTicker(market)
      .then((data) => {
        if (!isMounted || !data) return;
        setTicker(data);
        const p = Number(data.lastPrice);
        if (!Number.isNaN(p)) lastPriceRef.current = p;
      })
      .catch((err) =>
        console.error(`Failed to fetch initial ticker for ${market}:`, err),
      );

    const manager = MarketDataManager.getInstance();
    const callbackId = `TRADE-${market}`;

    manager.registerCallback("trade", callbackId, (data: Partial<Ticker>) => {
      if (!isMounted) return;
      if (data.symbol && data.symbol !== market) return;

      const newPrice = Number(data.lastPrice);
      if (!Number.isNaN(newPrice) && lastPriceRef.current !== null) {
        if (newPrice > lastPriceRef.current) setTrend("up");
        else if (newPrice < lastPriceRef.current) setTrend("down");
      }
      if (!Number.isNaN(newPrice)) lastPriceRef.current = newPrice;

      setTicker((prev) => ({ ...(prev || {}), ...data }) as Ticker);
    });

    manager.sendMessage({
      method: "SUBSCRIBE",
      params: [`trade@${market}`],
    });

    return () => {
      isMounted = false;
      manager.deRegisterCallback("trade", callbackId);
      manager.sendMessage({
        method: "UNSUBSCRIBE",
        params: [`trade@${market}`],
      });
    };
  }, [market]);

  const priceChangeNum = Number(ticker?.priceChange ?? 0);
  const trendColor =
    trend === "up"
      ? "text-green-500"
      : trend === "down"
        ? "text-red-500"
        : priceChangeNum >= 0
          ? "text-emerald-500"
          : "text-red-500";

  return (
    <div className="h-full w-full flex items-center">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex h-full w-full items-center gap-4 px-2 lg:gap-6 lg:px-4">
          {/* Pair */}
          <MarketDisplay market={market} />

          <Separator orientation="vertical" className="h-8 bg-border/40" />

          {/* Price */}
          <div className="flex shrink-0 flex-col justify-center">
            <span
              className={`text-lg font-bold tabular-nums leading-tight transition-colors duration-300 ${trendColor}`}>
              ₹{ticker?.lastPrice ?? "--"}
            </span>

            <span className={`text-xs tabular-nums leading-none ${trendColor}`}>
              {priceChangeNum >= 0 ? "+" : ""}
              {ticker?.priceChange ?? "0.00"} (
              {Number(ticker?.priceChangePercent ?? 0).toFixed(2)}%)
            </span>
          </div>

          <Separator orientation="vertical" className="h-8 bg-border/40" />

          {/* Metrics */}
          <Metric label="24H High" value={ticker?.high ?? "--"} />
          <Metric label="24H Low" value={ticker?.low ?? "--"} />
          <Metric label="Volume" value={ticker?.volume ?? "--"} />
        </div>

        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};

function MarketDisplay({ market }: { market: string }) {
  const [baseAsset = "UNKNOWN", quoteAsset = ""] = market.split("_");

  return (
    <div className="flex shrink-0 items-baseline gap-1">
      <span className="text-lg font-semibold tracking-tight">{baseAsset}</span>
      {quoteAsset && (
        <span className="text-xs text-muted-foreground">/{quoteAsset}</span>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-[80px] flex-col justify-center">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums leading-tight">
        {value}
      </span>
    </div>
  );
}
