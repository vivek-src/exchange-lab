import { useEffect, useRef, useState } from "react";
import { ChartManager, Candle } from "@/lib/utils/chartManager";
import { getKlines } from "@/lib/utils/apiClient";
import { Button } from "@/components/ui/button";
import { MarketDataManager } from "@/lib/utils/MarketDataManager";

const INTERVALS = ["1m", "1h", "1d", "1w"] as const;
type Interval = (typeof INTERVALS)[number];

const LOOKBACK_MS: Record<Interval, number> = {
  "1m": 1000 * 60 * 60 * 24 * 3, // 3 days
  "1h": 1000 * 60 * 60 * 24 * 21, // 7 days
  "1d": 1000 * 60 * 60 * 24 * 90, // 90 days
  "1w": 1000 * 60 * 60 * 24 * 365, // 1 year
};

// Must match the backend CONFIG map's `ms` values exactly — used by the
// WS handler to know when a trade rolls over into a new candle bucket.
const INTERVAL_MS: Record<Interval, number> = {
  "1m": 60_000,
  "1h": 3_600_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "wss://localhost:8080/ws";

export function TVChart({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const lastCandleRef = useRef<Candle | null>(null);

  const [interval, setInterval] = useState<Interval>("1m");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // STEP 1: LOAD HISTORICAL DATA (REST API)
  // ==========================================
  useEffect(() => {
    let ignore = false;

    const initChart = async () => {
      if (!chartRef.current) return;
      setLoading(true);

      try {
        const now = Date.now();
        const rawData = await getKlines(
          market,
          interval,
          now - LOOKBACK_MS[interval],
          now,
        );
        if (ignore) return;

        // API returns `time` as unix seconds. Dedupe + sort defensively;
        // lightweight-charts requires strictly ascending, unique
        // timestamps or it silently refuses to render.
        const seen = new Set<number>();
        const formattedData: Candle[] = rawData
          .map((x: any) => ({
            timestamp: Number(x.time) * 1000,
            open: parseFloat(x.open),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            close: parseFloat(x.close),
            volume: parseFloat(x.volume ?? "0"),
          }))
          .filter((x) => {
            if (isNaN(x.timestamp) || seen.has(x.timestamp)) return false;
            seen.add(x.timestamp);
            return true;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        if (ignore) return;

        chartManagerRef.current?.destroy();
        chartManagerRef.current = new ChartManager(
          chartRef.current,
          formattedData,
          {
            background: "transparent",
            textColor: "#8f949e",
          },
        );

        lastCandleRef.current =
          formattedData.length > 0
            ? formattedData[formattedData.length - 1]
            : null;
      } catch (e) {
        if (!ignore) console.error("Failed to load historical klines", e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    initChart();

    return () => {
      ignore = true;
      chartManagerRef.current?.destroy();
      chartManagerRef.current = null;
    };
  }, [market, interval]);

  // STEP 2: STREAM REAL-TIME DATA (WEBSOCKET)

  useEffect(() => {
    const manager = MarketDataManager.getInstance();
    const callbackId = `CHART-${market}-${interval}`;

    manager.registerCallback("trade", callbackId, (message: any) => {
      // Check if the chart is ready INSIDE the callback
      if (!chartManagerRef.current) {
        console.log("WS message received, but chart not ready yet.");
        return;
      }

      // 1. Extract the inner payload if it's wrapped
      const payload = message.data ? message.data : message;

      // 2. Access properties from the unwrapped payload
      const tradePrice = Number(payload.p ?? payload.lastPrice);
      const tradeVolume = Number(payload.q ?? 0);
      const tradeTime = Number(payload.T ?? Date.now());

      if (Number.isNaN(tradePrice)) {
        console.warn("Invalid trade price received:", payload);
        return;
      }

      const intervalMs = INTERVAL_MS[interval];

      if (!lastCandleRef.current) {
        const bucketStart = Math.floor(tradeTime / intervalMs) * intervalMs;

        const seeded: Candle = {
          timestamp: bucketStart,
          open: tradePrice,
          high: tradePrice,
          low: tradePrice,
          close: tradePrice,
          volume: tradeVolume,
        };

        lastCandleRef.current = seeded;
        chartManagerRef.current.update(seeded);
        return;
      }

      const current = lastCandleRef.current;
      let candle: Candle;

      if (tradeTime < current.timestamp + intervalMs) {
        candle = {
          ...current,
          close: tradePrice,
          high: Math.max(current.high, tradePrice),
          low: Math.min(current.low, tradePrice),
          volume: current.volume + tradeVolume,
        };
      } else {
        const bucketStart = Math.floor(tradeTime / intervalMs) * intervalMs;

        candle = {
          timestamp: bucketStart,
          open: tradePrice,
          high: tradePrice,
          low: tradePrice,
          close: tradePrice,
          volume: tradeVolume,
        };
      }

      lastCandleRef.current = candle;
      chartManagerRef.current.update(candle);
    });

    manager.sendMessage({
      method: "SUBSCRIBE",
      params: [`trade@${market}`],
    });

    return () => {
      manager.deRegisterCallback("trade", callbackId);
      manager.sendMessage({
        method: "UNSUBSCRIBE",
        params: [`trade@${market}`],
      });
    };
  }, [market, interval]);

  return (
    <div className="flex flex-col h-full w-full bg-card rounded-lg overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          {INTERVALS.map((iv) => (
            <Button
              key={iv}
              variant="ghost"
              size="sm"
              onClick={() => setInterval(iv)}
              className={`h-7 px-2 text-xs ${
                iv === interval
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {iv.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <div
          ref={chartRef}
          className="absolute inset-0"
          style={{ opacity: loading ? 0.4 : 1, transition: "opacity 0.2s" }}
        />
      </div>
    </div>
  );
}
