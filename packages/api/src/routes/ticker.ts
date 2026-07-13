import { Router } from "express";
import { prisma } from "@exchange-lab/db";

export const tickersRouter = Router();

// Define the shape of what Postgres will return
interface RawTickerResult {
  symbol: string;
  first_price: number | string;
  last_price: number | string;
  high: number | string;
  low: number | string;
  volume: number | string;
  price_change: number | string;
  price_change_percent: number | string;
}

tickersRouter.get("/", async (req, res) => {
  try {
    const market = req.query.market as string | undefined;

    const result = market
      ? await prisma.$queryRaw<RawTickerResult[]>`
          SELECT DISTINCT ON (market)
              market AS symbol,
              open AS first_price,
              close AS last_price,
              high,
              low,
              volume,
              (close - open) AS price_change,
              CASE
                  WHEN open > 0 THEN ((close - open) / open) * 100
                  ELSE 0
              END AS price_change_percent
          FROM "klines_1d"
          WHERE market = ${market}
          ORDER BY market, bucket DESC;
        `
      : await prisma.$queryRaw<RawTickerResult[]>`
          SELECT DISTINCT ON (market)
              market AS symbol,
              open AS first_price,
              close AS last_price,
              high,
              low,
              volume,
              (close - open) AS price_change,
              CASE
                  WHEN open > 0 THEN ((close - open) / open) * 100
                  ELSE 0
              END AS price_change_percent
          FROM "klines_1d"
          ORDER BY market, bucket DESC;
        `;

    const tickers = result.map((row) => ({
      symbol: row.symbol,
      firstPrice: row.first_price.toString(),
      lastPrice: row.last_price.toString(),
      high: row.high.toString(),
      low: row.low.toString(),
      volume: row.volume.toString(),
      priceChange: row.price_change.toString(),
      priceChangePercent: Number(row.price_change_percent).toFixed(2),
    }));

    res.json(tickers);
  } catch (error) {
    console.error("Error fetching tickers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
