import { useEffect, useRef, useState } from "react";
import { ChartManager } from "@/lib/utils/chartManager";
import { getKlines } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/button";

const INTERVALS = ["1m", "1h", "1d", "1w"] as const;
type Interval = (typeof INTERVALS)[number];

const LOOKBACK_MS: Record<Interval, number> = {
  "1m": 1000 * 60 * 60 * 24,
  "1h": 1000 * 60 * 60 * 24 * 7,
  "1d": 1000 * 60 * 60 * 24 * 90,
  "1w": 1000 * 60 * 60 * 24 * 365,
};

export function TVChart({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const [interval, setInterval] = useState<Interval>("1d"); // Defaulting to 1d to match the "3D" vibe in your image
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadChart = async () => {
      if (!chartRef.current) return;
      setLoading(true);

      try {
        const now = Date.now();
        const klineData = await getKlines(
          market,
          interval,
          now - LOOKBACK_MS[interval],
          now,
        );

        if (ignore) return;

        const formatted = klineData
          .map((x) => ({
            open: parseFloat(x.open),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            close: parseFloat(x.close),
            volume: parseFloat(x.volume || x.v || "0"),
            timestamp: Number(x.end),
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }

        // Note: Lightweight Charts canvas still requires hex codes for internal rendering
        chartManagerRef.current = new ChartManager(
          chartRef.current,
          formatted,
          {
            background: "transparent", // Lets the wrapper bg-card show through
            textColor: "#8f949e",
          },
        );
      } catch (e) {
        if (!ignore) console.error("Failed to load klines", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadChart();

    return () => {
      ignore = true;
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, [market, interval]);

  return (
    <div className="flex flex-col h-full w-full bg-card rounded-lg overflow-hidden">
      {/* 1. View Selection Header */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-border text-sm font-medium">
        <span className="text-foreground border-b-2 border-primary pb-3 -mb-3 cursor-pointer">
          Chart
        </span>
        <span className="text-muted-foreground hover:text-foreground cursor-pointer">
          Depth
        </span>
        <span className="text-muted-foreground hover:text-foreground cursor-pointer">
          Margin
        </span>
        <span className="text-muted-foreground hover:text-foreground cursor-pointer">
          Market Info
        </span>
      </div>

      {/* 2. Chart Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        {/* Left side: Timeframes & Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 border-r border-border pr-2">
            {INTERVALS.map((iv) => (
              <Button
                key={iv}
                variant="ghost"
                size="sm"
                onClick={() => setInterval(iv)}
                disabled={iv === interval}
                className={`h-7 px-2 text-xs ${
                  iv === interval
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {iv.toUpperCase()}
              </Button>
            ))}
          </div>
          {/* <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground">
            Indicators
          </Button> */}
        </div>

        {/* Right side: Tools (Reset, Settings, etc) */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground">
            Reset
          </Button>
        </div>
      </div>

      {/* 3. Main Chart Canvas Wrapper - THIS IS THE FIX */}
      <div className="flex-1 w-full relative min-h-0">
        <div
          ref={chartRef}
          className="absolute inset-0" // Locks the canvas to the boundaries of the parent
          style={{
            opacity: loading ? 0.4 : 1,
            transition: "opacity 0.2s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}
