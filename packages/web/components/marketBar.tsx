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
          ? "text-green-500"
          : "text-red-500";

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex items-center gap-6">
            {/* Pair */}
            <MarketDisplay market={market} />

            <Separator orientation="vertical" className="h-10" />

            {/* Price */}
            <div className="flex shrink-0 flex-col">
              <span
                className={`text-2xl font-bold tabular-nums transition-colors duration-300 ${trendColor}`}>
                ${ticker?.lastPrice ?? "--"}
              </span>

              <span className={`text-sm tabular-nums ${trendColor}`}>
                {priceChangeNum >= 0 ? "+" : ""}
                {ticker?.priceChange ?? "0.00"} (
                {Number(ticker?.priceChangePercent ?? 0).toFixed(2)}%)
              </span>
            </div>

            <Separator orientation="vertical" className="h-10" />

            {/* Metrics */}
            <Metric label="24H High" value={ticker?.high ?? "--"} />
            <Metric label="24H Low" value={ticker?.low ?? "--"} />
            <Metric label="Volume" value={ticker?.volume ?? "--"} />
          </div>

          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};

function MarketDisplay({ market }: { market: string }) {
  const [baseAsset = "UNKNOWN", quoteAsset = ""] = market.split("_");

  return (
    <div className="flex shrink-0 items-baseline gap-1">
      <span className="text-xl font-semibold tracking-tight">{baseAsset}</span>

      {quoteAsset && (
        <span className="text-sm text-muted-foreground">/{quoteAsset}</span>
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-[90px] flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>

      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
