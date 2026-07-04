import { Router } from "express";
import { prisma } from "@exchange-lab/db";

export const klineRouter = Router();

const CONFIG: Record<string, { table: string; ms: number }> = {
  "1m": { table: "klines_1m", ms: 60_000 },
  "1h": { table: "klines_1h", ms: 3_600_000 },
  "1d": { table: "klines_1d", ms: 86_400_000 },
  "1w": { table: "klines_1w", ms: 604_800_000 },
};

klineRouter.get("/", async (req, res) => {
  try {
    const { symbol, interval, startTime, endTime } = req.query;

    const config = CONFIG[interval as string];

    if (!symbol || typeof symbol !== "string" || !config) {
      return res.status(400).json({
        error: "Valid symbol and interval required",
      });
    }

    const endMs = endTime ? Number(endTime) : Date.now();
    const startMs = startTime ? Number(startTime) : endMs - config.ms * 1000;

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
      return res.status(400).json({
        error: "Invalid time range parameters",
      });
    }

    // IMPORTANT: compute epoch seconds in SQL via EXTRACT(EPOCH ...).
    // Never let the pg driver hand back a `timestamp without time zone`
    // as a JS Date — it interprets it in the server's LOCAL timezone,
    // not UTC, which silently shifts/duplicates bucket times.
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        EXTRACT(EPOCH FROM bucket) AS time_sec,
        open, high, low, close, volume
      FROM ${config.table}
      WHERE market = $1
        AND bucket >= to_timestamp($2 / 1000.0)
        AND bucket <= to_timestamp($3 / 1000.0)
      ORDER BY bucket ASC
      LIMIT 1000
      `,
      symbol,
      startMs,
      endMs,
    );

    // Dedupe defensively (in case of overlapping refetches) and
    // guarantee strictly ascending unique seconds for the chart lib.
    const seen = new Set<number>();
    const klines = rows
      .map((row) => ({
        time: Math.floor(Number(row.time_sec)), // whole unix seconds
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .filter((k) => {
        if (Number.isNaN(k.time) || seen.has(k.time)) return false;
        seen.add(k.time);
        return true;
      })
      .sort((a, b) => a.time - b.time);

    return res.json(klines);
  } catch (error) {
    console.error("Kline API Error:", error);

    return res.status(500).json({
      error: "Failed to fetch market data",
    });
  }
});
