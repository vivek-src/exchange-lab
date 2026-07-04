import { useEffect, useRef, useState } from "react";
import { ChartManager } from "@/lib/utils/chartManager";
import { getKlines } from "@/lib/utils/apiClient";
import { KLine } from "@exchange-lab/shared";

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
  const [interval, setInterval] = useState<Interval>("1m");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. The 'ignore' flag prevents race conditions and updates to unmounted components
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

        // 2. If the effect cleaned up (user changed interval or unmounted), stop execution.
        if (ignore) return;

        const formatted = klineData
          .map((x) => ({
            close: parseFloat(x.close),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            open: parseFloat(x.open),
            // Convert the string to a strict Number (milliseconds)
            timestamp: Number(x.end),
          }))
          // Sort directly by the numeric timestamps
          .sort((a, b) => a.timestamp - b.timestamp);

        // 3. Destroy the old chart directly before mounting the new one
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }

        chartManagerRef.current = new ChartManager(
          chartRef.current,
          formatted,
          {
            background: "#0e0f14",
            textColor: "white",
          },
        );
      } catch (e) {
        if (!ignore) {
          console.error("Failed to load klines", e);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadChart();

    return () => {
      // 4. Mark this specific effect run as invalid for subsequent async resolutions
      ignore = true;

      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
        chartManagerRef.current = null;
      }
    };
  }, [market, interval]); // 5. Clean dependency array

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            disabled={iv === interval}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #333",
              background: iv === interval ? "#2a2d3a" : "transparent",
              color: iv === interval ? "white" : "#888",
              cursor: iv === interval ? "default" : "pointer",
              fontSize: 13,
            }}>
            {iv}
          </button>
        ))}
      </div>

      <div
        ref={chartRef}
        style={{
          height: "520px",
          width: "100%",
          marginTop: 4,
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.2s ease-in-out", // Added a slight transition for better UX
        }}
      />
    </div>
  );
}
