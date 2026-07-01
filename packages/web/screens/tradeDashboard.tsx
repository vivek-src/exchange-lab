"use client";

import { useParams } from "next/navigation";
import { MarketBar } from "@/components/marketBar";

export default function TradeDashboard() {
  const params = useParams();
  const market = params?.market;

  // 1. Safe type checking and loading state
  if (!market || typeof market !== "string") {
    // Return a placeholder of the exact same height as MarketBar (60px)
    // to prevent layout shift while the URL parameters load
    return (
      <div className="h-[60px] w-full border-b border-slate-800 bg-slate-900 animate-pulse" />
    );
  }

  // 2. No more 'as string' needed! TypeScript knows it's a string now.
  return <MarketBar market={market} />;
}
