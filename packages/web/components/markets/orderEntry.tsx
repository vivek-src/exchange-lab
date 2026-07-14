"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { isAxiosError } from "axios";
import type { Ticker } from "@exchange-lab/shared";

import { getTicker, placeOrder } from "@/lib/utils/apiClient";
import { getWallet, type Wallet } from "@/lib/utils/getWallet";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface OrderEntryProps {
  market: string;
}

const MARKET_ORDER_SLIPPAGE_PCT = 1.0;

export function OrderEntry({ market }: OrderEntryProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [currentPrice, setCurrentPrice] = useState("0.00");

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    executedQty: number;
    remainingQty: number;
    restingOnBook: boolean;
  } | null>(null);

  const [baseAsset, quoteAsset] = market.includes("_")
    ? market.split("_")
    : [market, "INR"];

  const isBuy = side === "buy";
  const isLimit = type === "limit";

  // Live price feed
  useEffect(() => {
    let isMounted = true;

    getTicker(market)
      .then((data) => {
        if (isMounted && data) setCurrentPrice(data.lastPrice);
      })
      .catch((err) => console.error("Failed to fetch ticker:", err));

    const manager = MarketDataManager.getInstance();
    const callbackId = `ORDER-ENTRY-${market}`;

    manager.registerCallback("trade", callbackId, (data: Partial<Ticker>) => {
      if (!isMounted || (data.symbol && data.symbol !== market)) return;
      if (data.lastPrice) setCurrentPrice(data.lastPrice);
    });
    manager.sendMessage({ method: "SUBSCRIBE", params: [`trade@${market}`] });

    return () => {
      isMounted = false;
      manager.deRegisterCallback("trade", callbackId);
      manager.sendMessage({
        method: "UNSUBSCRIBE",
        params: [`trade@${market}`],
      });
    };
  }, [market]);

  async function refreshWallet() {
    if (!session) return setWallet(null);
    setWalletLoading(true);
    try {
      setWallet(await getWallet());
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }

  useEffect(() => {
    refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const quoteBalance = Number(wallet?.balance ?? "0");
  const baseBalance = wallet?.holdings?.[baseAsset] ?? 0;
  const availableBalance = isBuy ? quoteBalance : baseBalance;
  const availableLabel = isBuy ? quoteAsset : baseAsset;

  const livePrice = parseFloat(currentPrice) || 0;
  const limitPrice = parseFloat(price) || livePrice || 0;
  const marketExecutionPrice = isBuy
    ? livePrice * (1 + MARKET_ORDER_SLIPPAGE_PCT / 100)
    : livePrice * (1 - MARKET_ORDER_SLIPPAGE_PCT / 100);

  const activePrice = isLimit ? limitPrice : marketExecutionPrice;
  const activeQty = parseFloat(quantity) || 0;
  const totalValue = (activePrice * activeQty).toFixed(2);

  const insufficientBalance = isBuy
    ? Number(totalValue) > quoteBalance
    : activeQty > baseBalance;

  const canSubmit =
    !!session &&
    !submitting &&
    activeQty > 0 &&
    activePrice > 0 &&
    !insufficientBalance;

  function handleSetMax() {
    if (isBuy) {
      if (activePrice <= 0) return;
      const maxQty =
        Math.floor((quoteBalance / activePrice) * 1_000_000) / 1_000_000;
      setQuantity(maxQty.toString());
    } else {
      setQuantity(baseBalance.toString());
    }
  }

  function resetFeedback() {
    setSubmitResult(null);
    setSubmitError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const userId = (session?.user as any)?.id;
    if (!userId) return setSubmitError("User ID not found in session");

    setSubmitting(true);
    resetFeedback();

    try {
      const result = await placeOrder({
        userId,
        market,
        side,
        orderType: type,
        quantity: activeQty.toString(),
        price: activePrice.toString(),
      });

      setSubmitResult({
        executedQty: result.executedQty,
        remainingQty: result.remainingQty,
        restingOnBook: result.restingOnBook,
      });

      setQuantity("");
      if (isLimit) setPrice("");
      await refreshWallet();
    } catch (err) {
      console.error("Failed to place order:", err);
      const message =
        (isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error ? err.message : "Failed to place order");
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function resultMessage() {
    if (!submitResult) return null;
    const { executedQty, remainingQty, restingOnBook } = submitResult;
    if (remainingQty === 0) return `Filled ${executedQty} ${baseAsset}`;
    if (restingOnBook)
      return `Filled ${executedQty} ${baseAsset}, ${remainingQty} resting on the book`;
    if (executedQty === 0) return "No liquidity available — order not filled";
    return `Filled ${executedQty} ${baseAsset}, ${remainingQty} cancelled (no more liquidity within range)`;
  }

  return (
    <div className="flex flex-col gap-4">
      <SideToggle
        side={side}
        onChange={(s) => {
          setSide(s);
          resetFeedback();
        }}
      />

      <Tabs
        value={type}
        onValueChange={(v) => {
          setType(v as "limit" | "market");
          resetFeedback();
        }}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/30">
          <TabsTrigger
            value="limit"
            className="text-muted-foreground data-[state=active]:bg-[var(--brand-cyan)]/10 data-[state=active]:text-[var(--brand-cyan)]">
            Limit
          </TabsTrigger>
          <TabsTrigger
            value="market"
            className="text-muted-foreground data-[state=active]:bg-[var(--brand-cyan)]/10 data-[state=active]:text-[var(--brand-cyan)]">
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="limit" className="mt-4 space-y-3">
          <AmountField
            label="Price"
            value={price}
            onChange={setPrice}
            placeholder={currentPrice}
            suffix={quoteAsset}
          />
          <div className="space-y-1.5">
            <AmountField
              label="Quantity"
              value={quantity}
              onChange={setQuantity}
              placeholder="0.00"
              suffix={baseAsset}
            />
            <AvailableRow
              loading={walletLoading}
              amount={availableBalance}
              label={availableLabel}
              decimals={isBuy ? 2 : 4}
              showMax={!!session}
              onMax={handleSetMax}
            />
          </div>
          <SummaryBox
            rows={[{ label: "Total", value: `${totalValue} ${quoteAsset}` }]}
          />
        </TabsContent>

        <TabsContent value="market" className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <AmountField
              label="Quantity"
              value={quantity}
              onChange={setQuantity}
              placeholder="0.00"
              suffix={baseAsset}
            />
            <AvailableRow
              loading={walletLoading}
              amount={availableBalance}
              label={availableLabel}
              decimals={isBuy ? 2 : 4}
              showMax={!!session}
              onMax={handleSetMax}
            />
          </div>
          <SummaryBox
            rows={[
              {
                label: `Est. Price (${MARKET_ORDER_SLIPPAGE_PCT}% slippage)`,
                value: `${marketExecutionPrice.toFixed(2)} ${quoteAsset}`,
              },
              { label: "Est. Total", value: `~${totalValue} ${quoteAsset}` },
            ]}
          />
        </TabsContent>

        {/* Shared feedback + submit — same for both tabs since they share all order state */}
        <div className="mt-3 space-y-2">
          {insufficientBalance && activeQty > 0 && (
            <Banner
              tone="error"
              text={`Insufficient ${availableLabel} balance`}
            />
          )}
          {submitError && <Banner tone="error" text={submitError} />}
          {resultMessage() && <Banner tone="success" text={resultMessage()!} />}

          {isLoading ? (
            <Button disabled className="h-11 w-full bg-muted/20">
              Loading...
            </Button>
          ) : !session ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="h-11 w-full border-border font-semibold hover:bg-muted/20"
                onClick={() => signIn()}>
                Log In
              </Button>
              <Button
                className="h-11 w-full bg-[var(--brand-cyan)] font-semibold text-black hover:bg-[var(--brand-cyan)]/90"
                onClick={() => signIn()}>
                Sign Up
              </Button>
            </div>
          ) : (
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={`h-11 w-full font-semibold text-white transition-colors disabled:opacity-40 ${
                isBuy
                  ? "bg-emerald-500 hover:bg-emerald-700"
                  : "bg-red-500 hover:bg-red-700"
              }`}>
              {submitting
                ? "Placing…"
                : `${isBuy ? "Buy" : "Sell"} ${baseAsset}`}
            </Button>
          )}
        </div>
      </Tabs>
    </div>
  );
}

// ── Small presentational pieces, kept local since they're only used here ──

function SideToggle({
  side,
  onChange,
}: {
  side: "buy" | "sell";
  onChange: (side: "buy" | "sell") => void;
}) {
  const isBuy = side === "buy";
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/30 p-1">
      <button
        onClick={() => onChange("buy")}
        className={`h-9 rounded-md text-sm font-semibold transition-colors ${
          isBuy
            ? "bg-emerald-500/20 text-emerald-500"
            : "text-muted-foreground hover:text-foreground"
        }`}>
        Buy
      </button>
      <button
        onClick={() => onChange("sell")}
        className={`h-9 rounded-md text-sm font-semibold transition-colors ${
          !isBuy
            ? "bg-red-500/20 text-red-500"
            : "text-muted-foreground hover:text-foreground"
        }`}>
        Sell
      </button>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-14 border-transparent bg-muted/20 focus-visible:ring-1 focus-visible:ring-[var(--brand-blue)]/50"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function AvailableRow({
  loading,
  amount,
  label,
  decimals,
  showMax,
  onMax,
}: {
  loading: boolean;
  amount: number;
  label: string;
  decimals: number;
  showMax: boolean;
  onMax: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-0.5 text-xs">
      <span className="text-muted-foreground">
        Available{" "}
        <span className="text-foreground/80">
          {loading
            ? "…"
            : `${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${label}`}
        </span>
      </span>
      {showMax && (
        <button
          type="button"
          onClick={onMax}
          className="font-medium text-muted-foreground hover:text-foreground">
          Max
        </button>
      )}
    </div>
  );
}

function SummaryBox({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-muted/30 p-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <span className="font-medium text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  const isError = tone === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 ${isError ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
      {isError ? (
        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
      )}
      <p
        className={`text-xs leading-relaxed ${isError ? "text-red-500" : "text-emerald-500"}`}>
        {text}
      </p>
    </div>
  );
}
