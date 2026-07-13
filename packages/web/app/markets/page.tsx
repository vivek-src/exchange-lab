"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getTickers, getKlines } from "@/lib/utils/apiClient";
import type { Ticker } from "@exchange-lab/shared";
import { Sparkline } from "@/components/markets/Sparkline";
import { Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Banner, CoinDropIllustration } from "@/components/banner";

// Muted, translucent palette — mirrors the P&L pill treatment
// (bg-emerald-500/10 text-emerald-500) instead of solid saturated fills.
const BADGE_PALETTE = [
  { bg: "bg-[var(--brand-cyan)]/10", text: "text-[var(--brand-cyan)]" },
  { bg: "bg-[var(--brand-blue)]/10", text: "text-[var(--brand-blue)]" },
  { bg: "bg-violet-500/10", text: "text-violet-400" },
  { bg: "bg-teal-500/10", text: "text-teal-400" },
  { bg: "bg-amber-500/10", text: "text-amber-400" },
  { bg: "bg-rose-500/10", text: "text-rose-400" },
];

function badgeStyle(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length];
}

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
        title={
          <>
            ₹50,000{" "}
            <span className="text-[var(--brand-cyan)]">Sandbox Capital</span>
            <br />
            +Seed Asset Allocation
          </>
        }
        subtitle="Interact with a live-synced matching engine. Claim your simulated balance and seed assets to explore order execution, latency, and real-time ledger updates."
        buttonText="Register Now"
        rightGraphic={<CoinDropIllustration />}
        onClick={() => {}}
      />

      {/* Featured cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Top Movers</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))
            : tickers
                .slice(0, 4)
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

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <TableHeader label="Coin Name" />
                  <TableHeader label="Coin Price" align="right" />
                  <TableHeader label="24h Change" align="right" />
                  <TableHeader label="24h Volume" align="right" />
                  <TableHeader label="Chart" align="right" />
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
                      colSpan={5}
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

function TableHeader({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-6 py-4 font-medium ${
        align === "right" ? "text-right" : "text-left"
      }`}>
      {label}
    </th>
  );
}

function MarketCard({
  ticker,
  onClick,
}: {
  ticker: Ticker;
  onClick: () => void;
}) {
  const [closes, setCloses] = useState<number[]>([]);
  const change = parseFloat(ticker.priceChangePercent);
  const isUp = change >= 0;
  const [base] = ticker.symbol.split("_");
  const badge = badgeStyle(ticker.symbol);

  useEffect(() => {
    const endTime = Date.now();
    const startTime = endTime - 7 * 24 * 60 * 60 * 1000;
    getKlines(ticker.symbol, "1h", startTime, endTime)
      .then((klines) => setCloses(klines.map((k) => Number(k.close))))
      .catch(() => setCloses([]));
  }, [ticker.symbol]);

  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-[var(--brand-blue)]/50">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
            {base.slice(0, 1)}
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {base}
          </span>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">
            ₹{ticker.lastPrice}
          </span>
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              isUp ? "text-emerald-500" : "text-red-500"
            }`}>
            {isUp ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {isUp ? "+" : ""}
            {ticker.priceChangePercent}%
          </span>
        </div>
      </div>

      <div className="h-10 w-20 shrink-0">
        <Sparkline data={closes} />
      </div>
    </button>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/5 px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="size-6 shrink-0 animate-pulse rounded-full bg-muted/40" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <div className="h-4 w-14 animate-pulse rounded bg-muted/40" />
          <div className="h-3 w-10 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
      <div className="h-10 w-20 shrink-0 animate-pulse rounded bg-muted/40" />
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
  const [base] = ticker.symbol.split("_");
  const badge = badgeStyle(ticker.symbol);

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
      <td className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
            {base.slice(0, 1)}
          </span>
          <span className="font-medium text-foreground">{base}</span>
        </div>
      </td>
      <td className="px-6 py-5 text-right font-medium text-foreground">
        ₹{ticker.lastPrice}
      </td>
      <td className="px-6 py-5 text-right">
        <Badge
          variant="outline"
          className={`gap-1 rounded-full border-transparent px-2.5 py-1 text-xs font-medium ${
            isUp
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500"
          }`}>
          {isUp ? "+" : ""}
          {ticker.priceChangePercent}%
          {isUp ? (
            <ArrowUpRight className="size-3" />
          ) : (
            <ArrowDownRight className="size-3" />
          )}
        </Badge>
      </td>
      <td className="px-6 py-5 text-right text-muted-foreground">
        {ticker.volume}
      </td>
      <td className="px-6 py-5">
        <div className="ml-auto w-24">
          <Sparkline data={closes} />
        </div>
      </td>
    </tr>
  );
}

function MarketRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted/40" />
          <div className="h-5 w-10 animate-pulse rounded bg-muted/40" />
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-5 text-right">
        <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-muted/40" />
      </td>
      <td className="px-6 py-5 text-right">
        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted/40" />
      </td>
      <td className="px-6 py-5">
        <div className="ml-auto h-8 w-24 animate-pulse rounded bg-muted/40" />
      </td>
    </tr>
  );
}
