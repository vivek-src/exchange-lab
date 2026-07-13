import { prisma } from "@exchange-lab/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTickers } from "@/lib/utils/apiClient";
import type { Ticker } from "@exchange-lab/shared";
import { Briefcase, Wallet as WalletIcon } from "lucide-react";

// `Wallet.assetsHeld` is a jsonb column shaped like { [ticker]: quantity }.
// We don't track avg. buy price yet (that would mean filtering the
// Transaction table per user), so P&L isn't shown here for now.
type AssetsHeld = Record<string, number>;

function parseAssetsHeld(raw: unknown): AssetsHeld {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: AssetsHeld = {};
  for (const [ticker, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    const quantity = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(quantity)) continue;
    result[ticker] = quantity;
  }
  return result;
}

// Same muted, translucent avatar palette used on the Markets page
// (bg-*/10 + text-*-400) instead of solid saturated fills, so a coin's
// badge looks identical whether you're on /markets or /portfolio.
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

export default async function PortfolioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [wallet, liveTickers] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    getTickers().catch(() => [] as Ticker[]),
  ]);

  if (!wallet) redirect("/login");

  const cashBalance = Number(wallet.balance);
  const assetsHeld = parseAssetsHeld(wallet.assetsHeld);

  // assetsHeld keys are bare asset symbols (e.g. "RIL"), but getTickers()
  // returns market pairs (e.g. "RIL_INR"). Index by the base symbol so
  // the two line up.
  const tickerMap = new Map(
    liveTickers.map((t) => [t.symbol.split("_")[0], t]),
  );

  const positions = Object.entries(assetsHeld)
    .filter(([, quantity]) => quantity > 0)
    .map(([baseSymbol, quantity]) => {
      const live = tickerMap.get(baseSymbol);
      const currentPrice = live ? Number(live.lastPrice) : 0;
      const marketValue = quantity * currentPrice;

      return {
        baseSymbol,
        // full market pair symbol (e.g. "RIL_INR"), for links to /trade/[symbol]
        marketSymbol: live?.symbol ?? baseSymbol,
        quantity,
        currentPrice,
        marketValue,
      };
    });

  const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalAccountValue = totalMarketValue + cashBalance;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <Briefcase className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Your open positions and balances
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <p className="text-sm text-muted-foreground">Portfolio Value</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            ₹
            {totalMarketValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <WalletIcon className="size-3.5" />
            Cash Balance
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            ₹
            {cashBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <p className="text-sm text-muted-foreground">Total Account Value</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            ₹
            {totalAccountValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Holdings */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">Holdings</h2>
          <span className="text-sm text-muted-foreground">
            {positions.length} position{positions.length !== 1 && "s"}
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any open positions yet.
            </p>
            <Link
              href="/markets"
              className="mt-3 inline-block text-sm font-medium text-[var(--brand-cyan)] hover:text-[var(--brand-cyan)]/80">
              Browse markets →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Asset</th>
                    <th className="px-6 py-4 text-right font-medium">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Current Price
                    </th>
                    <th className="px-6 py-4 text-right font-medium">
                      Market Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((p) => {
                    const badge = badgeStyle(p.baseSymbol);
                    return (
                      <tr
                        key={p.baseSymbol}
                        className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-5">
                          <Link
                            href={`/trade/${p.marketSymbol}`}
                            className="group flex items-center gap-2.5">
                            <span
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                              {p.baseSymbol.slice(0, 1)}
                            </span>
                            <span className="font-medium text-foreground group-hover:text-[var(--brand-cyan)]">
                              {p.baseSymbol}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-foreground">
                          {p.quantity}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-foreground">
                          ₹{p.currentPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono font-medium text-foreground">
                          ₹
                          {p.marketValue.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
