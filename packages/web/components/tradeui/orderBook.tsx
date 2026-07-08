"use client";

interface OrderBookProps {
  market: string;
}

export function OrderBook({ market }: OrderBookProps) {
  return (
    <div className="flex h-full flex-col text-xs font-mono">
      {/* Header */}
      <div className="grid grid-cols-3 border-b border-white/10 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Waiting for order book...
        </div>
      </div>

      {/* Spread */}
      <div className="border-y border-white/10 px-4 py-2 text-center">
        <div className="text-lg font-semibold text-white">₹0.00</div>
        <div className="text-[10px] text-muted-foreground">Spread: 0.00%</div>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Waiting for bids...
        </div>
      </div>
    </div>
  );
}
