"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronRight,
} from "lucide-react";
import { getTickers, getKlines } from "@/lib/utils/apiClient";
import type { Ticker } from "@exchange-lab/shared";
import { Sparkline } from "@/components/markets/Sparkline";
import { Banner } from "@/components/banner";

export default function MarketsPage() {
  const router = useRouter();
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getTickers()
      .then(setTickers)
      .finally(() => setIsLoading(false));
  }, []);

  const goToMarket = (symbol: string) => router.push(`/trade/${symbol}`);

  const filteredTickers = useMemo(() => {
    if (!query.trim()) return tickers;
    const q = query.trim().toLowerCase();
    return tickers.filter((t) => t.symbol.toLowerCase().includes(q));
  }, [tickers, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <Banner
        image="/banner.png"
        title="Wire Transfers Are Live"
        subtitle="Deposit and withdraw INR. Stake BP or trade for more free wires."
      />

      {/* Featured cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Top Movers</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))
            : tickers
                .slice(0, 6)
                .map((t) => (
                  <MarketCard
                    key={t.symbol}
                    ticker={t}
                    onClick={() => goToMarket(t.symbol)}
                  />
                ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Markets</h2>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus:border-[var(--brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]/50"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-left text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Market</th>
                  <th className="px-6 py-4 text-right font-medium">Price</th>
                  <th className="px-6 py-4 text-right font-medium">
                    24h Volume
                  </th>
                  <th className="px-6 py-4 text-right font-medium">
                    24h Change
                  </th>
                  <th className="px-6 py-4 text-right font-medium">7d Trend</th>
                  <th className="w-12 px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <MarketRowSkeleton key={i} />
                  ))
                ) : filteredTickers.length > 0 ? (
                  filteredTickers.map((t) => (
                    <MarketRow
                      key={t.symbol}
                      ticker={t}
                      onClick={() => goToMarket(t.symbol)}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground">
                      No markets found matching "{query}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketCard({
  ticker,
  onClick,
}: {
  ticker: Ticker;
  onClick: () => void;
}) {
  const change = parseFloat(ticker.priceChangePercent);
  const isUp = change >= 0;
  const [base, quote] = ticker.symbol.split("_");

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-[var(--brand-blue)]/50">
      <div className="flex items-baseline gap-1">
        <span className="font-semibold text-foreground">{base}</span>
        <span className="text-xs text-muted-foreground">/{quote}</span>
      </div>

      <div className="mt-2 text-lg font-semibold text-foreground">
        ${ticker.lastPrice}
      </div>

      <div
        className={`mt-1 flex w-fit items-center gap-1 text-sm ${
          isUp ? "text-emerald-400" : "text-red-400"
        }`}>
        {isUp ? (
          <ArrowUpRight className="size-4" />
        ) : (
          <ArrowDownRight className="size-4" />
        )}
        {isUp ? "+" : ""}
        {ticker.priceChangePercent}%
      </div>
    </button>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="h-5 w-16 animate-pulse rounded bg-muted/40" />
      <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted/40" />
      <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted/40" />
    </div>
  );
}

function MarketRow({
  ticker,
  onClick,
}: {
  ticker: Ticker;
  onClick: () => void;
}) {
  const [closes, setCloses] = useState<number[]>([]);
  const change = parseFloat(ticker.priceChangePercent);
  const isUp = change >= 0;
  const [base, quote] = ticker.symbol.split("_");

  useEffect(() => {
    const endTime = Date.now();
    const startTime = endTime - 7 * 24 * 60 * 60 * 1000;
    getKlines(ticker.symbol, "1h", startTime, endTime)
      .then((klines) => setCloses(klines.map((k) => Number(k.close))))
      .catch(() => setCloses([]));
  }, [ticker.symbol]);

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-muted/30">
      <td className="px-6 py-4">
        <div className="flex items-baseline gap-1">
          <span className="font-medium text-foreground">{base}</span>
          <span className="text-xs text-muted-foreground">/{quote}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-right text-foreground">
        ${ticker.lastPrice}
      </td>
      <td className="px-6 py-4 text-right text-muted-foreground">
        {ticker.volume}
      </td>
      <td className="px-6 py-4 text-right">
        <span
          className={`inline-flex items-center justify-end gap-1 ${
            isUp ? "text-emerald-400" : "text-red-400"
          }`}>
          {isUp ? (
            <ArrowUpRight className="size-4" />
          ) : (
            <ArrowDownRight className="size-4" />
          )}
          {isUp ? "+" : ""}
          {ticker.priceChangePercent}%
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="ml-auto w-24">
          <Sparkline data={closes} />
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <ChevronRight className="ml-auto size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </td>
    </tr>
  );
}

function MarketRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="h-5 w-20 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="ml-auto h-5 w-24 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="ml-auto h-5 w-20 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="ml-auto h-5 w-16 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-4">
        <div className="ml-auto h-8 w-24 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-4" />
    </tr>
  );
}
