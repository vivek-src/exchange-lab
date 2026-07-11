"use client";

import { useParams } from "next/navigation";
import { ReactNode, useState } from "react";

import { MarketBar } from "@/components/tradeui/marketBar";
import { TVChart } from "@/components/tradeui/tvChartCard";
import { OrderBook } from "@/components/tradeui/orderBook";
import { TradesList } from "@/components/tradeui/trades";
import { OrderEntry } from "@/components/tradeui/orderEntry";
import { BottomPannel } from "@/components/tradeui/bottomPannel";

export default function TradePage() {
  const params = useParams();
  const market = params?.market;

  const [activeView, setActiveView] = useState<"book" | "trades">("book");

  if (!market || typeof market !== "string") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
        Loading market...
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col gap-2 bg-[#0a0a0a] p-2 lg:gap-2 lg:p-2">
      {/* Top Market Info */}
      <header className="relative z-10 h-14 shrink-0 rounded-xl border border-border/40 bg-[#121212] px-2">
        <MarketBar market={market} />
      </header>

      {/* Mobile: single scrolling stack, ordered by importance. Desktop: CSS grid. */}
      <main
        className="
          flex flex-1 flex-col gap-2 overflow-y-auto
          lg:grid lg:min-h-0 lg:gap-2 lg:overflow-hidden
          lg:grid-cols-[minmax(0,1fr)_300px_300px]
          lg:grid-rows-[1fr_260px]
        ">
        {/* Chart */}
        <Panel
          className="
            relative order-1 h-[50vh] shrink-0 overflow-hidden
            lg:order-none lg:col-start-1 lg:row-start-1 lg:h-auto lg:min-h-0 lg:min-w-0
          ">
          <div className="relative flex-1 min-h-0 min-w-0">
            <TVChart market={market} />
          </div>
        </Panel>

        {/* Order Entry — comes right after the chart on mobile, so placing a trade never needs a long scroll */}
        <Panel
          className="
            order-2 w-full shrink-0 overflow-y-auto p-4
            lg:order-none lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:h-full
          ">
          <OrderEntry market={market} />
        </Panel>

        {/* Order Book / Trades */}
        <Panel
          className="
            order-3 h-[360px] w-full shrink-0 overflow-hidden
            lg:order-none lg:col-start-2 lg:row-start-1 lg:h-full lg:w-full
          ">
          <div className="flex h-11 w-full shrink-0 items-center justify-start gap-6 border-b border-border/40 px-4">
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

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-transparent">
            {activeView === "book" ? (
              <OrderBook market={market} />
            ) : (
              <TradesList market={market} />
            )}
          </div>
        </Panel>

        {/* Positions / Orders / Assets — last in the stack, fixed height with internal scroll */}
        <Panel
          className="
            order-4 h-[280px] w-full shrink-0 overflow-y-auto
            lg:order-none lg:col-start-1 lg:col-span-2 lg:row-start-2 lg:h-full lg:min-h-0
          ">
          <BottomPannel market={market} />
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
