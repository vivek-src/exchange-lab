"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  BarChart3,
  ArrowRightLeft,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTickers, getKlines } from "@/lib/utils/apiClient";
import type { Ticker } from "@exchange-lab/shared";
import { Sparkline } from "@/components/markets/Sparkline";

// Static content

const NAV_LINKS = [
  { label: "Markets", href: "/markets" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Docs", href: "/docs" },
];

const FEATURES = [
  {
    title: "Real order matching",
    body: "Orders fill against live market data, with the same slippage and liquidity constraints as the real thing.",
  },
  {
    title: "A proper terminal",
    body: "Depth-of-market, advanced order types, and charting built for people who already know what they're doing.",
  },
  {
    title: "Nothing at stake",
    body: "Break a strategy, blow the account, start over. It's a ₹50,000 balance that was never real to begin with.",
  },
];

const NEW_STEPS = [
  {
    title: "Create an Account",
    body: "Sign up in seconds and instantly receive your ₹50,000 virtual balance.",
    icon: UserPlus,
  },
  {
    title: "Choose a Market",
    body: "Select from real live order books, including top equities and assets.",
    icon: BarChart3,
  },
  {
    title: "Place a Trade",
    body: "Buy and sell against a live simulated order book with real slippage.",
    icon: ArrowRightLeft,
  },
  {
    title: "Analyze Results",
    body: "Review your P&L, adjust your strategy, and keep practicing risk-free.",
    icon: TrendingUp,
  },
];

const AVAILABLE_MARKETS = [
  { symbol: "RIL_INR", name: "Reliance Industries" },
  { symbol: "TATA_INR", name: "Tata Motors" },
  { symbol: "SOL_INR", name: "Solana" },
];

const POLL_INTERVAL_MS = 5000;

// Formatting helpers

const priceFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatPrice(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return priceFormatter.format(num);
}

function formatVolume(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return volumeFormatter.format(num);
}

// Normalizes whatever shape the tickers endpoint returns into Ticker[].
// Ideally getTickers() itself is typed to return Ticker[] and this goes away.
function extractTickers(response: unknown): Ticker[] | null {
  if (Array.isArray(response)) return response as Ticker[];
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Ticker[];
    if (Array.isArray(obj.tickers)) return obj.tickers as Ticker[];
  }
  return null;
}

// Ticker tape

type TapeItem = {
  symbol?: string;
  lastPrice?: string | number;
  priceChangePercent?: string;
};

