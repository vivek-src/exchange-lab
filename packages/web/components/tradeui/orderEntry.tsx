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

interface OrderEntryProps {
  market: string;
}

const MARKET_ORDER_SLIPPAGE_PCT = 0.5;

export function OrderEntry({ market }: OrderEntryProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");

  // Input states
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  // Live market data state
  const [currentPrice, setCurrentPrice] = useState<string>("0.00");

  // Wallet state
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Submission state
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

  // Subscribe to live price data
  useEffect(() => {
    let isMounted = true;

    // Fetch initial price
    getTicker(market)
      .then((data) => {
        if (!isMounted || !data) return;
        setCurrentPrice(data.lastPrice);
      })
      .catch((err) => console.error("Failed to fetch ticker:", err));

    // Connect to WebSocket
    const manager = MarketDataManager.getInstance();
    const callbackId = `ORDER-ENTRY-${market}`;

    manager.registerCallback("trade", callbackId, (data: Partial<Ticker>) => {
      if (!isMounted) return;
      if (data.symbol && data.symbol !== market) return;
      if (data.lastPrice) {
        setCurrentPrice(data.lastPrice);
      }
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

  async function refreshWallet() {
    if (!session) {
      setWallet(null);
      return;
    }
    setWalletLoading(true);
    try {
      const data = await getWallet();
      setWallet(data);
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
      // Floor the amount to prevent rounding up past available balance
      const maxQty =
        Math.floor((quoteBalance / activePrice) * 1000000) / 1000000;
      setQuantity(maxQty.toString());
    } else {
      setQuantity(baseBalance.toString());
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    // Ensure we have a session and the user ID
    // Note: Depending on your NextAuth config, the ID might be located at
    // session.user.id. You may need to cast it if TS complains.
    const userId = (session?.user as any)?.id;

    if (!userId) {
      setSubmitError("User ID not found in session");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const result = await placeOrder({
        userId: userId, // <-- Now sending the userId just like Postman
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
      if (isAxiosError(err) && err.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to place order",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderSubmitResult() {
    if (!submitResult) return null;
    const { executedQty, remainingQty, restingOnBook } = submitResult;

    let message: string;
    if (remainingQty === 0) {
      message = `Filled ${executedQty} ${baseAsset}`;
    } else if (restingOnBook) {
      message = `Filled ${executedQty} ${baseAsset}, ${remainingQty} resting on the book`;
    } else if (executedQty === 0) {
      message = "No liquidity available — order not filled";
    } else {
      message = `Filled ${executedQty} ${baseAsset}, ${remainingQty} cancelled (no more liquidity within range)`;
    }

    return <p className="text-xs text-muted-foreground">{message}</p>;
  }

  function renderAvailableRow() {
    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          Available:{" "}
          {walletLoading
            ? "…"
            : `${availableBalance.toLocaleString("en-US", {
                minimumFractionDigits: isBuy ? 2 : 4,
                maximumFractionDigits: isBuy ? 2 : 4,
              })} ${availableLabel}`}
        </span>
        {session && (
          <button
            type="button"
            onClick={handleSetMax}
            className="font-medium text-white/70 hover:text-white">
            Max
          </button>
        )}
      </div>
    );
  }

  function renderActionButton() {
    if (isLoading) {
      return (
        <Button
          disabled
          className="w-full h-11 bg-white/5 border border-border/20">
          Loading...
        </Button>
      );
    }

    if (!session) {
      return (
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full h-11 font-semibold border-border/40 hover:bg-white/5"
            onClick={() => signIn()}>
            Log In
          </Button>
          <Button
            className="w-full h-11 font-semibold bg-white text-black hover:bg-white/90"
            onClick={() => signIn()}>
            Sign Up
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {insufficientBalance && activeQty > 0 && (
          <p className="text-xs text-red-400">
            Insufficient {availableLabel} balance
          </p>
        )}
        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        {renderSubmitResult()}
        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`w-full h-11 font-semibold text-white transition-colors disabled:opacity-50 ${
            isBuy
              ? "bg-emerald-400 hover:bg-[#1f8d83]"
              : "bg-red-400 hover:bg-[#d54646]"
          }`}>
          {submitting ? "Placing..." : `${isBuy ? "Buy" : "Sell"} ${baseAsset}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Buy / Sell Toggle */}
      <div className="grid grid-cols-2 rounded-lg bg-[#1a1a1a] p-1 border border-border/20">
        <button
          onClick={() => {
            setSide("buy");
            setSubmitResult(null);
            setSubmitError(null);
          }}
          className={`h-9 rounded-md text-sm font-semibold transition-colors focus:outline-none ${
            isBuy
              ? "bg-[#26a69a]/20 text-[#26a69a]"
              : "text-muted-foreground hover:text-white"
          }`}>
          Buy
        </button>

        <button
          onClick={() => {
            setSide("sell");
            setSubmitResult(null);
            setSubmitError(null);
          }}
          className={`h-9 rounded-md text-sm font-semibold transition-colors focus:outline-none ${
            !isBuy
              ? "bg-[#ef5350]/20 text-[#ef5350]"
              : "text-muted-foreground hover:text-white"
          }`}>
          Sell
        </button>
      </div>

      {/* Order Type */}
      <Tabs
        value={type}
        onValueChange={(v) => {
          setType(v as "limit" | "market");
          setSubmitResult(null);
          setSubmitError(null);
        }}>
        <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a] border border-border/20">
          <TabsTrigger
            value="limit"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white text-muted-foreground">
            Limit
          </TabsTrigger>
          <TabsTrigger
            value="market"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white text-muted-foreground">
            Market
          </TabsTrigger>
        </TabsList>

        {/* LIMIT ORDER CONTENT */}
        <TabsContent value="limit" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <div className="relative">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice}
                className="pr-12 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-border tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                {quoteAsset}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quantity</Label>
            <div className="relative">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="pr-12 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-border tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                {baseAsset}
              </span>
            </div>
            {renderAvailableRow()}
          </div>

          {/* Total Calculation */}
          <div className="rounded-lg bg-[#1a1a1a] border border-border/20 p-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">
                {totalValue} {quoteAsset}
              </span>
            </div>
          </div>

          {renderActionButton()}
        </TabsContent>

        {/* MARKET ORDER CONTENT */}
        <TabsContent value="market" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quantity</Label>
            <div className="relative">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="pr-12 bg-transparent border-border/40 focus-visible:ring-1 focus-visible:ring-border tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                {baseAsset}
              </span>
            </div>
            {renderAvailableRow()}
          </div>

          {/* Estimated Total Calculation for Market Order */}
          <div className="rounded-lg bg-[#1a1a1a] border border-border/20 p-3 text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Est. Price ({MARKET_ORDER_SLIPPAGE_PCT}% slippage)
              </span>
              <span className="font-medium tabular-nums">
                {marketExecutionPrice.toFixed(2)} {quoteAsset}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Est. Total</span>
              <span className="font-medium tabular-nums">
                ~{totalValue} {quoteAsset}
              </span>
            </div>
          </div>

          {renderActionButton()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
