"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getWallet, type Wallet } from "@/lib/utils/getWallet";
import { getOpenOrders, cancelOrder } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/button";

type OpenOrder = {
  orderId: string;
  side: "buy" | "sell";
  price: number | string;
  quantity: number | string;
};

const fmt = (v: number | string | undefined, dp = 4) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      })
    : "0.0000";
};

const TABS = [
  { key: "balances", label: "Balances" },
  { key: "orders", label: "Open Orders" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function BottomPannel({ market }: { market: string }) {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("balances");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    try {
      const [walletData, ordersData] = await Promise.all([
        getWallet(),
        getOpenOrders(userId, market),
      ]);
      setWallet(walletData);
      setOpenOrders(ordersData ?? []);
    } catch (err) {
      console.error("Dashboard refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [session, market]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [status, fetchData]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId, market);
      await fetchData();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <section className="flex h-full flex-col rounded-xl bg-[#0e0e0e]">
      {/* Tab row — flat, no border/card, matches Backpack style */}
      <div className="flex items-center gap-1 px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#1f1f1f] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
            {tab.key === "orders" && openOrders.length > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({openOrders.length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-3">
        {status !== "authenticated" ? (
          <LoggedOutState />
        ) : activeTab === "balances" ? (
          <BalancesTab wallet={wallet} loading={loading} />
        ) : (
          <OrdersTab
            orders={openOrders}
            loading={loading}
            cancellingId={cancellingId}
            onCancel={handleCancel}
          />
        )}
      </div>
    </section>
  );
}

function LoggedOutState() {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      Please{" "}
      <a href="/login" className="mx-1 text-blue-400 hover:underline">
        log in
      </a>{" "}
      or{" "}
      <a href="/signup" className="mx-1 text-blue-400 hover:underline">
        sign up
      </a>{" "}
      first
    </div>
  );
}

function BalancesTab({
  wallet,
  loading,
}: {
  wallet: Wallet | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-[#1a1a1a]" />
        ))}
      </div>
    );
  }

  const holdings = Object.entries(wallet?.holdings ?? {});
  const hasAnything = (wallet?.balance ?? 0) > 0 || holdings.length > 0;

  if (!hasAnything) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No balances yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-lg bg-[#1a1a1a] p-3">
        <div className="text-xs text-muted-foreground">Balance (Quote)</div>
        <div className="text-lg">{fmt(wallet?.balance, 2)}</div>
      </div>
      {holdings.map(([asset, qty]) => (
        <div key={asset} className="rounded-lg bg-[#1a1a1a] p-3">
          <div className="text-xs text-muted-foreground">{asset}</div>
          <div className="text-lg">{fmt(qty)}</div>
        </div>
      ))}
    </div>
  );
}

function OrdersTab({
  orders,
  loading,
  cancellingId,
  onCancel,
}: {
  orders: OpenOrder[];
  loading: boolean;
  cancellingId: string | null;
  onCancel: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 pt-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-full animate-pulse rounded bg-[#1a1a1a]"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No open orders
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border/20 text-xs text-muted-foreground">
          <th className="py-2 text-left">Side</th>
          <th className="py-2 text-left">Price</th>
          <th className="py-2 text-left">Quantity</th>
          <th className="py-2 text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.orderId} className="border-b border-border/10">
            <td
              className={`py-2.5 font-semibold ${
                order.side === "buy" ? "text-emerald-500" : "text-red-500"
              }`}>
              {order.side.toUpperCase()}
            </td>
            <td className="py-2.5 ">{fmt(order.price)}</td>
            <td className="py-2.5">{fmt(order.quantity)}</td>
            <td className="py-2.5 text-right">
              <Button
                size="sm"
                disabled={cancellingId === order.orderId}
                onClick={() => onCancel(order.orderId)}
                className="h-7 bg-red-500/15 text-xs font-medium text-red-500 border border-red-500/30 hover:bg-red-500/25 hover:text-red-300 disabled:opacity-50">
                {cancellingId === order.orderId ? "Cancelling…" : "Cancel"}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
