// app/trade/[market]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { MarketBar } from "@/components/marketBar";
import { TVChart } from "@/components/tvChartCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function TradeDashboard() {
  const params = useParams();
  const market = params?.market;

  if (!market || typeof market !== "string") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground">
        Loading market data...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background p-2 gap-2 text-foreground overflow-hidden font-sans">
      {/* 1. Top Navigation Panel */}
      <div className="flex-none bg-card border border-border rounded-lg shadow-sm">
        <MarketBar market={market} />
      </div>

      {/* 2. Main Workspace - 3 Distinct Columns */}
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* COLUMN 1: Chart (Flex-1 allows it to fill space) */}
        <div className="flex flex-1 flex-col bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <TVChart market={market} />
        </div>

        {/* COLUMN 2: Orderbook (20% Width)           */}
        <div className="flex w-[20%] flex-col border-r border-border bg-background p-2">
          {/* We moved the border and rounded corners up to this wrapper div */}
          <div className="flex flex-1 flex-col border border-border rounded-md p-2 bg-card shadow-sm">
            <Tabs
              defaultValue="orderbook"
              className="w-full h-full flex flex-col">
              <TabsList className="w-full bg-muted grid grid-cols-2">
                <TabsTrigger value="orderbook" className="text-xs">
                  Orderbook
                </TabsTrigger>
                <TabsTrigger value="trades" className="text-xs">
                  Recent Trades
                </TabsTrigger>
              </TabsList>

              {/* Removed the border from TabsContent so it blends seamlessly */}
              <TabsContent
                value="orderbook"
                className="flex-1 mt-2 text-sm text-muted-foreground flex items-center justify-center">
                Orderbook Component
              </TabsContent>

              <TabsContent
                value="trades"
                className="flex-1 mt-2 text-sm text-muted-foreground flex items-center justify-center">
                Trades Component
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {/* COLUMN 3: Order Entry (Fixed Width ~320px) */}
        <div className="flex w-[320px] flex-col bg-card border border-border rounded-lg shadow-sm p-3">
          <div className="flex bg-muted p-1 rounded-md mb-4">
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-sm">
              Buy
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground hover:text-foreground h-8 text-sm">
              Sell
            </Button>
          </div>

          <Tabs defaultValue="limit" className="w-full">
            <TabsList className="w-full bg-transparent justify-start gap-4 p-0 mb-4 h-auto">
              <TabsTrigger
                value="limit"
                className="text-xs p-0 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground">
                Limit
              </TabsTrigger>
              <TabsTrigger
                value="market"
                className="text-xs p-0 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground">
                Market
              </TabsTrigger>
              <TabsTrigger
                value="conditional"
                className="text-xs p-0 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground">
                Conditional
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="limit"
              className="flex flex-col gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Balance</span>
                  <span>-</span>
                </div>
                <div className="bg-background border border-border rounded p-2 text-right">
                  0.00
                </div>
              </div>
              <Button className="w-full font-semibold">Sign up to trade</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
