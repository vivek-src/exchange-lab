"use client";

import { useParams } from "next/navigation";
import { ReactNode, useState } from "react";

import { MarketBar } from "@/components/tradeui/marketBar";
import { TVChart } from "@/components/tradeui/tvChartCard";
import { OrderBook } from "@/components/tradeui/orderBook";
import { OrderEntry } from "@/components/tradeui/orderEntry";

export default function TradePage() {
  const params = useParams();
  const market = params?.market;

  // Custom state to track the active view
  const [activeView, setActiveView] = useState<"book" | "trades">("book");

  if (!market || typeof market !== "string") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
        Loading market...
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col gap-2 bg-[#0a0a0a] p-2 lg:gap-3 lg:p-3">
      {/* Top Market Info */}
      <header className="relative z-10 h-14 shrink-0 rounded-xl border border-border/40 bg-[#121212] px-2">
        <MarketBar market={market} />
      </header>

      {/* Unified Layout */}
      <main className="flex flex-col lg:flex-row flex-1 gap-2 lg:gap-3 overflow-y-auto lg:min-h-0 lg:overflow-hidden">
        {/* Chart */}
        <Panel className="relative flex-1 min-h-[45vh] lg:min-h-0 lg:min-w-0 overflow-hidden order-1">
          <div className="relative flex-1 min-h-0 min-w-0">
            <TVChart market={market} />
          </div>
        </Panel>

        {/* Custom Tabbed Panel for Order Book & Trades */}
        <Panel className="w-full lg:w-[320px] h-[400px] lg:h-auto shrink-0 overflow-hidden order-3 lg:order-2">
          <div className="flex h-12 w-full shrink-0 items-center justify-start gap-6 border-b border-border/40 px-4">
            <button
              onClick={() => setActiveView("book")}
              className={`relative flex h-full items-center text-sm font-medium transition-colors focus:outline-none ${
                activeView === "book"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              Order Book
              {activeView === "book" && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-foreground" />
              )}
            </button>

            <button
              onClick={() => setActiveView("trades")}
              className={`relative flex h-full items-center text-sm font-medium transition-colors focus:outline-none ${
                activeView === "trades"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              Trades
              {activeView === "trades" && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-foreground" />
              )}
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-transparent">
            {activeView === "book" ? (
              <OrderBook market={market} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                Recent Trades Component
              </div>
            )}
          </div>
        </Panel>

        {/* Order Entry */}
        <Panel className="w-full lg:w-[320px] shrink-0 overflow-y-auto p-4 order-2 lg:order-3">
          <OrderEntry market={market} />
        </Panel>
      </main>
    </div>
  );
}
const Panel = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={`flex flex-col rounded-xl border border-border/40 bg-[#121212] ${className}`}>
    {children}
  </section>
);