function TickerTape({
  tickers,
  loading,
}: {
  tickers: Ticker[];
  loading: boolean;
}) {
  const placeholder: TapeItem[] = Array.from({ length: 6 }).map(() => ({
    symbol: "----/---",
    lastPrice: "----",
    priceChangePercent: "0",
  }));
  const items: TapeItem[] = loading || !tickers?.length ? placeholder : tickers;
  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-b border-[#1E2126] bg-[#0A0B0D]"
      aria-hidden="true">
      <div className="ticker-track flex w-max items-center gap-8 whitespace-nowrap py-2">
        {loop.map((t, i) => {
          const change = parseFloat(t.priceChangePercent || "0");
          const positive = change >= 0;
          return (
            <span
              key={i}
              className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
              <span className="font-medium text-zinc-300">
                {t.symbol?.replace("_", "/")}
              </span>
              <span>₹{formatPrice(t.lastPrice)}</span>
              <span className={positive ? "text-emerald-400" : "text-red-400"}>
                {positive ? "+" : ""}
                {t.priceChangePercent}%
              </span>
            </span>
          );
        })}
      </div>
      <style jsx>{`
        .ticker-track {
          animation: scroll-left 40s linear infinite;
          will-change: transform;
        }
        @keyframes scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// Market card
function MarketCard({
  symbol,
  name,
  live,
}: {
  symbol: string;
  name: string;
  live: Ticker | null;
}) {
  const [closes, setCloses] = useState<number[]>([]);
  const change = live ? parseFloat(live.priceChangePercent || "0") : 0;
  const positive = change >= 0;

  useEffect(() => {
    let cancelled = false;

    const endTime = Date.now();
    const startTime = endTime - 7 * 24 * 60 * 60 * 1000;

    getKlines(symbol, "1h", startTime, endTime)
      .then((klines) => {
        if (cancelled) return;
        setCloses(klines.map((k) => Number(k.close)));
      })
      .catch(() => {
        if (cancelled) return;
        setCloses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <Link
      href={`/trade/${symbol}`}
      className="group flex flex-col rounded-xl border border-white/5 bg-white/5 p-5 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/10">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm font-medium text-white">
            {symbol.replace("_", "/")}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">{name}</div>
        </div>
        {live ? (
          <div
            className={`flex items-center gap-0.5 font-mono text-xs font-medium ${
              positive ? "text-emerald-400" : "text-red-400"
            }`}>
            {positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {live.priceChangePercent}%
          </div>
        ) : (
          <div className="h-4 w-10 animate-pulse rounded bg-[#23262B]" />
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="font-mono text-xl font-semibold text-white">
          {live ? (
            `₹${formatPrice(live.lastPrice)}`
          ) : (
            <span className="inline-block h-6 w-20 animate-pulse rounded bg-[#23262B]" />
          )}
        </div>
        <div className="h-8 w-20">
          <Sparkline data={closes} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 font-mono text-[11px] text-zinc-600">
        <span>Vol {live ? formatVolume(live.volume) : "—"}</span>
        <span className="text-zinc-500 group-hover:text-[var(--brand-cyan)]">
          Trade →
        </span>
      </div>
    </Link>
  );
}

// Page
export default function LandingPage() {
  const [liveTickers, setLiveTickers] = useState<Ticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const consecutiveFailuresRef = useRef(0);

  const fetchTickers = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await getTickers();
      if (signal.aborted) return;

      const extracted = extractTickers(response);
      if (extracted) {
        setLiveTickers(extracted);
        setHasError(false);
        consecutiveFailuresRef.current = 0;
      } else {
        console.warn(
          "Ticker data received but structural format was unrecognized:",
          response,
        );
        consecutiveFailuresRef.current += 1;
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error("Failed to fetch tickers:", error);
      consecutiveFailuresRef.current += 1;
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
        // Only surface an error banner after a couple of consecutive
        // failures, so a single dropped request doesn't flash a warning.
        if (consecutiveFailuresRef.current >= 2) setHasError(true);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const tick = async () => {
      await fetchTickers(controller.signal);
      if (stopped) return;
      // Pause polling while the tab isn't visible to avoid needless load.
      const delay =
        document.visibilityState === "hidden"
          ? POLL_INTERVAL_MS * 3
          : POLL_INTERVAL_MS;
      timeoutId = setTimeout(tick, delay);
    };

    tick();

    const handleVisibility = () => {
      // Wake up immediately when the tab becomes visible again.
      if (document.visibilityState === "visible" && timeoutId) {
        clearTimeout(timeoutId);
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopped = true;
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchTickers]);

  const marketsWithData = useMemo(
    () =>
      AVAILABLE_MARKETS.map((m) => ({
        ...m,
        live: liveTickers?.find((t) => t?.symbol === m.symbol) ?? null,
      })),
    [liveTickers],
  );

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-zinc-50 selection:bg-[var(--brand-blue)] selection:text-white">
      {/* Live ticker tape */}
      <TickerTape tickers={liveTickers} loading={isLoading} />

      {hasError && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-center font-mono text-xs text-amber-300">
          <AlertTriangle className="size-3.5 shrink-0" />
          Live prices are having trouble loading right now. Showing the last
          known data.
        </div>
      )}

      {/* Combined Hero & Dashboard Image Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Left Column: Text & CTAs */}
          <div className="max-w-2xl lg:max-w-none">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
              Practice trading on real markets.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-400">
              Trade a live, simulated order book with a ₹50,000 virtual balance.
              Real prices, real execution, zero financial risk.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/trade/RIL_INR">
                <Button className="h-11 rounded-md bg-[var(--brand-blue)] px-6 text-sm font-medium text-white shadow-lg shadow-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)]/90">
                  Start trading
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link href="/markets">
                <Button
                  variant="outline"
                  className="h-11 rounded-md border-white/10 bg-transparent px-6 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white">
                  View markets
                </Button>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-xs text-zinc-500">
              <span>
                <strong className="font-mono font-medium text-zinc-200">
                  ₹50,000
                </strong>{" "}
                starting balance
              </span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span>
                <strong className="font-mono font-medium text-zinc-200">
                  {AVAILABLE_MARKETS.length}
                </strong>{" "}
                live markets
              </span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span>No card required</span>
            </div>
          </div>

          {/* Right Column: Dashboard Image */}
          <div className="relative mx-auto w-full max-w-[600px] lg:max-w-[700px] xl:max-w-none">
            <div
              className="relative w-full"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
              }}>
              <div
                className="relative aspect-[16/10] w-full"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
                }}>
                <Image
                  src="/dash.webp"
                  alt="XCHG Lab trading terminal"
                  fill
                  className="object-contain"
                  quality={100}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live markets */}
      <section className="border-t border-[#1E2126] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold text-white">
              Markets
            </h2>
            <Link
              href="/markets"
              className="text-sm font-medium text-[var(--brand-cyan)] hover:text-[var(--brand-cyan)]/80">
              View all
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {marketsWithData.map(({ symbol, name, live }) => (
              <MarketCard
                key={symbol}
                symbol={symbol}
                name={name}
                live={live}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features — Sticky Split Timeline */}
      <section className="border-t border-[#1E2126] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <div className="mb-5 inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                  <span className="h-px w-5 bg-[var(--brand-cyan)]" />
                  Built for the desk
                </div>
                <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-[40px] sm:leading-[1.15]">
                  Pro-grade tools, <br />
                  <span className="text-zinc-500">zero risk.</span>
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400">
                  We stripped away the deposits and identity checks, but kept
                  all the complexity. Experience a trading environment designed
                  for serious analysis and execution.
                </p>
              </div>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <div className="relative flex flex-col space-y-12">
                {/* single continuous line spanning the full list height */}
                <div className="absolute inset-y-0 left-0 w-[2px] bg-[#1E2126]" />

                {FEATURES.map((feature, idx) => (
                  <div key={idx} className="group relative py-1 pl-8">
                    <div className="absolute -left-[5.5px] top-2.5 size-[9px] rounded-full bg-[#23262B] ring-[3px] ring-[#0A0B0D] transition-all duration-300 group-hover:scale-125 group-hover:bg-[var(--brand-blue)] group-hover:shadow-[0_0_12px_rgba(37,99,235,0.6)]" />

                    <h3 className="font-display text-xl font-medium tracking-normal text-zinc-200 transition-colors group-hover:text-white sm:text-[22px]">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                      {feature.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[#1E2126] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-md">
              <div className="mb-3 font-mono text-[13px] font-medium text-[var(--brand-cyan)]">
                Create Profile
              </div>
              <h2 className="mb-6 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Easy Way to Get Started
              </h2>
              <p className="mb-10 text-sm leading-relaxed text-zinc-400">
                Skip the deposits and identity verification. Jump straight into
                the action with a fully funded virtual account designed to
                mirror real market conditions perfectly. Learn the ropes with
                zero financial risk.
              </p>

              <Link href="/signup">
                <Button className="h-10 rounded-md bg-[var(--brand-blue)] px-6 text-sm font-medium text-white shadow-lg shadow-[var(--brand-blue)]/20 hover:bg-[var(--brand-blue)]/90">
                  Start Trading
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mr-8">
                {[NEW_STEPS[0], NEW_STEPS[1]].map((step, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0E1015] p-6 text-center shadow-lg transition-colors hover:border-white/20 hover:bg-[#131519]">
                    <step.icon className="mb-4 size-7 text-[var(--brand-blue)]" />
                    <h3 className="mb-2 font-display text-[15px] font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:ml-8">
                {[NEW_STEPS[2], NEW_STEPS[3]].map((step, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0E1015] p-6 text-center shadow-lg transition-colors hover:border-white/20 hover:bg-[#131519]">
                    <step.icon className="mb-4 size-7 text-[var(--brand-blue)]" />
                    <h3 className="mb-2 font-display text-[15px] font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-[#1E2126] py-24">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="font-display text-2xl font-semibold leading-tight text-white sm:text-3xl">
            ₹50,000 you can actually afford to lose.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-500">
            Free account, live prices, zero risk. Takes a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/signup">
              <Button className="h-10 rounded-md bg-[var(--brand-blue)] px-6 text-sm font-medium text-white hover:bg-[var(--brand-blue)]/90 shadow-lg shadow-[var(--brand-blue)]/20">
                Create free account
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
