// app/trade/[market]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { MarketBar } from "@/components/marketBar";

export default function TradeDashboard() {
  const params = useParams();
  const market = params?.market;

  // This stops the page from rendering (and initializing WebSockets) until the URL is ready
  if (!market || typeof market !== "string") {
    return <div>Loading...</div>;
  }

  return <MarketBar market={market} />;
}
